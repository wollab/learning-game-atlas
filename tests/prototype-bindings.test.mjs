import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {validateDraft,exportPrototype,importPrototype,reviewPrototype} from '../src/lib/prototype.mjs';
const a=JSON.parse(fs.readFileSync('src/data/atlas.json','utf8'));
const refs={skills:a.skills,packages:a.packages,cards:a.wh.cards.map(c=>({...c,id:String(c.id),section:c.family,name:c.mechanism_name})),bridges:a.bridges.bridges};
const p=a.packages.find(p=>p.id==='roles');
const draft=()=>({title:p.name,packageId:p.id,skills:p.skills,players:4,minutes:20,context:'กลุ่มทดลอง',core:{Conflict:'2',Order:'5',Reward:'16',Ending:'9'},taste:['44'],locked:{},roles:'คนละข้อมูล',turns:'ผลัดตา',objective:'คะแนนร่วม',ending:'4 รอบ',cardCount:20,rules:p.rule_proposal,debrief:p.observation,analysisReview:true,bindings:structuredClone(p.learning_bindings)});
test('v3 carries causal bindings and exact rule sources without scores',()=>{const d=draft(),f=exportPrototype(d,refs);assert.equal(f.version,3);assert.ok(f.sources.length>0);assert.deepEqual(importPrototype(JSON.stringify(f),refs),d);assert.equal(reviewPrototype(d,refs).ready,true);assert.equal(f.scores,null)});
test('v2 remains readable and does not invent causal fields',()=>{const d=draft();delete d.bindings;const f={kind:'learning-game-prototype',version:2,draft:d,review_status:'needs-review',scores:null};assert.deepEqual(importPrototype(JSON.stringify(f),refs),d)});
test('mismatched, duplicate, empty or unknown sourced bindings are not treated as ready',()=>{const d=draft();assert.throws(()=>validateDraft({...d,bindings:[{...d.bindings[0],skill_id:'empathy'}]},refs));assert.throws(()=>validateDraft({...d,bindings:[d.bindings[0],d.bindings[0]]},refs));assert.throws(()=>validateDraft({...d,bindings:[{...d.bindings[0],source_bridge_ids:['invented']}]},refs));assert.equal(reviewPrototype({...d,bindings:[]},refs).ready,false);assert.equal(reviewPrototype({...d,bindings:d.bindings.map(b=>({...b,rule:''}))},refs).ready,false)});
test('8 hypotheses cover 12 skills with real CORE cards; empathy has no invented game evidence',()=>{assert.equal(a.packages.length,8);assert.equal(new Set(a.packages.flatMap(p=>p.skills)).size,12);for(const p of a.packages){assert.equal(new Set(p.cards.map(id=>refs.cards.find(c=>c.id===String(id))).filter(c=>c.section==='CORE').map(c=>c.category)).size,4);assert.equal(p.playtest.status,'not-run');for(const e of p.example_contexts)assert.ok(refs.bridges.some(b=>b.bridge_id===e.bridge_id&&b.status===e.status));}assert.equal(a.packages.find(p=>p.id==='perspective').example_contexts.length,0)});

import {restoreBridgeSources} from '../src/lib/prototype.mjs';
test('public deduplicated rule receipts survive a Builder export, and malformed bindings return errors',()=>{
 const raw=JSON.parse(fs.readFileSync(new URL('../src/data/public-atlas.json',import.meta.url),'utf8'));
 const restored=restoreBridgeSources(raw);assert.ok(restored.length);
 assert.ok(restored.every(b=>b.rule_evidence?.url));
 const invalid={bindings:[null]};assert.equal(reviewPrototype(invalid,{skills:[],cards:[],packages:[]}).ready,false);
});
