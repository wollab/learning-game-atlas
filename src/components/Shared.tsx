import {BookOpen,HelpCircle,GitBranch,ShieldCheck,ArrowDown,Brain,Sparkles} from 'lucide-react';
import {data,skills,cards,groups,groupNames,groupColors,skillColors,skillName,cardName,evidence,evidenceLabel,cleanText,url} from '../lib/model';
import type {Row} from '../lib/model';
import {readableInk} from '../lib/color-contrast.mjs';
export function Sources({sources=[]}:{sources?:Row[]}){const list=Array.isArray(sources)?sources:[];return <div className="sources">{list.map((s,i)=><p key={i}><BookOpen size={15}/><a href={s.url} target="_blank" rel="noreferrer">{s.title??s.label_th??({'publisher-product':'ข้อมูลผู้ผลิต','rulebook':'กติกาต้นฉบับ','official-distributor-product':'ข้อมูลผู้จัดจำหน่าย'} as Row)[s.kind]??'แหล่งอ้างอิง'}</a><small>{s.locator} {s.accessed&&` · ตรวจ ${s.accessed}`}</small></p>)}</div>}
export function EvidenceLabel({entry}:{entry:Row}){const Icon=entry.status==='R'?ShieldCheck:entry.status==='C'?GitBranch:HelpCircle;return <span className={`evidence ${entry.status==='C'?'conditional':''}`}><Icon size={16}/>{evidenceLabel(entry)}</span>}
export function HatChip({id}:{id:string|number}){const c=cards.find(c=>c.id===String(id));if(!c)return null;return <a className="hat-chip" style={{backgroundColor:c.color??c.category_color,borderColor:c.color??c.category_color,color:readableInk(c.color??c.category_color??'#50C2C0')}} href={url('wizard-hat',{id:c.id})}><svg className="mechanism-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" focusable="false"><rect x="8" y="3" width="12" height="17" rx="2"/><path d="M5 7H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h10M11 8h6M11 12h6M11 16h3"/></svg><span>{cardName(id)}</span></a>}
export function Pizza({game,onSelect,selected}:{game:Row,onSelect:(id:string)=>void,selected:string}){return <div className="pizza-block"><svg viewBox="0 0 300 300" className="pizza" role="group" aria-label="12 ทักษะ ขนาดเท่ากัน แสดงสถานะหลักฐาน"><defs><pattern id="conditional" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 6L6 0" stroke="#192C4C" strokeWidth="1"/></pattern></defs>{skills.map((s,i)=>{const a=(i*30-90)*Math.PI/180,b=((i+1)*30-90)*Math.PI/180,m=(a+b)/2;const x=150+140*Math.cos(a),y=150+140*Math.sin(a),xx=150+140*Math.cos(b),yy=150+140*Math.sin(b);const e=evidence(game,s.id),known=['R','C'].includes(e.status);const fill=known?skillColors[s.id]:'#e5eaf0';return <g key={s.id} role="button" tabIndex={0} aria-label={`${i+1}. ${skillName(s.id)}: ${evidenceLabel(e)}`} aria-pressed={selected===s.id} onClick={()=>onSelect(s.id)} onKeyDown={ev=>{if(['Enter',' '].includes(ev.key)){ev.preventDefault();onSelect(s.id)}}}><path d={`M150 150L${x} ${y}A140 140 0 0 1 ${xx} ${yy}Z`} fill={fill} stroke={selected===s.id?'#192C4C':'white'} strokeWidth={selected===s.id?4:2}/>{e.status==='C'&&<path d={`M150 150L${x} ${y}A140 140 0 0 1 ${xx} ${yy}Z`} fill="url(#conditional)"/>}<text x={150+100*Math.cos(m)} y={150+100*Math.sin(m)} textAnchor="middle" dominantBaseline="middle" fill="#192C4C" fontSize="12">{i+1}</text></g>})}</svg><p>ทุกส่วนมีขนาดเท่ากัน สีแสดงหลักฐาน ไม่ใช่คะแนนทักษะ</p><div className="group-legend">{groups.map((g,i)=><span key={g}><i style={{background:groupColors[i]}}/>{groupNames[i]}</span>)}</div><p className="muted">สีเทา: ข้อมูลยังไม่เพียงพอ · ลายเส้น: มีเงื่อนไข</p><ol className="pizza-legend">{skills.map((s,i)=><li key={s.id}><button aria-pressed={selected===s.id} onClick={()=>onSelect(s.id)}><i style={{background:skillColors[s.id]}}/>{i+1}. {s.name}</button></li>)}</ol></div>}
export function SkillFlow({game,skillId}:{game:Row,skillId:string}){
 const e=evidence(game,skillId),s=skills.find(s=>s.id===skillId),b=e.bridge,f=b?.learning_flow;
 const definition=s?.activity?.unicef_definition;
 const definitionSource=data.activities?.sources?.find((source:Row)=>source.id===definition?.source_id);
 return <section className="skill-flow">
  <h3>{s?.name}</h3><EvidenceLabel entry={e}/>
  {['R','C','P'].includes(e.status)?<>
   <div><h4><Brain/>1. Skill — ทักษะที่ต้องการ</h4>
    <p>{f?.skill_definition_th??definition?.summary_th}</p>
    <p className="muted">สรุปนิยาม UNICEF เป็นภาษาไทยโดยผู้วิเคราะห์</p>
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
   <div className={e.status==='C'?'condition-note':'muted'}><h4>เงื่อนไขการใช้ข้อวิเคราะห์</h4>
    <p>{cleanText(e.conditions??e.rationale)}</p>
    {b?.applicable_player_counts&&<p>บริบท: {b.applicable_player_counts.join(', ')} คน · {b.role_th}</p>}
    {f?.edition_scope&&<p>รุ่นและโหมดที่ทบทวน: {f.edition_scope}</p>}
   </div>
   {f?.debrief_question_th&&<div><h4>คำถามหลังเล่น</h4><p>{f.debrief_question_th}</p><p className="muted">ข้อเสนอการชวนสะท้อนจาก WoL ไม่ใช่กิจกรรมที่ UNICEF กำหนด</p></div>}
   {b?.observation_method_th&&<p>วิธีชวนสังเกต: {b.observation_method_th}</p>}
   <p className="muted">สัญญาณที่ยังไม่เพียงพอ: {cleanText(e.counter_signal??'ยังไม่มีข้อมูลเพียงพอ')}</p>
   <p className="muted">ข้อมูลนี้อธิบายโอกาสตามกติกา ยังไม่ยืนยันผลพัฒนาหรือการถ่ายโอนทักษะ</p>
  </>:<p>{cleanText(e.reason??'ยังไม่มีข้อมูลเพียงพอ')}</p>}
 </section>
}
