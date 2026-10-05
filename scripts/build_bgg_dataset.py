"""Manual BGG API2 batch collection: accepted IDs -> sourced static JSON/CSV.

No API calls in plan/cache mode, no cover downloads, no runtime sync.
Reuse the existing XML parser/client; this entrypoint queries exact IDs, not search.
"""
from __future__ import annotations
import argparse
import csv
import hashlib
import json
import os
import xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import parse_qs, urlsplit
from bgg_import import API, XMLClient, identifier, normalize_name, parse_things, read_json, write_json


def read_rows(path):
    path = Path(path)
    if path.suffix.lower() == '.csv':
        rows = list(csv.DictReader(path.open(encoding='utf-8-sig', newline='')))
    else:
        value = read_json(path)
        rows = value if isinstance(value, list) else value['records']
    out = []
    seen = set()
    for row in rows:
        gid = row.get('game_id') or row.get('id')
        if not gid or gid in seen:
            raise ValueError('Missing or duplicate local game_id')
        seen.add(gid)
        bid = identifier(row['bgg_id']) if row.get('bgg_id') else None
        aliases = row.get('aliases') or []
        if isinstance(aliases, str):
            aliases = [v.strip() for v in aliases.split('|') if v.strip()]
        name = row.get('name') or ''
        if not name.strip():
            raise ValueError('Expected game name is required')
        out.append({'game_id': gid, 'name': name, 'bgg_id': bid, 'aliases': aliases})
    return out


def batch_plan(rows, size=20):
    if not 1 <= size <= 20:
        raise ValueError('BGG supports at most 20 thing IDs per request')
    ids = list(dict.fromkeys(r['bgg_id'] for r in rows if r['bgg_id']))
    return [{'ids': ids[n:n + size], 'url': API + 'thing?id=' + ','.join(ids[n:n + size]) + '&stats=1'}
            for n in range(0, len(ids), size)]


def read_cached(cache):
    """Only real API2 snapshots with matching URL/hash/date are accepted."""
    records = {}
    issues = []
    for file in sorted(Path(cache).glob('*.xml')):
        try:
            meta = read_json(file.with_suffix('.json'))
            payload = file.read_bytes()
            url = urlsplit(meta['url'])
            ids = set(parse_qs(url.query).get('id', [''])[0].split(','))
            if (url.scheme != 'https' or url.hostname != 'boardgamegeek.com' or
                    url.path != '/xmlapi2/thing' or meta.get('synthetic') or
                    hashlib.sha256(payload).hexdigest() != meta['sha256'] or not meta.get('fetched_at')):
                raise ValueError('Invalid real source manifest')
            items = parse_things(payload, meta['fetched_at'])
            if any(item['bgg_id'] not in ids for item in items):
                raise ValueError('Returned ID is not in the documented request')
            for item in items:
                item['source_sha256'] = meta['sha256']
                old = records.get(item['bgg_id'])
                if old is None or old['fetched_at'] < item['fetched_at']:
                    records[item['bgg_id']] = item
        except (KeyError, ValueError, OSError, ET.ParseError) as error:
            issues.append({'source_file': file.name, 'reason': str(error)})
    return records, issues


def build_rows(rows, returned):
    output, exceptions = [], []
    for row in rows:
        bid = row['bgg_id']
        item = returned.get(bid)
        if not bid or item is None:
            exceptions.append({**row, 'reason': 'missing-bgg-id' if not bid else 'no-cached-api-response'})
            continue
        expected = {normalize_name(n) for n in [row['name'], *row['aliases']]}
        actual = {normalize_name(n['name']) for n in item['names']}
        if not expected.intersection(actual):
            exceptions.append({**row, 'reason': 'name-conflict', 'returned_names': item['names']})
            continue
        if item['type'] != 'boardgame' or item.get('synthetic'):
            exceptions.append({**row, 'reason': 'unsupported-type-or-synthetic-source'})
            continue
        image = item['image']
        chosen = image['url'] or image['thumbnail_url']
        output.append({**row, 'bgg_external': item, 'name_check': 'matched-expected-name-or-explicit-alias',
                       'image_url': chosen, 'thumbnail_url': image['thumbnail_url'],
                       'image_source_url': item['source_url'] if chosen else None,
                       'image_kind': 'bgg-api-image' if image['url'] else 'bgg-api-thumbnail' if chosen else None,
                       'publisher_fallback_needed': chosen is None,
                       'learning_analysis_status': 'independent-rules-review-required'})
    return output, exceptions


