export function feedbackLink(config,{pageUrl,gameName=''}){
 if(!config?.enabled)return null;
 if(config.provider==='github'){
  const u=new URL('https://github.com/wollab/learning-game-atlas/issues/new');
  u.searchParams.set('template','atlas-feedback.yml');
  u.searchParams.set('page',pageUrl);u.searchParams.set('game',gameName);
  return u.href;
 }
 if(config.provider==='google-forms'){
  let u;try{u=new URL(config.url);}catch{return null;}
  if(u.protocol!=='https:'||!['docs.google.com','forms.gle'].includes(u.hostname))return null;
  if(u.hostname==='docs.google.com'&&!u.pathname.startsWith('/forms/'))return null;
  u.searchParams.set('usp','pp_url');
  if(/^entry\.\d+$/.test(config.pageEntry??''))u.searchParams.set(config.pageEntry,pageUrl);
  if(/^entry\.\d+$/.test(config.gameEntry??''))u.searchParams.set(config.gameEntry,gameName);
  return u.href;
 }
 return null;
}
