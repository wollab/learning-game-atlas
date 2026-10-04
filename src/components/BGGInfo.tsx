
import type {Row} from '../lib/model';
export default function BGGInfo({game}:{game:Row}){
 const snapshot=game.bgg_ranking_snapshot, b:Row=snapshot??game.bgg??{}, m=game.bgg_metadata_snapshot;
 if(b.overall_rank==null&&!m)return <p className="bgg-compact muted">BGG: ยังไม่มีข้อมูลอันดับที่ตรวจจับคู่แล้ว</p>;
 const range=(v:Row|null|undefined)=>v?.min==null||v?.max==null?'ยังไม่ทราบ':v.min===v.max?String(v.min):v.min+'–'+v.max;
 return <details className="bgg-compact">
  <summary>{b.overall_rank!=null?<>BGG #{b.overall_rank} · คะแนน {b.average_rating??'ยังไม่ทราบ'}</>:'ข้อมูลชุมชน BGG'}</summary>
  {b.overall_rank!=null&&<>
   <p>ผู้ให้คะแนน {b.vote_count??'ยังไม่ทราบจำนวนที่แน่นอน'}</p>
   {snapshot?<><p>Ranking snapshot · {snapshot.snapshot_label??'ยังไม่ทราบวันที่ไฟล์'}</p><p>เวลาเก็บสถิติที่แน่นอน: {snapshot.exact_capture_time??'ไม่ระบุในแหล่งข้อมูล'}</p></>:<><p>วันสถิติ: {b.as_of??'ยังไม่ทราบ'}</p><p>อ่านแหล่งข้อมูลเมื่อ {b.retrieved_on??'ยังไม่ทราบวัน'}</p></>}
   <p>ข้อมูลชุมชนจาก snapshot ไม่ใช่อันดับสดหรือหลักฐานผลการเรียนรู้</p>
   {b.source_url&&<a href={b.source_url} target="_blank" rel="noreferrer">{snapshot?'แหล่ง ranking snapshot':'แหล่งข้อมูล BGG'}</a>}
  </>}
  {m&&<><h3>Metadata snapshot · {m.snapshot_label??'ยังไม่ทราบวันที่ไฟล์'}</h3><p>จำนวนผู้เล่นที่บันทึก: {range(m.player_range)} · เวลาเล่นที่บันทึก: {range(m.listed_play_duration_minutes)} นาที</p><p>ข้อมูลชุมชนแยกจากข้อมูลผู้ผลิตที่แสดงในหน้าเกม</p><a href={m.source_url} target="_blank" rel="noreferrer">แหล่ง metadata snapshot</a></>}
  {(snapshot?.game_url??m?.game_url)&&<p><a href={snapshot?.game_url??m?.game_url} target="_blank" rel="noreferrer">หน้าเกมบน BoardGameGeek</a></p>}
 </details>;
}
