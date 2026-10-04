import fs from 'node:fs';
import {validSite} from '../auth-service/lib/validation.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const a=read('src/data/atlas.json');validSite(read('src/data/site.json'));
const rows=a.catalogue.records??a.catalogue.games;
if(rows.length!==249||new Set(rows.map(r=>r.game_id??r.id)).size!==249)throw Error('249 unique active canonical games are required');
const supplement=a.supplement?.records??[];if(supplement.length!==33||new Set([...rows,...supplement].map(r=>r.game_id??r.id)).size!==282)throw Error('SDJ33 must append without replacing active canonical249');
if(rows.some(r=>r.game_id==='matter-matters'))throw Error('Owner-excluded game present');
for(const r of [...rows,...supplement]){if(r.bgg_reference?.identity_conflict===true){if(r.bgg_reference.bgg_id||r.bgg_reference.game_url)throw Error('Conflicted BGG join leaked');continue;}if(!Number.isInteger(r.bgg_reference?.bgg_id)||!/^https:\/\/boardgamegeek.com\/boardgame\/\d+/.test(r.bgg_reference.game_url))throw Error('Missing static BGG reference');}
if(a.wh.cards.length!==50||new Set(a.wh.cards.map(r=>r.id)).size!==50)throw Error('50 unique Wizard Hat cards are required');
if(a.skills.length!==12||a.activities?.skills.length!==12)throw Error('12 skills and activity definitions are required');
if(!a.bridges?.games?.length||!a.bridges?.bridges?.length)throw Error('Reviewed skill bridges are missing');
const forbidden=/[A-Z]:\\\\Users|gh[opusr]_[A-Za-z0-9]{20}|GITHUB_CLIENT_SECRET|access_token/;
if(forbidden.test(fs.readFileSync('src/data/atlas.json','utf8')))throw Error('Private path or secret-like data in public knowledge export');
for(const c of a.wh.cards){if(!fs.existsSync(`public/${c.front_asset??c.asset}`))throw Error(`Missing artwork for card ${c.id}`);}
console.log(`Validated ${rows.length}+${supplement.length} games / ${a.wh.cards.length} cards / ${a.activities.skills.length} activities / ${a.bridges.bridges.length} evidence bridges`);
