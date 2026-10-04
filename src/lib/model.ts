import raw from '../data/public-atlas.json';
import siteData from '../data/site.json';
export type Row=Record<string,any>;
export const site:Row=siteData;
export const data:Row=raw;
export const skills:Row[]=raw.skills.map(s=>{const a=data.activities?.skills?.find((a:Row)=>a.skill_id===s.id);return {...s,activity:a,thai:a?.name_th??s.thai,name:a?.name_en??s.name};});
export const groups=['Learning','Employability','Personal Empowerment','Active Citizenship'];
export const groupNames=['การเรียนรู้','การทำงาน','การพัฒนาตนเอง','การเป็นพลเมือง'];
export const groupColors=['#4F76BB','#FF774D','#8FC055','#A75BA8'];
export const skillColors:Record<string,string>={'creativity':'#4F76BB','critical-thinking':'#7CA2DA','problem-solving':'#AAC1E8','cooperation':'#FF774D','negotiation':'#FFA06E','decision-making':'#FFC5A3','communication':'#8FC055','resilience':'#AAD174','self-management':'#C7E49A','respect-for-diversity':'#BE8CC7','empathy':'#D9A6DC','participation':'#A75BA8'};
export const cards:Row[]=(data.wh.cards||data.wh.records||[]).map((c:Row)=>({...c,id:String(c.id??c.no??c.number),name:c.mechanism_name??c.name??c.name_en??c.english,thai:c.thai_card_name??c.thai??c.name_th,category:c.category??c.group,section:c.family??c.section??c.deck??(['Conflict','Order','Reward','Ending'].includes(c.category)?'CORE':'TASTE'),asset:c.front_asset??c.asset,color:c.background_color?.hex??c.color,examples:c.game_examples??c.examples}));
export const packages:Row[]=data.packages;
const annotations=new Map(data.annotations.map((g:Row)=>[g.id,g]));
export const games:Row[]=[...(data.catalogue.games||data.catalogue.records||[]),...(data.supplement?.records??[])].map((g:Row)=>{
 const id=g.game_id??g.id, a:Row=g.atlas_annotation??annotations.get(id)??{}, review:Row=data.bridges?.games?.find((r:Row)=>r.game_id===id)??{}, design:Row=g.design_analysis??g;
 const mapped=(review.skills??g.transferable_skills?.skill_map??g.skills??[]).map((s:Row)=>{const stored=data.bridges?.bridges?.find((b:Row)=>b.game_id===id&&b.skill_id===s.skill_id),bridge=stored?{...stored,learning_flow:data.flows?.flows?.find((f:Row)=>f.bridge_id===stored.bridge_id),rule_evidence:stored.rule_evidence??review.rule_evidence}:null;return {...s,status:({supported:'R',conditional:'C',unknown:'U',proposal:'P',unsupported:'X'} as Row)[s.status]??s.status,reason:s.reason_th??s.reason,bridge,player_action:bridge?.required_action_th??s.player_action,observable:bridge?.observable_behaviour_th??s.observable,conditions:bridge?.conditions_th??s.conditions,counter_signal:bridge?.counter_signal_th??s.counter_signal,source_locators:bridge?.rule_evidence?[{...bridge.rule_evidence,title:bridge.rule_evidence.label_th}]:s.source_locators,applicable_player_counts:bridge?.applicable_player_counts??s.applicable_player_counts};});
 return {...g,...design,id,name:g.name??g.name_en,players:g.player_counts??g.players??[],play_min:g.publisher_play_duration_minutes?.min??g.official_play_min??g.play_min??null,play_max:g.publisher_play_duration_minutes?.max??g.official_play_max??g.play_max??null,skills:mapped,cards:review.wizard_hat?.map((w:Row)=>w.card_no)??g.wizard_hat_cards??(design.wizard_hat?[...(design.wizard_hat.core??[]),...(design.wizard_hat.taste??[])].filter((w:Row)=>cards.some(c=>c.id===String(w.id)&&c.name===w.name&&c.category===w.category)).map((w:Row)=>w.id):a.cards??[]),action:g.action??a.action??design.required_action??design.decision,rules_summary:review.rule_evidence?.summary_th??g.rules_summary??null,rule:g.rules_summary??a.rule??review.rule_evidence?.summary_en??null,medium:g.medium??null,format:g.format??[],genres:g.genres??[],sources:g.source_provenance??g.sources??[],review};
});
export const skillName=(id:string)=>{const s=skills.find(s=>s.id===id);return s?s.name:id};
export const cardName=(id:string|number)=>{const c=cards.find(c=>c.id===String(id));return c?c.name:''};
export function evidence(g:Row,id:string){return g.skills.find((s:Row)=>s.skill_id===id)??{skill_id:id,status:'U',reason:'ยังไม่มีข้อมูลเพียงพอ'};}
export const evidenceLabel=(e:Row)=>e.status_label_th??({R:'รองรับจากกติกาที่อ่าน',P:'ข้อเสนอให้ตรวจเพิ่มเติม',C:'ใช้ได้เมื่อมีเงื่อนไข',U:'ยังไม่มีข้อมูลเพียงพอ',X:'ไม่พบโอกาสตามเกณฑ์'}[e.status as string]??e.label??'ยังไม่มีข้อมูลเพียงพอ');
export const supported=(g:Row)=>g.skills.filter((s:Row)=>s.status==='R');
export function skillExamples(id:string,limit=10){const r=data.bridges?.related_games_by_skill?.find((r:Row)=>r.skill_id===id);return [...(r?.supported??[]).map((r:Row)=>({...r,status:'R'})),...(r?.conditional??[]).map((r:Row)=>({...r,status:'C'}))].map((r:Row)=>({...r,game:games.find(g=>g.id===r.game_id)})).filter((r:Row)=>r.game).slice(0,limit);}
export function packagesForSkill(id:string){const a=data.activities?.skills?.find((a:Row)=>a.skill_id===id);return packages.filter(p=>a?.prototype_pattern_ids?.includes(p.id)||p.skills.includes(id));}
export const base=import.meta.env.BASE_URL.replace(/\/$/,'');
export const url=(route:string,params:Record<string,string>={})=>`${base}/${route}/`+(Object.keys(params).length?'?'+new URLSearchParams(params):'');
export function searchGames(query:string,list=games){
 const q=query.trim().normalize('NFKC').toLocaleLowerCase();if(!q)return list;
 const exact=list.filter(g=>[g.name,g.name_th,g.thai,...(g.aliases??[])].some(n=>String(n??'').toLocaleLowerCase()===q));if(exact.length)return exact;
 const types:Record<string,string>={tabletop:'เกมบนโต๊ะ บอร์ดเกม',card:'การ์ดเกม เกมการ์ด การ์ด',digital:'เกมดิจิทัล',strategy:'กลยุทธ์ วางแผน',deduction:'อนุมาน สืบสวน'};
 return list.filter(g=>[g.name,g.name_th,g.thai,...(g.aliases??[]),g.medium,...g.format,...g.genres,...[g.medium,...g.format,...g.genres].map(t=>types[t]??''),...(g.mechanisms??[]),g.decision,g.action,...g.skills.filter((s:Row)=>['R','P','C'].includes(s.status)).map((s:Row)=>skillName(s.skill_id)),...g.cards.map((id:string)=>{const c=cards.find(c=>c.id===String(id));return `${c?.name??''} ${c?.thai??''}`}),...g.skills.filter((s:Row)=>['R','P','C'].includes(s.status)).map((s:Row)=>skills.find(x=>x.id===s.skill_id)?.thai??'')].join(' ').normalize('NFKC').toLocaleLowerCase().includes(q));
}
export function relatedGames(game:Row){const ids=supported(game).map((s:Row)=>s.skill_id);return games.filter(g=>g.id!==game.id).map(g=>({game:g,shared:supported(g).filter((s:Row)=>ids.includes(s.skill_id))})).filter(r=>r.shared.length).sort((a,b)=>b.shared.length-a.shared.length).slice(0,6);}
export function activityFor(id:string){const a=data.activities;const list=Array.isArray(a)?a:(a?.activities??a?.skills??[]);return list.filter((a:Row)=>a.skill_id===id||(a.skills??[]).includes(id));}
export function cleanText(t:any){return String(t??'').replace(/WH\s*\d+/g,'กลไก').replace(/\b(CT|DM|CR|CO|PS|NE|CM|RE|SM|RD|EM|PA)\.[RPCUX]\b/g,'ทักษะ');}
