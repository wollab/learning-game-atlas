"""BGG import preparation. Offline fixtures are synthetic and never production data."""
from __future__ import annotations
import argparse
import copy
import hashlib
import json
import math
import os
import re
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

API = "https://boardgamegeek.com/xmlapi2/"
MAX_XML_BYTES = 5_000_000


def read_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8-sig"))


def write_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def normalize_name(value):
    value = unicodedata.normalize("NFKC", str(value)).casefold()
    return " ".join(re.sub(r"[^\w]+", " ", value).split())


def number(value, integer=False, minimum=0, maximum=None):
    try:
        n = float(value)
    except (ValueError, TypeError):
        return None
    if not math.isfinite(n) or n < minimum or (maximum is not None and n > maximum):
        return None
    if integer and not n.is_integer():
        return None
    return int(n) if integer else n


def identifier(value):
    text = str(value)
    if not re.fullmatch(r"[1-9][0-9]*", text):
        raise ValueError("Invalid BGG ID")
    return text


def xml_root(payload):
    if len(payload) > MAX_XML_BYTES or b"<!DOCTYPE" in payload.upper() or b"<!ENTITY" in payload.upper():
        raise ValueError("Unsupported XML payload")
    root = ET.fromstring(payload)
    if root.tag != "items":
        raise ValueError("Expected API items response, not an error/login page")
    return root


def xml_value(node, name):
    element = node.find(name)
    return element.get("value") if element is not None else None


def parse_search(payload):
    result = []
    for item in xml_root(payload).findall("item"):
        result.append({"bgg_id": identifier(item.get("id")), "type": item.get("type"),
                       "names": [n.get("value") for n in item.findall("name") if n.get("value")],
                       "year": number(xml_value(item, "yearpublished"), integer=True, minimum=1)})
    return result


def safe_image_url(value):
    if not value:
        return None
    if value.startswith("//"):
        value = "https:" + value
    parsed = urllib.parse.urlsplit(value)
    if parsed.scheme != "https" or parsed.hostname != "cf.geekdo-images.com" or parsed.username or parsed.password:
        return None
    return value


def parse_things(payload, fetched_at, synthetic=False):
    records = []
    for item in xml_root(payload).findall("item"):
        bgg_id = identifier(item.get("id"))
        stats = item.find("./statistics/ratings")
        def stat(name, **kwargs):
            return number(xml_value(stats, name), **kwargs) if stats is not None else None
        rank = item.find("./statistics/ratings/ranks/rank[@type='subtype'][@name='boardgame']")
        links = lambda kind: [{"id": l.get("id"), "name": l.get("value")} for l in item.findall("link") if l.get("type") == kind]
        records.append({
            "bgg_id": bgg_id, "type": item.get("type"),
            "names": [{"name": n.get("value"), "type": n.get("type")} for n in item.findall("name") if n.get("value")],
            "year": number(xml_value(item, "yearpublished"), integer=True, minimum=1),
            "description": item.findtext("description"),
            "minimum_age": number(xml_value(item, "minage"), integer=True),
            "weight": stat("averageweight", maximum=5),
            "player_range": {"min": number(xml_value(item, "minplayers"), integer=True, minimum=1), "max": number(xml_value(item, "maxplayers"), integer=True, minimum=1)},
            "listed_play_duration_minutes": {"min": number(xml_value(item, "minplaytime"), integer=True), "max": number(xml_value(item, "maxplaytime"), integer=True), "source_scope": "BGG listing; not publisher-confirmed or observed teach/setup/play/scoring time"},
            "designers": links("boardgamedesigner"), "publishers": links("boardgamepublisher"),
            "categories": links("boardgamecategory"), "mechanisms": links("boardgamemechanic"),
            "statistics": {"overall_rank": number(rank.get("value") if rank is not None else None, integer=True, minimum=1), "average_rating": stat("average", maximum=10), "vote_count": stat("usersrated", integer=True)},
            "image": {"url": safe_image_url(item.findtext("image")), "thumbnail_url": safe_image_url(item.findtext("thumbnail")), "image_source_url": f"https://boardgamegeek.com/boardgame/{bgg_id}", "display_allowed": False, "rights_status": "await-approved-licence-scope", "edition_match_verified": False, "role": "representative-image"},
            "source_url": f"https://boardgamegeek.com/boardgame/{bgg_id}",
            "fetched_at": fetched_at, "source_as_of": None,
            "field_provenance": {field: {"source_url": f"{API}thing?id={bgg_id}&stats=1", "locator": f"items/item[@id={bgg_id}]/{locator}", "source_layer": "synthetic-offline-fixture" if synthetic else "BGG XML API2"} for field, locator in {"names":"name", "year":"yearpublished", "description":"description", "minimum_age":"minage", "weight":"statistics/ratings/averageweight", "player_range":"minplayers,maxplayers", "listed_play_duration_minutes":"minplaytime,maxplaytime", "statistics":"statistics/ratings", "categories":"link[@type=boardgamecategory]", "mechanisms":"link[@type=boardgamemechanic]", "designers":"link[@type=boardgamedesigner]", "publishers":"link[@type=boardgamepublisher]", "image":"image,thumbnail"}.items()},
            "synthetic": synthetic, "provenance": "synthetic-offline-fixture" if synthetic else "BGG XML API2",
        })
    return records


