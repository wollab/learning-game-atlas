import importlib.util
import json
import sys
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch
import urllib.error

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts' / 'bgg_import.py'
spec = importlib.util.spec_from_file_location('bgg_import', SCRIPT)
bgg = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bgg)
FIXTURES = Path(__file__).parent / 'fixtures' / 'bgg'


class ImportTests(unittest.TestCase):
    def test_documented_batch_limit_rejects_before_network(self):
        for size in [0, -1, 21]:
            with self.assertRaises(ValueError):
                bgg.run_live({'records': []}, None, {}, batch_size=size)
        self.assertEqual(bgg.run_live({'records': []}, None, {}, batch_size=20)['records'], [])

    def test_missing_unranked_and_nonfinite_values_stay_unknown(self):
        rows = bgg.parse_things((FIXTURES/'thing.xml').read_bytes(), '2026-10-04T00:00:00+07:00', True)
        self.assertEqual(rows[0]['statistics']['overall_rank'], 17)
        self.assertEqual(rows[1]['statistics'], {'overall_rank': None, 'average_rating': None, 'vote_count': 0})
        self.assertIsNone(rows[0]['source_as_of'])
        self.assertFalse(rows[0]['image']['display_allowed'])
        self.assertIn('not publisher-confirmed', rows[0]['listed_play_duration_minutes']['source_scope'])
        self.assertIsNone(bgg.number('1.3', integer=True))

    def test_exact_name_requires_review_and_duplicates_are_deduplicated(self):
        candidates = bgg.parse_search((FIXTURES/'search-unique.xml').read_bytes())
        result = bgg.match_candidates({'name': 'EXAMPLE GAME', 'aliases': []}, candidates+candidates)
        self.assertEqual(result['status'], 'exact-name-needs-review')
        self.assertIsNone(result['bgg_id'])
        self.assertEqual(len(result['candidates']), 1)

    def test_ambiguity_aliases_and_expansion_are_not_auto_accepted(self):
        candidates = bgg.parse_search((FIXTURES/'search-ambiguous.xml').read_bytes())
        self.assertEqual(bgg.match_candidates({'name': 'Thai title', 'aliases': ['Example Game']}, candidates)['status'], 'ambiguous')
        expansion = bgg.parse_search((FIXTURES/'search-expansion.xml').read_bytes())
        self.assertIsNone(bgg.match_candidates({'name': 'Example Game', 'aliases': []}, expansion)['bgg_id'])

    def test_reviewed_game_identity_does_not_require_edition(self):
        candidates = bgg.parse_search((FIXTURES/'search-unique.xml').read_bytes())
        reviewed = {'bgg_id': '999001', 'game_identity_verified': True, 'edition_match_verified': False}
        match = bgg.match_candidates({'name': 'Example Game'}, candidates, reviewed)
        self.assertEqual(match['bgg_id'], '999001')
        self.assertFalse(match['edition_match_verified'])
        self.assertEqual(bgg.match_candidates({'name': 'Example Game'}, [], reviewed)['status'], 'reviewed-id-missing-from-response')

    def test_synthetic_data_cannot_enrich_catalogue_and_curated_fields_are_preserved(self):
        game = {'publisher_play_duration_minutes': {'min': 15}, 'wizard_hat': ['real-card'], 'skills': ['real-skill']}
        with self.assertRaises(ValueError):
            bgg.merge_external(game, {'synthetic': True})
        enriched = bgg.merge_external(game, {'synthetic': False, 'listed_play_duration_minutes': {'min': 99}})
        self.assertEqual(enriched['publisher_play_duration_minutes'], game['publisher_play_duration_minutes'])
        self.assertEqual(enriched['wizard_hat'], game['wizard_hat'])
        self.assertEqual(enriched['skills'], game['skills'])
        self.assertNotIn('bgg_external', game)

    def test_xml_error_pages_dtd_and_unsafe_media_are_rejected(self):
        for xml in [b'<html>login</html>', b'<!DOCTYPE x><items/>']:
            with self.assertRaises(ValueError): bgg.xml_root(xml)
        for value in ['javascript:alert(1)', 'https://example.com/box.jpg', 'https://secret@cf.geekdo-images.com/a.jpg']:
            self.assertIsNone(bgg.safe_image_url(value))
        self.assertEqual(bgg.safe_image_url('//cf.geekdo-images.com/a.jpg'), 'https://cf.geekdo-images.com/a.jpg')

    def test_live_requires_approval_and_token(self):
        for approved, token in [(False, 'secret'), (True, '')]:
            with self.assertRaises(ValueError): bgg.XMLClient('.', token, approved)

    def test_cache_reuses_valid_snapshot_without_storing_token(self):
        payload = (FIXTURES/'thing.xml').read_bytes()
        class Response:
            status = 200
            def __enter__(self): return self
            def __exit__(self, *args): pass
            def read(self, limit): return payload
        with tempfile.TemporaryDirectory() as directory:
            client = bgg.XMLClient(directory, 'private-test-token', True, request_interval=0)
            with patch.object(bgg.urllib.request, 'urlopen', return_value=Response()) as request:
                first = client.request('thing', {'id': '999001', 'stats': '1'})
                second = client.request('thing', {'stats': '1', 'id': '999001'})
                self.assertEqual(request.call_count, 1)
                self.assertFalse(first[2]); self.assertTrue(second[2])
                for file in Path(directory).iterdir():
                    self.assertNotIn('private-test-token', file.read_text(encoding='utf-8'))

    def test_authentication_failures_stop_and_long_retry_delay_is_respected(self):
        with tempfile.TemporaryDirectory() as directory:
            client = bgg.XMLClient(directory, 'private-test-token', True, request_interval=0)
            for code, headers in [(401, {}), (429, {'Retry-After': '120'})]:
                error = urllib.error.HTTPError('https://boardgamegeek.com/xmlapi2/thing', code, '', headers, None)
                with patch.object(bgg.urllib.request, 'urlopen', side_effect=error) as request:
                    with self.assertRaises(RuntimeError) as caught: client.request('thing', {'id': '999001'})
                    self.assertNotIn('private-test-token', str(caught.exception))
                    self.assertEqual(request.call_count, 1)

    def test_pilot_is_explicitly_offline_and_all_ten_games_await_live_verification(self):
        pilot = bgg.read_json(Path(__file__).parent/'fixtures'/'bgg-pilot.json')
        report = bgg.run_offline(pilot, FIXTURES)
        self.assertEqual(len(report['cases']), 10)
        self.assertEqual(len(report['exceptions']), 10)
        self.assertFalse(report['live_api_verified'])
        self.assertFalse(report['field_coverage_verified'])


    def test_failed_live_search_produces_resumable_exception_not_fake_data(self):
        class FailedClient:
            def request(self, *args): raise RuntimeError('schema failed')
        pilot = {'records': [{'game_id':'example', 'name':'Example', 'aliases':[], 'search_queries':['Example']}]}
        report = bgg.run_live(pilot, FailedClient(), {})
        self.assertEqual(report['records'], [])
        self.assertEqual(report['exceptions'][0]['status'], 'request-or-schema-error')
        self.assertFalse(report['live_api_verified'])

    def test_field_provenance_is_api_based_and_fixture_is_labelled(self):
        row = bgg.parse_things((FIXTURES/'thing.xml').read_bytes(), '2026-10-04T00:00:00+07:00', True)[0]
        self.assertEqual(row['field_provenance']['statistics']['source_layer'], 'synthetic-offline-fixture')
        self.assertIn('statistics/ratings',row['field_provenance']['statistics']['locator'])


if __name__ == '__main__':
    unittest.main()
