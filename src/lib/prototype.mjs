const TEXT={title:150,context:4000,roles:2000,turns:2000,objective:4000,ending:4000,rules:16000,debrief:8000};
const CORE=['Conflict','Order','Reward','Ending'];
/** Restore shared public rule receipts without changing skill-specific evidence. */
export function restoreBridgeSources(data){return (data.bridges?.bridges??[]).map(b=>({...b,rule_evidence:b.rule_evidence??data.bridges?.games?.find(g=>g.game_id===b.game_id)?.rule_evidence??null}));}
const plain=v=>v&&typeof v==='object'&&!Array.isArray(v);
function safe(v){if(plain(v)){for(const [k,x] of Object.entries(v)){if(['__proto__','constructor','prototype'].includes(k))throw Error('Unsupported data key');safe(x)}}else if(Array.isArray(v))v.forEach(safe);}
/** @param {any} value @param {any} refs */
export function validateDraft(value,refs){
 if(!plain(value))throw Error('ต้นแบบต้องเป็น object');safe(value);
 const allowed=[...Object.keys(TEXT),'packageId','skills','players','minutes','core','taste','locked','cardCount','analysisReview','bindings'];
 if(Object.keys(value).some(k=>!allowed.includes(k)))throw Error('ต้นแบบมีข้อมูลที่ไม่รองรับ');
 const d={};for(const [k,max] of Object.entries(TEXT)){if(typeof value[k]!=='string'||value[k].length>max)throw Error(`ข้อความ ${k} ไม่ถูกต้องหรือยาวเกินกำหนด`);d[k]=value[k];}
 for(const [k,min,max] of [['players',1,100],['minutes',5,600],['cardCount',1,10000]]){if(!Number.isInteger(value[k])||value[k]<min||value[k]>max)throw Error(`ค่า ${k} อยู่นอกขอบเขต`);d[k]=value[k];}
 if(!Array.isArray(value.skills)||value.skills.length>12||new Set(value.skills).size!==value.skills.length||value.skills.some(id=>!refs.skills.some(s=>s.id===id)))throw Error('ชื่อทักษะไม่ตรงกับคลัง');
 if(!plain(value.core)||Object.keys(value.core).some(k=>!CORE.includes(k)))throw Error('CORE ไม่ถูกต้อง');
 for(const [category,id] of Object.entries(value.core))if(id!==''&&!refs.cards.some(c=>c.id===id&&c.section==='CORE'&&c.category===category))throw Error(`การ์ด CORE ${category} ไม่ตรงหมวด`);
 if(!Array.isArray(value.taste)||new Set(value.taste).size!==value.taste.length||value.taste.some(id=>!refs.cards.some(c=>c.id===id&&c.section==='TASTE')))throw Error('การ์ด TASTE ไม่ถูกต้อง');
 if(!plain(value.locked)||Object.entries(value.locked).some(([id,v])=>!value.taste.includes(id)||typeof v!=='boolean'))throw Error('รายการล็อกไม่ตรงกับ TASTE ที่เลือก');
 if(value.packageId!==null&&!refs.packages.some(p=>p.id===value.packageId))throw Error('ชุดต้นแบบไม่ตรงกับคลัง');
 if(typeof value.analysisReview!=='boolean')throw Error('สถานะตรวจต้นแบบไม่ถูกต้อง');
 if(value.bindings!==undefined){
  if(!Array.isArray(value.bindings)||value.bindings.length>12||new Set(value.bindings.map(b=>b?.skill_id)).size!==value.bindings.length)throw Error('ทางเชื่อมทักษะซ้ำหรือไม่ถูกต้อง');
  for(const b of value.bindings){
   if(!plain(b)||!value.skills.includes(b.skill_id)||Object.keys(b).some(k=>!['skill_id','activity','rule','observable','counter_signal','debrief','origin','source_bridge_ids'].includes(k)))throw Error('ทางเชื่อมไม่ตรงทักษะที่เลือก');
   for(const k of ['activity','rule','observable','counter_signal','debrief','origin'])if(typeof b[k]!=='string'||b[k].length>4000)throw Error('ข้อความทางเชื่อมไม่ถูกต้องหรือยาวเกินกำหนด');
   if(!Array.isArray(b.source_bridge_ids)||b.source_bridge_ids.length>30||b.source_bridge_ids.some(id=>typeof id!=='string'||id.length>150||(refs.bridges&&!refs.bridges.some(x=>x.bridge_id===id))))throw Error('แหล่งทางเชื่อมไม่ตรงคลัง');
  }
 }
 return {...d,packageId:value.packageId,skills:[...value.skills],core:{...value.core},taste:[...value.taste],locked:{...value.locked},analysisReview:value.analysisReview,...(value.bindings!==undefined?{bindings:structuredClone(value.bindings)}:{})};
}
/** @param {any} d @param {any} refs */
export function exportPrototype(d,refs){const draft=validateDraft(d,refs);const ids=new Set((draft.bindings??[]).flatMap(b=>b.source_bridge_ids));const sources=(refs.bridges??[]).filter(b=>ids.has(b.bridge_id)).map(b=>({bridge_id:b.bridge_id,game_id:b.game_id,status:b.status,applicable_player_counts:b.applicable_player_counts,url:b.rule_evidence?.url,locator:b.rule_evidence?.locator}));const file={kind:'learning-game-prototype',version:3,draft,review_status:'needs-review',scores:null,sources};if(new TextEncoder().encode(JSON.stringify(file)).length>128000)throw Error('ไฟล์ต้นแบบต้องไม่เกิน 128 KB');return file;}
/** @param {string} text @param {any} refs */
export function importPrototype(text,refs){
 if(new TextEncoder().encode(text).length>128000)throw Error('ไฟล์ต้นแบบต้องไม่เกิน 128 KB');
 const file=JSON.parse(text);safe(file);if(!plain(file)||![1,2,3].includes(file.version))throw Error('ไม่รองรับรุ่นไฟล์ต้นแบบ');
 if(file.version>=2&&(file.kind!=='learning-game-prototype'||Object.keys(file).some(k=>!['kind','version','draft','review_status','scores',...(file.version===3?['sources']:[])].includes(k))))throw Error('ชนิดไฟล์ต้นแบบไม่ถูกต้อง');
 if(file.version===3&&file.sources!==undefined&&!Array.isArray(file.sources))throw Error('แหล่งอ้างอิงต้นแบบไม่ถูกต้อง');
 if(file.scores!==undefined&&file.scores!==null)throw Error('ไฟล์ต้นแบบต้องไม่มีคะแนนทักษะ');
 const value=file.draft??Object.fromEntries(Object.entries(file).filter(([k])=>!['version','review_status','scores'].includes(k)));
 return {...validateDraft(value,refs),analysisReview:true};
}
/** @param {any} d @param {any} refs @param {any} optional */
export function reviewPrototype(d,refs,optional={customRules:true}){
 const errors=[];try{validateDraft(d,refs)}catch(e){return {errors:[e.message],warnings:[],ready:false}}
 if(!d.title?.trim())errors.push('ระบุชื่อต้นแบบ');if(!d.skills?.length)errors.push('เลือกทักษะอย่างน้อย 1 ทักษะ');
 for(const k of CORE)if(!d.core?.[k])errors.push(`เลือก CORE ${k}`);
 for(const [k,label] of [['turns','ลำดับตา'],['objective','เป้าหมายผู้เล่น'],['ending','เงื่อนไขจบเกม']])if(!d[k]?.trim())errors.push(`ระบุ${label}`);
 if(optional.customRules&&!d.rules?.trim())errors.push('เขียนขั้นตอนเล่นและข้อห้ามให้ผู้เล่นทดลองได้');
 if(d.bindings){for(const id of d.skills??[]){const b=d.bindings.find(b=>b.skill_id===id);if(!b?.activity.trim()||!b?.rule.trim()||!b?.observable.trim())errors.push(`เติมกิจกรรม กติกา และสิ่งที่สังเกตของ ${refs.skills.find(s=>s.id===id)?.name??id}`)}}
 const warnings=[];if(!d.context?.trim())warnings.push('ยังไม่ระบุผู้เรียนและข้อจำกัดด้านการเข้าถึง');
 if(!d.bindings)warnings.push('ไฟล์รุ่นเดิมยังไม่มีทางเชื่อมรายทักษะ เติมก่อนทดลองใช้เพื่อการเรียนรู้');
 const p=refs.packages.find(p=>p.id===d.packageId);if(p?.allowed_players&&!p.allowed_players.includes(d.players))warnings.push('จำนวนคนอยู่นอกช่วงต้นแบบที่เสนอ ต้องปรับและทดลองก่อนใช้');
 if(p?.skills&&d.skills?.some(id=>!p.skills.includes(id)))warnings.push('ชุดนี้ไม่ครอบคลุมทุกทักษะที่เลือก ต้องเขียนทางเชื่อมที่ยังขาดเอง');
 if(!d.taste?.length)warnings.push('ยังไม่ได้เลือก TASTE; ทดลองโครงสร้าง CORE อย่างเดียวได้');
 const conflict=refs.cards.find(c=>c.id===d.core?.Conflict);
 if(d.skills?.includes('cooperation')&&conflict?.name==='Competitive')warnings.push('Cooperation: ระบุงานที่ต้องพึ่งการกระทำกัน แม้มีการแข่งขัน มิฉะนั้นอาจไม่เรียกใช้ทักษะนี้');
 return {errors:[...new Set(errors)],warnings,ready:!errors.length};
}
/** @param {any[]} examples @param {number} players */
export function contextExamples(examples,players){return (examples??[]).filter(e=>['supported','conditional','R','C'].includes(e.status)&&Array.isArray(e.applicable_player_counts)&&e.applicable_player_counts.includes(players));}
