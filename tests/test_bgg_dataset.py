import hashlib,json,sys,tempfile,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from build_bgg_dataset import batch_plan,build_rows,read_cached
from bgg_import import parse_things

XML=b'''<items><item type="boardgame" id="552"><name type="primary" value="Bus"/><yearpublished value="1999"/><description>Build routes &amp; choose actions.</description><minplayers value="3"/><maxplayers value="5"/><minplaytime value="90"/><maxplaytime value="120"/><image>https://cf.geekdo-images.com/exact-source.jpg</image><thumbnail>https://cf.geekdo-images.com/exact-thumb.jpg</thumbnail><link type="boardgamemechanic" id="2082" value="Worker Placement"/></item></items>'''
ROW={'game_id':'bus','name':'Bus','bgg_id':'552','aliases':[]}

class DatasetTests(unittest.TestCase):
 def records(self,xml=XML):return {r['bgg_id']:r for r in parse_things(xml,'2026-10-05T00:00:00+00:00')}
 def test_exact_image_before_thumbnail_and_source_link(self):
  rows,errors=build_rows([ROW],self.records());self.assertFalse(errors)
  self.assertEqual(rows[0]['image_url'],'https://cf.geekdo-images.com/exact-source.jpg')
  self.assertEqual(rows[0]['image_source_url'],'https://boardgamegeek.com/boardgame/552')
  self.assertEqual(rows[0]['bgg_external']['description'],'Build routes & choose actions.')
 def test_name_conflict_quarantines_every_field(self):
  rows,errors=build_rows([{**ROW,'name':'Unrelated game'}],self.records());self.assertEqual(rows,[])
  self.assertEqual(errors[0]['reason'],'name-conflict')
 def test_explicit_alias_matches_bgg_name(self):
  rows,errors=build_rows([{**ROW,'name':'Bus: Complete Edition','aliases':['Bus']}],self.records())
  self.assertEqual(len(rows),1);self.assertFalse(errors)
 def test_no_image_does_not_derive_image_or_search_publisher(self):
  xml=XML.replace(b'<image>https://cf.geekdo-images.com/exact-source.jpg</image>',b'')
  rows,_=build_rows([ROW],self.records(xml));self.assertEqual(rows[0]['image_kind'],'bgg-api-thumbnail')
  self.assertEqual(rows[0]['image_url'],'https://cf.geekdo-images.com/exact-thumb.jpg')
  xml=xml.replace(b'<thumbnail>https://cf.geekdo-images.com/exact-thumb.jpg</thumbnail>',b'')
  rows,_=build_rows([ROW],self.records(xml));self.assertTrue(rows[0]['publisher_fallback_needed'])
  self.assertIsNone(rows[0]['image_url'])
 def test_deduplicated_ids_batch_maximum(self):
  rows=[{**ROW,'bgg_id':str(n)}for n in range(1,42)]+[ROW]
  batches=batch_plan(rows);self.assertEqual([len(b['ids'])for b in batches],[20,20,2])
  with self.assertRaises(ValueError):batch_plan(rows,21)
 def test_cache_hash_and_synthetic_rejected(self):
  with tempfile.TemporaryDirectory()as folder:
   p=Path(folder)/'source.xml';p.write_bytes(XML)
   meta={'url':'https://boardgamegeek.com/xmlapi2/thing?id=552&stats=1','sha256':hashlib.sha256(XML).hexdigest(),'fetched_at':'2026-10-05T00:00:00+00:00'}
   p.with_suffix('.json').write_text(json.dumps(meta));data,issues=read_cached(folder);self.assertIn('552',data);self.assertFalse(issues)
   meta['synthetic']=True;p.with_suffix('.json').write_text(json.dumps(meta));data,issues=read_cached(folder);self.assertFalse(data);self.assertEqual(len(issues),1)
 def test_unrequested_id_is_rejected(self):
  with tempfile.TemporaryDirectory()as folder:
   p=Path(folder)/'source.xml';p.write_bytes(XML)
   p.with_suffix('.json').write_text(json.dumps({'url':'https://boardgamegeek.com/xmlapi2/thing?id=13','sha256':hashlib.sha256(XML).hexdigest(),'fetched_at':'2026-10-05T00:00:00+00:00'}))
   data,issues=read_cached(folder);self.assertFalse(data);self.assertEqual(len(issues),1)
if __name__=='__main__':unittest.main()