def match_candidates(game, candidates, reviewed=None):
    # Search name equality alone is insufficient: expansions can appear as boardgame.
    names = {normalize_name(n) for n in [game["name"], *game.get("aliases", [])] if n}
    unique = {c["bgg_id"]: c for c in candidates}
    candidates = list(unique.values())
    reviewed = reviewed or {}
    if reviewed.get("game_identity_verified") is True:
        bgg_id = identifier(reviewed["bgg_id"])
        if any(c["bgg_id"] == bgg_id for c in candidates):
            return {"status": "reviewed-identity", "bgg_id": bgg_id, "edition_match_verified": reviewed.get("edition_match_verified") is True}
        return {"status": "reviewed-id-missing-from-response", "bgg_id": None}
    exact = [c for c in candidates if names.intersection(normalize_name(n) for n in c["names"])]
    return {"status": "no-match" if not candidates else "ambiguous" if len(exact) > 1 else "exact-name-needs-review" if len(exact) == 1 else "candidate-needs-review", "bgg_id": None, "candidates": candidates}


def merge_external(game, external):
    if external.get("synthetic"):
        raise ValueError("Synthetic API fixtures cannot enrich catalogue records")
    result = copy.deepcopy(game)
    # Keep imported metadata in a distinct namespace; no publisher/WH/skills override.
    result["bgg_external"] = copy.deepcopy(external)
    return result


class XMLClient:
    def __init__(self, cache_dir, token, approved=False, ttl_seconds=86400, request_interval=5, attempts=3):
        if not approved or not token:
            raise ValueError("Live API requires an approved application and local environment token")
        self.cache_dir = Path(cache_dir)
        self.token, self.ttl, self.interval, self.attempts = token, ttl_seconds, request_interval, attempts
        self.last_request = 0

    def request(self, endpoint, params):
        if endpoint not in {"search", "thing"}:
            raise ValueError("Unsupported endpoint")
        url = API + endpoint + "?" + urllib.parse.urlencode(sorted(params.items()))
        key = hashlib.sha256(url.encode()).hexdigest()
        xml_path, meta_path = self.cache_dir / (key + ".xml"), self.cache_dir / (key + ".json")
        if xml_path.exists() and meta_path.exists():
            try:
                meta, payload = read_json(meta_path), xml_path.read_bytes()
                fresh = 0 <= time.time() - datetime.fromisoformat(meta["fetched_at"]).timestamp() < self.ttl
                valid = meta["url"] == url and meta["sha256"] == hashlib.sha256(payload).hexdigest()
                if fresh and valid:
                    xml_root(payload)
                    return payload, meta["fetched_at"], True
            except (ValueError, KeyError, OSError, TypeError, ET.ParseError):
                pass
        for attempt in range(self.attempts):
            time.sleep(max(0, self.interval - (time.monotonic() - self.last_request)))
            self.last_request = time.monotonic()
            request = urllib.request.Request(url, headers={"Authorization": "Bearer " + self.token, "User-Agent": "WoL-Learning-Game-Atlas/1.0"})
            try:
                with urllib.request.urlopen(request, timeout=30) as response:
                    if response.status == 202:
                        time.sleep(2 ** attempt)
                        continue
                    payload = response.read(MAX_XML_BYTES + 1)
                xml_root(payload)
                fetched = datetime.now(timezone.utc).isoformat()
                self.cache_dir.mkdir(parents=True, exist_ok=True)
                xml_path.write_bytes(payload)
                write_json(meta_path, {"url": url, "fetched_at": fetched, "sha256": hashlib.sha256(payload).hexdigest()})
                return payload, fetched, False
            except urllib.error.HTTPError as error:
                if error.code not in {429, 500, 502, 503, 504} or attempt + 1 == self.attempts:
                    raise RuntimeError(f"BGG HTTP {error.code}; request stopped") from None
                retry_header = error.headers.get("Retry-After")
                retry = number(retry_header)
                if retry is None and retry_header:
                    try:
                        retry = max(0, parsedate_to_datetime(retry_header).timestamp() - time.time())
                    except (ValueError, TypeError, OverflowError):
                        raise RuntimeError("Unrecognized BGG retry delay; resume import later") from None
                # Never violate a long server delay by silently capping it.
                if retry and retry > 60:
                    raise RuntimeError("BGG requests a longer delay; resume import later") from None
                time.sleep(max(retry or 0, 2 ** attempt))
            except urllib.error.URLError:
                if attempt + 1 == self.attempts:
                    raise RuntimeError("BGG network request failed; request stopped") from None
                time.sleep(2 ** attempt)
        raise RuntimeError("BGG response still pending; resume import later")


