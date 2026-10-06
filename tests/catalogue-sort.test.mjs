import test from 'node:test';
import assert from 'node:assert/strict';
import {byBggRank} from '../src/lib/catalogue-sort.mjs';
test('BGG ranking order puts ranked games first and zero/missing/invalid last',()=>{
 const game=(name,rank)=>({name,rank_summary:{overall_rank:rank}});
 const input=[game('Unknown',null),game('Twenty',20),game('Zero',0),game('One',1),game('Invalid',-5),game('String rank','10')];
 assert.deepEqual(input.toSorted(byBggRank).map(g=>g.name),['One','String rank','Twenty','Invalid','Unknown','Zero']);
 assert.equal(input[0].name,'Unknown');
 assert.equal(byBggRank(game('A',undefined),game('B',NaN))<0,true);
 assert.equal(byBggRank(game('A',4),game('B',4))<0,true);
});
