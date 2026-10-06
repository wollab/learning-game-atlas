import {MessageSquarePlus} from 'lucide-react';
import integrations from '../data/integrations.json';
import {feedbackLink} from '../lib/feedback-link.mjs';
import {games,url} from '../lib/model';
export default function FeedbackLink({route,params}:{route:string,params:URLSearchParams}){
 const id=params.get('id'),game=route==='game'?games.find(g=>g.id===id):null;
 const allowed:Record<string,string>=route==='game'||route==='skill'||route==='wizard-hat'?{id:id??''}:route==='compare'?{ids:params.get('ids')??''}:{};
 const pageUrl=new URL(url(route,allowed),'https://wollab.github.io').href;
 const href=feedbackLink(integrations.feedback,{pageUrl,gameName:game?.name??''});
 if(!href)return null;
 return <div className="feedback-link"><a className="feedback-button" href={href} target="_blank" rel="noreferrer" aria-label="Feedback — เปิดแบบฟอร์มแนะนำหรือแก้ไขข้อมูล"><MessageSquarePlus size={18} aria-hidden="true"/><span>Feedback</span></a></div>;
}
