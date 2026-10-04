import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const full=JSON.parse(fs.readFileSync('src/data/atlas.json','utf8'));
const lean=JSON.parse(fs.readFileSync('src/data/public-atlas.json','utf8'));
const ids=['kingdomino-2017','pictures-2020','mysterium-kids-2023','dragomino-2021','magic-keys-2024','stone-age-junior-2016','spinderella-2015','funkelschatz-2018','icecool-2017'];
test('public rule deduplication reconstructs every full bridge source without losing skill-specific rules',()=>{
 for(const b of full.bridges.bridges){
  const p=lean.bridges.bridges.find(p=>p.bridge_id===b.bridge_id);
  const g=lean.bridges.games.find(g=>g.game_id===b.game_id);
  assert.deepEqual(p.rule_evidence??g.rule_evidence,b.rule_evidence);
 }
});
for(const [label,a] of [['full',full],['public',lean]]){
 test(`${label}: SDJ reviews preserve source edition, player scopes and unknown outcomes`,()=>{
  for(const id of ids){
   const g=a.bridges.games.find(g=>g.game_id===id);
   assert.equal(g.rule_evidence.review_basis,'primary-rules-read');
   assert.match(g.rule_evidence.document_sha256,/^[0-9a-f]{64}$/);
   assert.equal(g.skills.length,12);
   for(const b of a.bridges.bridges.filter(b=>b.game_id===id)){
    assert.ok(b.applicable_player_counts.every(n=>g.applicable_player_counts.includes(n)));
    if(label==='full'){
     const f=a.flows.flows.find(f=>f.bridge_id===b.bridge_id);
     assert.equal(f.learning_development_status,'not established');
     assert.equal(f.observation_status,'not observed');
    }
    assert.notEqual(b.rule_evidence.summary_th,b.rule_evidence.game_overview_th);
   }
  }
 });
 test(`${label}: Mysterium Kids participation requires a group answer; star score is not a mission-success ending`,()=>{
  const b=a.bridges.bridges.find(b=>b.game_id==='mysterium-kids-2023'&&b.skill_id==='participation');
  assert.equal(b.status,'conditional');assert.deepEqual(b.applicable_player_counts,[3,4,5]);
  const g=a.bridges.games.find(g=>g.game_id===b.game_id);
  assert.ok(g.wizard_hat.some(w=>w.card_no===16));assert.ok(g.wizard_hat.some(w=>w.card_no===9));
  assert.ok(!g.wizard_hat.some(w=>w.card_no===12));
 });
 test(`${label}: publisher duration stays distinct from award duration and missing ICECOOL time stays unknown`,()=>{
  const g=id=>a.supplement.records.find(g=>g.game_id===id);
  assert.equal(g('kingdomino-2017').publisher_play_duration_minutes.max,15);
  assert.equal(g('kingdomino-2017').organizer_listed_play_duration_minutes.max,30);
  assert.equal(g('mysterium-kids-2023').publisher_play_duration_minutes.max,21);
  assert.equal(g('icecool-2017').publisher_play_duration_minutes,null);
  assert.equal(a.bridges.games.find(g=>g.game_id==='icecool-2017').timing.publisher_play_max,null);
 });
 test(`${label}: same-family editions and automatic skill shortcuts are excluded`,()=>{
  const g=id=>a.bridges.games.find(g=>g.game_id===id);
  assert.match(g('stone-age-junior-2016').edition_scope,/not the separate card game/);
  assert.equal(g('stone-age-junior-2016').skills.find(s=>s.skill_id==='negotiation').status,'unknown');
  assert.equal(g('spinderella-2015').skills.find(s=>s.skill_id==='cooperation').status,'unknown');
  assert.match(g('icecool-2017').rule_evidence.summary_th,/สองครั้ง/);
  assert.match(g('icecool-2017').edition_scope,/Capital Area District Libraries/);
  assert.match(g('funkelschatz-2018').edition_scope,/2024/);
  assert.ok(g('dragomino-2021').wizard_hat.some(w=>w.card_no===8));
  assert.ok(!g('dragomino-2021').wizard_hat.some(w=>w.card_no===5));
 });
}
