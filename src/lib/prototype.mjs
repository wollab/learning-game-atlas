const TEXT={title:150,context:4000,roles:2000,turns:2000,objective:4000,ending:4000,rules:16000,debrief:8000};
const CORE=['Conflict','Order','Reward','Ending'];
const plain=v=>v&&typeof v==='object'&&!Array.isArray(v);
function safe(v){if(plain(v)){for(const [k,x] of Object.entries(v)){if(['__proto__','constructor','prototype'].includes(k))throw Error('Unsupported data key');safe(x)}}else if(Array.isArray(v))v.forEach(safe);}
/** @param {any} value @param {any} refs */
export function validateDraft(value,refs){
 if(!plain(value))throw Error('ต้นแบบต้องเป็น object');safe(value);
 const allowed=[...Object.keys(TEXT),'packageId','skills','players','minutes','core','taste','locked','cardCount','analysisReview'];
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
 return {...d,packageId:value.packageId,skills:[...value.skills],core:{...value.core},taste:[...value.taste],locked:{...value.locked},analysisReview:value.analysisReview};
}
/** @param {any} d @param {any} refs */
export function exportPrototype(d,refs){return {kind:'learning-game-prototype',version:2,draft:validateDraft(d,refs),review_status:'needs-review',scores:null};}
/** @param {string} text @param {any} refs */
export function importPrototype(text,refs){
 if(new TextEncoder().encode(text).length>128000)throw Error('ไฟล์ต้นแบบต้องไม่เกิน 128 KB');
 const file=JSON.parse(text);safe(file);if(!plain(file)||![1,2].includes(file.version))throw Error('ไม่รองรับรุ่นไฟล์ต้นแบบ');
 if(file.version===2&&(file.kind!=='learning-game-prototype'||Object.keys(file).some(k=>!['kind','version','draft','review_status','scores'].includes(k))))throw Error('ชนิดไฟล์ต้นแบบไม่ถูกต้อง');
 if(file.scores!==undefined&&file.scores!==null)throw Error('ไฟล์ต้นแบบต้องไม่มีคะแนนทักษะ');
 const value=file.draft??Object.fromEntries(Object.entries(file).filter(([k])=>!['version','review_status','scores'].includes(k)));
 return {...validateDraft(value,refs),analysisReview:true};
}
/** @param {any} d @param {any} refs @param {any} optional */
export function reviewPrototype(d,refs,optional={customRules:true}){
 const errors=[];try{validateDraft(d,refs)}catch(e){errors.push(e.message)}
 if(!d.title?.trim())errors.push('ระบุชื่อต้นแบบ');if(!d.skills?.length)errors.push('เลือกทักษะอย่างน้อย 1 ทักษะ');
 for(const k of CORE)if(!d.core?.[k])errors.push(`เลือก CORE ${k}`);
 for(const [k,label] of [['turns','ลำดับตา'],['objective','เป้าหมายผู้เล่น'],['ending','เงื่อนไขจบเกม']])if(!d[k]?.trim())errors.push(`ระบุ${label}`);
 if(optional.customRules&&!d.rules?.trim())errors.push('เขียนขั้นตอนเล่นและข้อห้ามให้ผู้เล่นทดลองได้');
 const warnings=[];if(!d.context?.trim())warnings.push('ยังไม่ระบุผู้เรียนและข้อจำกัดด้านการเข้าถึง');
 if(!d.taste?.length)warnings.push('ยังไม่ได้เลือก TASTE; ทดลองโครงสร้าง CORE อย่างเดียวได้');
 const conflict=refs.cards.find(c=>c.id===d.core?.Conflict);
 if(d.skills?.includes('cooperation')&&conflict?.name==='Competitive')warnings.push('Cooperation: ระบุงานที่ต้องพึ่งการกระทำกัน แม้มีการแข่งขัน มิฉะนั้นอาจไม่เรียกใช้ทักษะนี้');
 return {errors:[...new Set(errors)],warnings,ready:!errors.length};
}
/** @param {any[]} examples @param {number} players */
export function contextExamples(examples,players){return (examples??[]).filter(e=>['supported','conditional','R','C'].includes(e.status)&&Array.isArray(e.applicable_player_counts)&&e.applicable_player_counts.includes(players));}