def run_offline(pilot, fixture_dir):
    fixture_dir = Path(fixture_dir)
    records = parse_things((fixture_dir / "thing.xml").read_bytes(), "2026-10-04T00:00:00+07:00", synthetic=True)
    cases = []
    for game in pilot["records"]:
        fixture = game["offline_case"]
        candidates = parse_search((fixture_dir / f"search-{fixture}.xml").read_bytes())
        # Fixture names describe parser cases, not actual matches for these games.
        simulated_game = {"name": "Example Game", "aliases": []}
        cases.append({"game_id": game["game_id"], "planned_queries": game["search_queries"], "fixture_case": fixture,
                      "synthetic_result": match_candidates(simulated_game, candidates), "live_status": "not-requested"})
    return {"mode": "offline-synthetic", "live_api_verified": False, "field_coverage_verified": False,
            "cases": cases, "parser_examples": records,
            "exceptions": [{"game_id": r["game_id"], "reason": "await-approved-live-pilot"} for r in cases]}


def run_live(pilot, client, reviewed_map, batch_size=1):
    if not 1 <= batch_size <= 20:
        raise ValueError("API2 thing batch must contain 1-20 IDs")
    identities = {r["game_id"]: r for r in reviewed_map.get("records", [])}
    records, cases = [], []
    for game in pilot["records"]:
        reviewed = identities.get(game["game_id"], {})
        if reviewed.get("game_identity_verified") is True:
            match = {"status": "reviewed-identity", "bgg_id": identifier(reviewed["bgg_id"])}
        else:
            candidates = []
            try:
                for query in game["search_queries"]:
                    payload, _, _ = client.request("search", {"query": query, "type": "boardgame", "exact": "1"})
                    candidates.extend(parse_search(payload))
                match = match_candidates(game, candidates)
            except (RuntimeError, ValueError, ET.ParseError):
                match = {"status": "request-or-schema-error", "bgg_id": None}
        cases.append({"game_id": game["game_id"], **match})
    accepted = [c for c in cases if c.get("bgg_id")]
    for offset in range(0, len(accepted), batch_size):
        batch = accepted[offset:offset + batch_size]
        try:
            payload, fetched, _ = client.request("thing", {"id": ",".join(c["bgg_id"] for c in batch), "stats": "1"})
            parsed = {r["bgg_id"]: r for r in parse_things(payload, fetched)}
        except (RuntimeError, ValueError, ET.ParseError):
            for case in batch:
                case["status"] = "request-or-schema-error"
            continue
        for case in batch:
            record = parsed.get(case["bgg_id"])
            if record is None or record["type"] != "boardgame":
                case["status"] = "missing-or-wrong-item-type"
            else:
                record["game_id"] = case["game_id"]
                records.append(record)
    return {"mode": "live-import-review", "live_api_verified": bool(records), "cases": cases, "records": records,
            "exceptions": [c for c in cases if c["status"] != "reviewed-identity"],
            "note": "No automatic catalogue overwrite or image display approval"}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pilot", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--fixtures", default="tests/fixtures/bgg")
    parser.add_argument("--live", action="store_true")
    parser.add_argument("--approved-application", action="store_true")
    parser.add_argument("--reviewed-map")
    parser.add_argument("--cache", default=".bgg-cache")
    parser.add_argument("--batch-size", type=int, default=1)
    args = parser.parse_args()
    if not 1 <= args.batch_size <= 20:
        parser.error("batch-size must be between 1 and 20 (documented API maximum)")
    pilot = read_json(args.pilot)
    if args.live:
        client = XMLClient(args.cache, os.environ.get("BGG_APPLICATION_TOKEN", ""), args.approved_application)
        report = run_live(pilot, client, read_json(args.reviewed_map) if args.reviewed_map else {}, args.batch_size)
    else:
        report = run_offline(pilot, args.fixtures)
    write_json(args.out, report)
    print(f"{report['mode']}: {len(report['cases'])} cases, {len(report['exceptions'])} exceptions; no catalogue overwrite")


if __name__ == "__main__":
    main()