def export_csv(path, rows):
    fields = ['game_id', 'name', 'bgg_id', 'year', 'designers', 'publishers', 'min_players',
              'max_players', 'min_minutes', 'max_minutes', 'minimum_age', 'weight', 'mechanics',
              'categories', 'rank', 'rating', 'votes', 'description', 'image_url', 'thumbnail_url',
              'image_source_url', 'fetched_at', 'source_sha256', 'name_check']
    with Path(path).open('w', encoding='utf-8-sig', newline='') as file:
        writer = csv.DictWriter(file, fieldnames=fields)
        writer.writeheader()
        for row in rows:
            ext = row['bgg_external']
            players, duration, stats = ext['player_range'], ext['listed_play_duration_minutes'], ext['statistics']
            flat = {key: row.get(key) for key in fields}
            flat.update({key: ext.get(key) for key in ['year', 'minimum_age', 'weight', 'description', 'fetched_at', 'source_sha256']})
            for key in ['designers', 'publishers', 'categories']:
                flat[key] = ' | '.join(x['name'] for x in ext[key])
            flat.update(mechanics=' | '.join(x['name'] for x in ext['mechanisms']),
                        min_players=players['min'], max_players=players['max'],
                        min_minutes=duration['min'], max_minutes=duration['max'],
                        rank=stats['overall_rank'], rating=stats['average_rating'], votes=stats['vote_count'])
            # Descriptions are research source text; website authors concise sourced paraphrases.
            writer.writerow({k: ("'" + str(v) if isinstance(v, str) and v[:1] in '=+@' else v) for k, v in flat.items()})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', required=True, type=Path)
    parser.add_argument('--out', required=True, type=Path)
    parser.add_argument('--cache', type=Path, default=Path('.bgg-cache'))
    parser.add_argument('--batch-size', type=int, default=20)
    parser.add_argument('--plan', action='store_true', help='Write request plan only; no network')
    parser.add_argument('--live', action='store_true')
    parser.add_argument('--approved-application', action='store_true')
    args = parser.parse_args()
    rows = read_rows(args.input)
    batches = batch_plan(rows, args.batch_size)
    args.out.mkdir(parents=True, exist_ok=True)
    write_json(args.out / 'request-plan.json', {'rows': len(rows), 'unique_bgg_ids': sum(len(b['ids']) for b in batches),
               'batches': batches, 'source_input_sha256': hashlib.sha256(args.input.read_bytes()).hexdigest(),
               'network_calls': 0, 'manual_build_only': True})
    if args.plan:
        print(json.dumps({'rows': len(rows), 'batches': len(batches), 'network_calls': 0}))
        return
    returned, issues = read_cached(args.cache)
    if args.live:
        client = XMLClient(args.cache, os.environ.get('BGG_API_TOKEN'), approved=args.approved_application,
                           ttl_seconds=315360000, request_interval=5)
        for batch in batches:
            missing = [bid for bid in batch['ids'] if bid not in returned]
            if not missing:
                continue
            try:
                payload, fetched, _ = client.request('thing', {'id': ','.join(missing), 'stats': '1'})
                for item in parse_things(payload, fetched):
                    if item['bgg_id'] not in missing:
                        raise ValueError('Unexpected returned BGG ID')
                    item['source_sha256'] = hashlib.sha256(payload).hexdigest()
                    returned[item['bgg_id']] = item
            except (RuntimeError, ValueError) as error:
                issues.append({'ids': missing, 'reason': str(error)})
                if 'HTTP 401' in str(error) or 'HTTP 403' in str(error):
                    break
    records, exceptions = build_rows(rows, returned)
    write_json(args.out / 'bgg-dataset.json', {'schema_version': 1, 'source': 'BGG XML API2 exact-ID snapshots',
               'boundary': 'External metadata; no learning claims or display-rights conclusion', 'records': records})
    write_json(args.out / 'exceptions.json', {'records': exceptions, 'source_issues': issues})
    export_csv(args.out / 'bgg-dataset.csv', records)
    print(json.dumps({'rows': len(rows), 'accepted_metadata': len(records), 'exceptions': len(exceptions),
                      'image_urls': sum(bool(r['image_url']) for r in records), 'publisher_searches': 0}))


if __name__ == '__main__':
    main()
