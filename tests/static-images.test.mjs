import test from 'node:test';import assert from 'node:assert/strict';
import {staticImageAdapter} from '../scripts/lib/static-images.mjs';
const game={game_id:'one',name:'One',players:[2,3]};
const identity={records:[{game_id:'one',bgg_id:1,game_identity_verified:true}]};
const candidate={bgg_id:1,game_identity_verified:true,display_allowed:true,thumbnail_url:'https://cdn.example.com/one.png',source_url:'https://example.com/one',usage_basis_url:'https://example.com/license',rights_status:'approved-source-use',attribution:'Publisher'};
const apply=c=>staticImageAdapter({records:[{game_id:'one',bgg_image_candidates:[c]}]},identity).apply(game);
test('approved cover preserves facts and its attribution',()=>{const result=apply(candidate);assert.deepEqual(result.players,game.players);assert.equal(result.external_cover.url,candidate.thumbnail_url);assert.equal(result.external_cover.attribution,'Publisher');});
test('candidate reachability and explicit flag alone do not enable images',()=>{for(const key of ['display_allowed','game_identity_verified','rights_status','usage_basis_url','attribution'])assert.equal(apply({...candidate,[key]:null,url_reachability:'reachable'}).external_cover,null);});
test('mismatched identity, unsafe URL and unverified exact printing are blocked',()=>{for(const c of [{...candidate,bgg_id:2},{...candidate,thumbnail_url:'javascript:alert(1)'},{...candidate,source_url:'http://example.com'},{...candidate,exact_printing_claimed:true,printing_match_verified:false}])assert.equal(apply(c).external_cover,null);});
test('real export enables only the canonical publisher approvals',async()=>{
 const fs=await import('node:fs');const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
 const full=read('../src/data/atlas.json'),lean=read('../src/data/public-atlas.json');
 const rows=d=>[...d.catalogue.records,...d.supplement.records];
 const covers=rows(lean).filter(g=>g.external_cover?.display_allowed);assert.equal(covers.length,37);
 for(const g of covers){assert.equal(new URL(g.external_cover.url).hostname,'blog.amigo-spiele.de');assert.equal(g.external_cover.usage_basis_url,'https://blog.amigo-spiele.de/presse/pressematerial/');assert.equal(g.external_cover.attribution,'© AMIGO');assert.deepEqual(g.external_cover,rows(full).find(r=>r.game_id===g.game_id).external_cover);}
 assert.equal(rows(lean).find(g=>g.game_id==='high-society').external_cover,null);
});
