import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const a=JSON.parse(fs.readFileSync('src/data/atlas.json','utf8'));
test('readable flows preserve all reviewed bridge claims and player contexts',()=>{
  assert.equal(a.flows.game_count,52);assert.equal(a.flows.flow_count,143);
  assert.equal(new Set(a.flows.flows.map(f=>f.bridge_id)).size,143);
  for(const f of a.flows.flows){
    const b=a.bridges.bridges.find(b=>b.bridge_id===f.bridge_id);
    assert.equal(f.status,b.status);
    assert.deepEqual(f.applicable_player_counts,b.applicable_player_counts);
    assert.equal(f.conditions_th,b.conditions_th);
    assert.equal(f.player_action_th,b.required_action_th);
    assert.equal(f.observable_behaviour_th,b.observable_behaviour_th);
    assert.equal(f.rule_summary_th,b.rule_evidence.summary_th);
    assert.equal(f.observation_status,'not observed');
    assert.equal(f.learning_development_status,'not established');
    assert.equal(f.transfer_status,'not established');
    assert.ok([...f.core,...f.taste].every(w=>a.wh.cards.some(c=>c.no===w.card_no&&c.mechanism_name===w.mechanism_en)));
  }
});
test('Lunar cooperation flow retains four-player restriction and proposals are labelled',()=>{
  const f=a.flows.flows.find(f=>f.game_id==='lunar'&&f.skill_id==='cooperation');
  assert.deepEqual(f.applicable_player_counts,[4]);
  for(const f of a.flows.flows){assert.match(f.debrief_provenance,/WoL facilitation proposal/);assert.ok(f.debrief_question_th);}
});

test('new edition scopes and incomplete SCOUT evidence remain distinguishable',()=>{
 const find=(id,skill)=>a.bridges.bridges.find(b=>b.game_id===id&&b.skill_id===skill);
 assert.deepEqual(find('sky-team-2024','cooperation').applicable_player_counts,[2]);
 assert.deepEqual(find('the-crew-2020','communication').applicable_player_counts,[3,4,5]);
 assert.match(a.bridges.games.find(g=>g.game_id==='just-one-2019').edition_scope,/use two clues each/);
 assert.equal(find('scout','decision-making').recommendation_inputs.source_gap,true);
 assert.ok(!a.bridges.related_games_by_skill.some(s=>[...s.supported,...s.conditional].some(r=>r.game_id==='scout')));
 const all=[...a.catalogue.records,...a.supplement.records];
 assert.equal(all.find(g=>g.game_id==='jaipur').publisher_play_duration_minutes.max,30);
 assert.equal(all.find(g=>g.game_id==='just-one-2019').genres.includes('party'),true);
 assert.equal(all.find(g=>g.game_id==='the-crew-2020').publisher_play_duration_minutes,null);
 assert.equal(all.find(g=>g.game_id==='sky-team-2024').awards[0].year,2024);
});

import {inspectProposal} from '../src/lib/admin-local.mjs';
import crypto from 'node:crypto';
test('Admin recognizes reviewed SDJ records and rejects their stale revisions',async()=>{
 const game=a.supplement.records.find(g=>g.game_id==='sky-team-2024');
 const hash=async r=>crypto.createHash('sha256').update(JSON.stringify(r)).digest('hex');
 const proposal={collection:'games',record_id:game.game_id,base_dataset_revision:a.digest,base_record_revision:game.record_revision_sha256,changes:{name:game.name},sources:[{url:'https://www.scorpionmasque.com/en/sky-team',locator:'product',read_scope:'metadata only'}]};
 const result=await inspectProposal(proposal,a,hash);assert.equal(result.isNew,false);
 await assert.rejects(inspectProposal({...proposal,base_record_revision:'0'.repeat(64)},a,hash));
 const copy={...game};delete copy.record_revision_sha256;assert.equal(game.record_revision_sha256,await hash(copy));
});

test('new rule batch preserves base editions and keeps overview-only Star Realms out of recommendations',()=>{
 const game=id=>a.bridges.games.find(g=>g.game_id===id);
 for(const id of ['ten','for-sale','hanamikoji','arboretum']){assert.equal(game(id).rule_evidence.review_basis,'primary-rules-read');assert.match(game(id).rule_evidence.document_sha256,/^[0-9a-f]{64}$/);}
 assert.deepEqual(game('ten').applicable_player_counts,[2,3,4,5]);
 assert.deepEqual(game('for-sale').applicable_player_counts,[3,4,5]);
 assert.deepEqual(game('hanamikoji').applicable_player_counts,[2]);
 assert.equal(game('hanamikoji').skills.find(s=>s.skill_id==='negotiation').status,'unknown');
 assert.equal(game('arboretum').skills.find(s=>s.skill_id==='respect-for-diversity').status,'unknown');
 assert.equal(game('star-realms').rule_evidence.review_basis,'publisher-description-read');
 assert.ok(a.bridges.bridges.filter(b=>b.game_id==='star-realms').every(b=>b.recommendation_inputs.source_gap));
 assert.ok(!a.bridges.related_games_by_skill.some(s=>[...s.supported,...s.conditional].some(r=>r.game_id==='star-realms')));
});
