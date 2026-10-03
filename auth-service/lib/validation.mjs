export const PAGE_KEYS=['catalogue','skills','wizard-hat','builder','methodology','sources','admin'];
export function validSite(s){
 if(!s||typeof s!=='object'||Array.isArray(s))throw Error('Site configuration must be an object');
 for(const c of ['primary','accent','background','ink'])if(!/^#[0-9a-f]{6}$/i.test(s.theme?.[c]??''))throw Error(`Invalid theme colour: ${c}`);
 for(const f of ['headingFont','bodyFont'])if(!['Kanit','Bai Jamjuree','system-ui'].includes(s.theme?.[f]))throw Error('Unsupported font');
 if(!Number.isInteger(s.theme.radius)||s.theme.radius<0||s.theme.radius>32)throw Error('Radius must be 0–32');
 if(!['cards','rows'].includes(s.theme.defaultView))throw Error('Invalid default view');
 for(const p of PAGE_KEYS){if(typeof s.pages?.[p]?.title!=='string'||s.pages[p].title.length>150||typeof s.pages[p].intro!=='string'||s.pages[p].intro.length>2000)throw Error(`Invalid page copy: ${p}`);}
 const order=s.builder?.stepOrder;if(!Array.isArray(order)||order.length!==4||new Set(order).size!==4||!['skills','activity','rules','review'].every(x=>order.includes(x))||order.indexOf('skills')>order.indexOf('activity')||order.at(-1)!=='review')throw Error('Skill → activity → rules → review dependency is required');
 if(!s.builder.defaults||!Number.isInteger(s.builder.defaults.players)||s.builder.defaults.players<1||s.builder.defaults.players>100||!Number.isFinite(s.builder.defaults.minutes)||s.builder.defaults.minutes<5||s.builder.defaults.minutes>600||!Number.isInteger(s.builder.defaults.cardCount)||s.builder.defaults.cardCount<1||s.builder.defaults.cardCount>10000||typeof s.builder.defaults.turns!=='string')throw Error('Invalid builder defaults');
 if(!Array.isArray(s.builder.playerOptions)||!s.builder.playerOptions.length||s.builder.playerOptions.some(x=>!Number.isInteger(x)||x<1||x>100))throw Error('Invalid player options');
 if(!['roles','customRules','debrief'].every(x=>typeof s.builder.optionalSections?.[x]==='boolean'))throw Error('Invalid optional sections');
 if(s.authEndpoint&&!/^https:\/\/[a-zA-Z0-9.-]+\.vercel\.app$/.test(s.authEndpoint))throw Error('Authentication endpoint must use HTTPS on Vercel');
 if(JSON.stringify(s).length>200000)throw Error('Site configuration is too large');
 return s;
}
export function validProposal(p){
 if(!['games','skills','wizard-hat','packages','sources'].includes(p?.collection))throw Error('Invalid knowledge collection');
 if(!/^[a-zA-Z0-9:_-]{1,150}$/.test(p.record_id??''))throw Error('Invalid record identifier');
 if(!/^[a-f0-9]{64}$/.test(p.base_dataset_revision??''))throw Error('Missing source dataset revision');
 if(p.base_record_revision!==null&&!/^[a-f0-9]{64}$/.test(p.base_record_revision??''))throw Error('Missing source record revision');
 if(!Array.isArray(p.sources)||p.sources.length<1||p.sources.some(s=>!/^https:\/\//.test(s.url??'')||!s.locator||!s.read_scope))throw Error('A source URL, locator and read scope are required');
 if(!p.changes||typeof p.changes!=='object'||Array.isArray(p.changes)||!Object.keys(p.changes).length)throw Error('No proposed changes');
 if(JSON.stringify(p).length>500000)throw Error('Proposal too large');
 if(['__proto__','constructor','prototype'].some(k=>Object.hasOwn(p.changes,k)))throw Error('Unsupported change key');
 return p;
}
