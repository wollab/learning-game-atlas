import {validSite,validProposal} from '../../auth-service/lib/validation.mjs';
/** @param {string} text */
export function readSettings(text){if(new TextEncoder().encode(text).length>210000)throw Error('ไฟล์การตั้งค่าใหญ่เกินกำหนด');const p=JSON.parse(text);validSite(p.site);if(typeof p.base_sha!=='string'||(p.base_sha&&!/^[a-f0-9]{40}$/.test(p.base_sha)))throw Error('Invalid settings revision');return {site:p.site,base_sha:p.base_sha};}
/** @param {any} options */
export function revisionConflict({dirty,baseSha,remoteSha}){return !!dirty&&baseSha!==remoteSha;}
/** @param {any} p @param {any} atlas @param {(v:any)=>Promise<string>} hash */
export async function inspectProposal(p,atlas,hash){
 validProposal(p);if(p.base_dataset_revision!==atlas.digest)throw Error('Dataset revision เปลี่ยนแล้ว เก็บไฟล์เดิมไว้และตรวจใหม่');
 const collections={games:[...(atlas.catalogue.records??atlas.catalogue.games),...(atlas.supplement?.records??[])],skills:atlas.activities.skills,'wizard-hat':atlas.wh.cards,packages:atlas.packages,sources:atlas.activities.sources};
 const old=(collections[p.collection]??[]).find(r=>String(r.game_id??r.skill_id??r.id??r.source_id)===p.record_id),revision=old?(old.record_revision_sha256??await hash(old)):null;
 if(p.base_record_revision!==revision)throw Error('Record revision เปลี่ยนแล้ว เก็บข้อเสนอเดิมไว้และตรวจใหม่');
 return {proposal:JSON.parse(JSON.stringify(p)),isNew:!old,status:'revision-compatible-awaiting-canonical-review'};
}
