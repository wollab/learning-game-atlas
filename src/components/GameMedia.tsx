import {useState,useEffect} from 'react';
import {Award,ImageOff,ArrowLeftRight,X,ChevronDown,ChevronUp,Trash2} from 'lucide-react';
import {games,url} from '../lib/model';
import type {Row} from '../lib/model';
// Renders approved publisher covers or Chief-authorized exact BGG thumbnails from the pinned snapshot.
export function GameCover({game}:{game:Row}){
 const [failed,setFailed]=useState(false);
 useEffect(()=>setFailed(false),[game.id,game.external_cover?.url,game.cover_image?.url]);
 const cover=game.external_cover??game.cover_image;
 const src=cover?.display_allowed===true&&cover?.source_url&&/^https:\/\//.test(cover.url??'')?cover.url:null;
 return src&&!failed?<span className="game-cover-wrap"><img className="game-cover" src={src} alt={`Box cover — ${game.name}`} width="72" height="88" loading="lazy" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/><a className="cover-credit" href={cover.source_url} target="_blank" rel="noreferrer">{cover.attribution}</a></span>:<span className="game-cover cover-fallback" aria-label={`ยังไม่มีภาพกล่อง ${game.name}`}><ImageOff size={18}/><span>{game.name.slice(0,1)}</span></span>;
}
export function AwardBadges({game}:{game:Row}){return <div className="award-badges">{(game.awards??[]).filter((a:Row)=>a.source_url&&a.year&&a.category&&a.status==='winner').map((a:Row)=><a key={`${a.category}-${a.year}`} href={a.source_url} target="_blank" rel="noreferrer"><Award size={17}/>{a.category} · {a.year}</a>)}</div>}
export function SelectionPopover({ids,onRemove,onClear}:{ids:string[],onRemove:(id:string)=>void,onClear:()=>void}){
 const [open,setOpen]=useState(false);
 useEffect(()=>{if(ids.length===1)setOpen(true)},[ids.length]);
 if(!ids.length)return null;
 const chosen=ids.map(id=>games.find(g=>g.id===id)).filter(Boolean) as Row[];
 return <div className="selection-anchor"><div className="selection-bar"><button className="selection-summary" aria-expanded={open} aria-controls="selected-games" onClick={()=>setOpen(!open)}><ArrowLeftRight size={19}/>เลือกเทียบ {ids.length}/4 {open?<ChevronUp/>:<ChevronDown/>}</button>{!open&&ids.length>=2&&<a className="button primary" href={url('compare',{ids:ids.join(',')})}>เปรียบเทียบ</a>}</div>{open&&<section id="selected-games" className="selection-popover" aria-label="เกมที่เลือกเปรียบเทียบ" onKeyDown={e=>{if(e.key==='Escape'){setOpen(false);e.currentTarget.parentElement?.querySelector<HTMLButtonElement>('.selection-summary')?.focus()}}}><h2>เกมที่เลือก</h2><ul>{chosen.map(g=><li key={g.id}><GameCover game={g}/><span>{g.name}</span><button className="icon-button" aria-label={`นำ ${g.name} ออกจากรายการ`} onClick={()=>onRemove(g.id)}><X/></button></li>)}</ul><div className="selection-actions"><button onClick={onClear}><Trash2 size={17}/>ล้างรายการ</button>{ids.length>=2?<a className="button primary" href={url('compare',{ids:ids.join(',')})}><ArrowLeftRight/>เปรียบเทียบ</a>:<p>เลือกเพิ่มอีก 1 เกม</p>}</div></section>}</div>;
}
