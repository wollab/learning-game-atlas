import {BookOpen,HelpCircle,GitBranch,ShieldCheck,ArrowDown,Brain,Sparkles} from 'lucide-react';
import {data,skills,cards,groups,groupNames,groupColors,skillColors,skillName,cardName,evidence,evidenceLabel,cleanText,url} from '../lib/model';
import type {Row} from '../lib/model';
import {readableInk} from '../lib/color-contrast.mjs';
export function Sources({sources=[]}:{sources?:Row[]}){const list=Array.isArray(sources)?sources.filter(Boolean):[];return <div className="sources">{list.map((s,i)=><p key={i}><BookOpen size={15}/><a href={s.url} target="_blank" rel="noreferrer">{s.title??s.label_th??({'publisher-product':'ข้อมูลผู้ผลิต','rulebook':'กติกาต้นฉบับ','official-distributor-product':'ข้อมูลผู้จัดจำหน่าย'} as Row)[s.kind]??'แหล่งอ้างอิง'}</a><small>{s.locator}</small></p>)}</div>}
export function EvidenceLabel({entry}:{entry:Row}){const Icon=entry.status==='R'?ShieldCheck:entry.status==='C'?GitBranch:HelpCircle;return <span className={`evidence ${entry.status==='C'?'conditional':''}`}><Icon size={16}/>{evidenceLabel(entry)}</span>}
export function HatChip({id}:{id:string|number}){const c=cards.find(c=>c.id===String(id));if(!c)return null;return <a className="hat-chip" style={{backgroundColor:c.color??c.category_color,borderColor:c.color??c.category_color,color:readableInk(c.color??c.category_color??'#50C2C0')}} href={url('wizard-hat',{id:c.id})}><svg className="mechanism-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" focusable="false"><rect x="8" y="3" width="12" height="17" rx="2"/><path d="M5 7H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h10M11 8h6M11 12h6M11 16h3"/></svg><span>{cardName(id)}</span></a>}
export function Pizza({game,onSelect,selected}:{game:Row,onSelect:(id:string)=>void,selected:string}){
 const pale=(hex:string)=>'#'+[1,3,5].map(i=>Math.round(parseInt(hex.slice(i,i+2),16)*.18+255*.82).toString(16).padStart(2,'0')).join('');
 const pattern='conditional-'+game.id.replace(/[^a-z0-9-]/gi,'');
 return <div className="pizza-block"><svg viewBox="0 0 540 500" className="pizza labelled-wheel" role="img" aria-label="12 ทักษะ ส่วนขนาดเท่ากัน สีแสดงสถานะหลักฐาน ไม่มีคะแนน"><defs><pattern id={pattern} width="7" height="7" patternUnits="userSpaceOnUse"><path d="M0 7L7 0" stroke="#192C4C" strokeWidth="1"/></pattern></defs>{skills.map((s,i)=>{const a=(i*30-105)*Math.PI/180,b=((i+1)*30-105)*Math.PI/180,m=(a+b)/2,cx=270,cy=250,r=128;const e=evidence(game,s.id),known=!!e.bridge&&['R','C'].includes(e.status);const path=`M${cx} ${cy}L${cx+r*Math.cos(a)} ${cy+r*Math.sin(a)}A${r} ${r} 0 0 1 ${cx+r*Math.cos(b)} ${cy+r*Math.sin(b)}Z`;const x=cx+(Math.abs(Math.cos(m))>.98?148:158)*Math.cos(m),y=cy+158*Math.sin(m),anchor=Math.cos(m)>.15?'start':Math.cos(m)<-.15?'end':'middle';const words=s.name.replace(/-/g,'- ').split(' '),lines=s.name.length>13?[words.slice(0,Math.ceil(words.length/2)).join(' '),words.slice(Math.ceil(words.length/2)).join(' ')]:[s.name];return <g key={s.id}><title>{s.name}: {known?evidenceLabel(e):'ยังไม่มีข้อมูลรองรับ'}</title><path d={path} fill={known?skillColors[s.id]:pale(skillColors[s.id])} stroke={selected===s.id?'#192C4C':'white'} strokeWidth={selected===s.id?3:2} onClick={known?()=>onSelect(s.id):undefined} style={{cursor:known?'pointer':'default'}}/>{known&&e.status==='C'&&<path d={path} fill={`url(#${pattern})`} pointerEvents="none"/>}<path d={`M${cx+134*Math.cos(m)} ${cy+134*Math.sin(m)}L${cx+142*Math.cos(m)} ${cy+142*Math.sin(m)}`} stroke="#B7C3D5"/><text x={x} y={y-(lines.length-1)*11} textAnchor={anchor} dominantBaseline="middle" fontSize="20" fill="#192C4C">{lines.map((line,j)=><tspan key={j} x={x} dy={j===0?0:23}>{line}</tspan>)}</text></g>})}</svg><div className="group-legend">{groups.map((g,i)=><span key={g}><i style={{background:groupColors[i]}}/>{groupNames[i]}</span>)}</div><p className="reference-note">สีอ่อน: ยังไม่มีข้อมูลรองรับ · ลายเส้น: มีเงื่อนไข<br/>สีแสดงโอกาสตามกติกา ไม่ใช่คะแนนหรือผลพัฒนาทักษะ</p></div>;
}
export function SkillFlow({game,skillId}:{game:Row,skillId:string}){
 const e=evidence(game,skillId),s=skills.find(s=>s.id===skillId),b=e.bridge,f=b?.learning_flow;
 const definition=s?.activity?.unicef_definition;
 const definitionSource=data.activities?.sources?.find((source:Row)=>source.id===definition?.source_id);
 return <section className="skill-flow">
  <h3>{s?.name}</h3><EvidenceLabel entry={e}/>
  {['R','C','P'].includes(e.status)?<>
   <div className={e.status==='C'?'condition-note':'muted'}><h4>เงื่อนไขการใช้ข้อวิเคราะห์</h4>
    <p>{cleanText(e.conditions??e.rationale)}</p>
    {b?.applicable_player_counts&&<p>บริบท: {b.applicable_player_counts.join(', ')} คน · {b.role_th}</p>}
    {f?.edition_scope&&<p>รุ่นและโหมดที่ทบทวน: {f.edition_scope}</p>}
   </div>

   <div><h4><Brain/>1. Skill — ทักษะที่ต้องการ</h4>
    <p>{f?.skill_definition_th??definition?.summary_th}</p>
    <p className="muted learning-note">สรุปนิยาม UNICEF เป็นภาษาไทยโดยผู้วิเคราะห์</p>
    {definitionSource&&<Sources sources={[{...definitionSource,locator:definition?.locator}]}/>}
   </div><ArrowDown className="flow-arrow"/>
   <div><h4><Brain/>2. กิจกรรมสร้างการเรียนรู้</h4>
    {b?.activity_th&&<p><b>{b.activity_th}</b></p>}
    <h5>ผู้เล่นทำอะไร</h5><p>{cleanText(e.player_action??game.action)}</p>
    <h5>พฤติกรรมที่ชวนสังเกต</h5><p>{cleanText(e.observable)}</p>
   </div><ArrowDown className="flow-arrow"/>
   <div><h4><BookOpen/>3. กติกาที่ทำให้เกิดกิจกรรม</h4>
    <p>{cleanText(b?.rule_evidence?.summary_th??game.rule??e.constraint??game.tradeoff)}</p>
    {b?.rule_evidence&&<><Sources sources={[b.rule_evidence]}/>{b.rule_evidence.summary_en&&<details><summary>ข้อความกติกาภาษาอังกฤษที่ใช้อ้างอิง</summary><p>{b.rule_evidence.summary_en}</p></details>}</>}
   </div><ArrowDown className="flow-arrow"/>
   <div><h4><Sparkles/>4. Wizard Hat ที่เชื่อมกับทักษะนี้</h4>
    {b?.wizard_hat?.length?['CORE','TASTE'].map(section=><section key={section}>
     <h4>{section==='CORE'?'CORE — โครงสร้างหลัก':'TASTE — กลไกเสริมรสชาติ'}</h4>
     {b.wizard_hat.filter((w:Row)=>w.framework_role===section).map((w:Row)=><div className="bridge-hat" key={w.card_no}><HatChip id={w.card_no}/><p>{w.explanation_th}</p></div>)}
    </section>):<p className="muted">{b?.wizard_hat_gap_th??'ยังไม่มีสะพานกติกาถึง Wizard Hat ที่ตรวจเพียงพอสำหรับทักษะนี้'}</p>}
   </div>
   {f?.debrief_question_th&&<div><h4>คำถามหลังเล่น</h4><p>{f.debrief_question_th}</p><p className="muted learning-note">ข้อเสนอการชวนสะท้อนจาก WoL ไม่ใช่กิจกรรมที่ UNICEF กำหนด</p></div>}
   {b?.observation_method_th&&<p>วิธีชวนสังเกต: {b.observation_method_th}</p>}
   <p className="muted learning-note">สัญญาณที่ยังไม่เพียงพอ: {cleanText(e.counter_signal??'ยังไม่มีข้อมูลเพียงพอ')}</p>
   <p className="muted learning-note">ข้อมูลนี้อธิบายโอกาสตามกติกา ยังไม่ยืนยันผลพัฒนาหรือการถ่ายโอนทักษะ</p>
  </>:<p>{cleanText(e.reason??'ยังไม่มีข้อมูลเพียงพอ')}</p>}
 </section>
}
