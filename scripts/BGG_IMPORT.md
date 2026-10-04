# BGG importer and reviewed learning flows

## Current verification boundary

The adapter has offline synthetic tests only. Actual API2 field coverage, batch limits, licence/image permission and authenticated responses must be checked after the application is approved. No catalogue metadata has been refreshed from BGG. The existing KB exporter remains legacy; use this pilot workflow for the new integration rather than invoking its refresh branch.

## Offline preparation

Run from production:

```powershell
python scripts/bgg_import.py --pilot tests/fixtures/bgg-pilot.json --out .bgg-cache/offline-pilot-report.json
python -m unittest discover -s tests -p test_bgg_import.py -v
```

`tests/fixtures/bgg-pilot.json` selects ten actual catalogue games, explains the live cases and references synthetic XML parser cases. Fixture IDs/images/ranks are fictional. The report marks all ten games as awaiting live verification. `merge_external` refuses synthetic fixtures.

## After approval

Set BGG_APPLICATION_TOKEN locally without writing it into files/chat. Confirm the licence scope. Review game identity in a separate map; edition verification is only necessary for edition-specific claims/images. The example map contains only the previously reviewed High Society identity. A name match alone is not accepted automatically, including expansion-like search results.

```powershell
python scripts/bgg_import.py --live --approved-application --pilot tests/fixtures/bgg-pilot.json --reviewed-map tests/fixtures/bgg-reviewed-map.example.json --out .bgg-cache/live-pilot-report.json
```

Review candidates and add confirmed IDs, then rerun; validated cache entries avoid duplicate requests. Raw XML and URL/hash/retrieval metadata remain in ignored `.bgg-cache`. No authorization headers/token are saved. `--batch-size` defaults to one; raise only after validating supported limits. Five-second spacing follows the API2 wiki suggestion; it is not a guaranteed service quota. Batches are bounded to 1-20 IDs as documented; default remains one pending a live pilot. Server Retry-After is respected; longer delays stop for later resumption. Failures appear in the exceptions report.

## Data ownership

Imported data is under `bgg_external`; curated publisher time, Wizard Hat and skills are preserved. `fetched_at` is retrieval time, `source_as_of` stays null unless supported by source data. BGG listed duration is not publisher-confirmed or observed total session time. Mechanics are BGG vocabulary, not automatic Wizard Hat identities. Image URLs are candidate representative images with `display_allowed=false` until approved scope is confirmed. The pilot generates reports, not a public catalogue replacement.

## Learning flow derivation

`build_learning_flows.py --shelf <canonical-Atlas-data-folder>` deterministically derives `reviewed-learning-flows.json` from the existing reviewed bridges and activities. Current canonical input contains 47 games, 129 bridges; the derivation preserves player conditions and unobserved/unestablished claim boundaries. The web import consumes a small presentation subset; full rule evidence stays in the original bridge source.

## Official documentation review - 2026-10-04

Chief supplied https://boardgamegeek.com/wiki/page/BGG_XML_API (legacy). Current adapter deliberately uses API2 search/thing, not the legacy response shape. Read current official API2 documentation via search-indexed official content because direct page reads return403: https://boardgamegeek.com/wiki/page/BGG_XML_API2.

API2 Thing Items: comma-separated IDs, maximum20; stats=1 for ratings/ranking; versions=1 for future printing/edition lookup. Current adapter does not parse version nodes; do not infer edition verification from the representative image. API2 historical=1/from/to are documented unsupported; historical ranking remains a dated CSV source. Unknown statistics capture time remains null.

Official CSV download https://boardgamegeek.com/data_dumps/bg_ranks is the preferred bulk name/ID/rank/average source according to the API2 wiki. It also requires approved application access per https://boardgamegeek.com/using_the_xml_api. Once access arrives, prefer it over third-party rank mirrors for new snapshots; inspect exact CSV schema before integrating. Do not assume it includes the mirror's thumbnail or vote fields.

Dataset pilot (separate from existing synthetic pilot): KB learning-game-atlas/data/bgg-dataset-pilot.json and bgg-reviewed-identity-map.json. Ten reviewed work identities, printing/image match false. Just One uses450619 for2025 rule analysis; award2019 attaches to original work254640. Keep original awards/supplement intact and resolve the split explicitly before web ranking/media adoption. Example command after approval:

python scripts/bgg_import.py --live --approved-application --pilot <KB-data>/bgg-dataset-pilot.json --reviewed-map <KB-data>/bgg-reviewed-identity-map.json --batch-size 10 --out .bgg-cache/dataset-pilot-report.json

This is a prepared command, not an executed authenticated request. Versions parsing, official CSV schema and real field coverage remain live-access gates.
