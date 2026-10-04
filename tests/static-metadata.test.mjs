
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {staticMetadataAdapter} from '../scripts/lib/static-metadata.mjs';
const source={id:'snapshot',url:'https://example.com/ranking.csv',snapshot_label:'2026-10-02'};
const row={game_id:'one',bgg_id:12,bgg_ranking_snapshot:{source_id:'snapshot',overall_rank:9,vote_count:null},bgg_metadata_snapshot:{source_id:'snapshot',player_range:{min:1,max:6}}};
const identity={game_id:'one',bgg_id:12,game_identity_verified:true,edition_match_verified:false};
const make=(r=row,i=identity,s=source)=>staticMetadataAdapter({games:[r],external_sources:[s]},{records:[i]});
test('dated community metadata preserves publisher facts, edition review and unknown capture time',()=>{
 const original={game_id:'one',players:[2],publisher_play_duration_minutes:{min:20,max:20},bgg:{edition_match_verified:true},transferable_skills:{skill_map:[{status:'C',applicable_player_counts:[4]}]}};
 const result=make().apply(original);
 assert.deepEqual(result.players,[2]);assert.deepEqual(result.bgg,original.bgg);
 assert.deepEqual(result.publisher_play_duration_minutes,original.publisher_play_duration_minutes);
 assert.deepEqual(result.transferable_skills,original.transferable_skills);
 assert.equal(result.bgg_ranking_snapshot.exact_capture_time,null);assert.equal(result.bgg_ranking_snapshot.vote_count,null);
 assert.equal(result.bgg_ranking_snapshot.snapshot_label,'2026-10-02');assert.equal(result.bgg_ranking_snapshot.claim_status,'third-party-snapshot');
 assert.deepEqual(result.bgg_metadata_snapshot.player_range,{min:1,max:6});
});
test('candidate identity and mismatched BGG IDs never adopt snapshot data',()=>{
 for(const i of [{...identity,game_identity_verified:false},{...identity,bgg_id:99}])
  assert.equal(make(row,i).apply({game_id:'one'}).bgg_ranking_snapshot,null);
 assert.equal(make().apply({game_id:'missing'}).bgg_metadata_snapshot,null);
 assert.equal(make({...row,bgg_ranking_snapshot:null,bgg_metadata_snapshot:null}).apply({game_id:'one'}).bgg_ranking_snapshot,null);
});
test('duplicate/missing corpus IDs and unsafe sources fail before export',()=>{
 assert.throws(()=>staticMetadataAdapter({games:[row,row]},{records:[]}),/duplicate/);
 assert.throws(()=>make().assertCoverage([{game_id:'other'}]),/IDs differ/);
 assert.throws(()=>make(row,identity,{...source,url:'http://example.com/ranking.csv'}).apply({game_id:'one'}),/unsafe/);
});
test('actual public export keeps learning scope and only matched snapshot metadata',()=>{
 const a=JSON.parse(fs.readFileSync('src/data/public-atlas.json','utf8'));
 const games=[...a.catalogue.records,...a.supplement.records];
 assert.equal(new Set(games.map(g=>g.game_id??g.id)).size,283);
 assert.equal(a.flows.game_count,a.bridges.games.length);assert.equal(a.bridges.bridges.length,a.flows.flows.length);assert.equal(a.flows.flow_count,a.bridges.bridges.length);
 assert.equal(games.filter(g=>g.bgg_ranking_snapshot).length,10);assert.equal(games.filter(g=>g.bgg_metadata_snapshot).length,8);
 assert.equal(games.find(g=>g.game_id==='star-realms').bgg_ranking_snapshot,null);
 assert.ok(games.filter(g=>g.external_cover?.display_allowed).every(g=>g.external_cover.source_url==='https://blog.amigo-spiele.de/presse/pressematerial/'));
});
