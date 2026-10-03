import fs from 'node:fs';
const p='src/components/App.tsx';let s=fs.readFileSync(p,'utf8');
s=s.replace('Library,Settings,Menu,','Library,Settings,Menu,Sparkle,Target,');
s=s.replace("['catalogue','คลังเกม',Library]", "['catalogue','คลังเกม',LayoutGrid]");s=s.replace("['skills','12 ทักษะ',Lightbulb]", "['skills','12 ทักษะ',Target]");s=s.replace("['wizard-hat','Wizard Hat',Layers]", "['wizard-hat','Wizard Hat',Sparkle]");s=s.replace('<span className="brand-mark"><Layers/>','<span className="brand-mark"><Sparkle/>');
s=s.replace(/<nav className="skill-tabs" aria-label="เลือกทักษะ">[\s\S]*?<\/nav><SkillFlow/, '<SkillFlow');
fs.writeFileSync(p,s);
const shared='src/components/Shared.tsx';s=fs.readFileSync(shared,'utf8');s=s.replace("b?.rule_evidence?.summary_en??e.constraint??game.rule??game.tradeoff", "b?.rule_evidence?.summary_th??game.rule??e.constraint??game.tradeoff");s=s.replace('{b?.rule_evidence&&<Sources sources={[b.rule_evidence]}/>}', '{b?.rule_evidence&&<><Sources sources={[b.rule_evidence]}/>{b.rule_evidence.summary_en&&<details><summary>ข้อความกติกาภาษาอังกฤษที่ใช้อ้างอิง</summary><p>{b.rule_evidence.summary_en}</p></details>}</>}');fs.writeFileSync(shared,s);
const site=JSON.parse(fs.readFileSync('src/data/site.json'));site.pages.catalogue.title='ค้นเกมที่เปิดให้คิด\nหยิบกลไกไปออกแบบต่อ';site.pages.catalogue.intro='ดูพฤติกรรมที่กติกาเรียกใช้ แล้วค่อยเลือกกลไกสำหรับต้นแบบของคุณ';fs.writeFileSync('src/data/site.json',JSON.stringify(site,null,2));
