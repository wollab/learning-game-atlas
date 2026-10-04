import {pathToFileURL} from 'node:url';
export function setupReport(env=process.env){
 const names=['GITHUB_CLIENT_ID','GITHUB_CLIENT_SECRET','SESSION_SECRET','AUTH_ORIGIN'];
 const missing=names.filter(k=>!env[k]);let originValid=false;try{const u=new URL(env.AUTH_ORIGIN);originValid=u.protocol==='https:'&&u.hostname.endsWith('.vercel.app')&&u.pathname==='/'&&!u.search&&!u.hash&&!u.username&&!u.password}catch{}
 const sessionSecretValid=typeof env.SESSION_SECRET==='string'&&env.SESSION_SECRET.length>=32;
 return {configured:!missing.length&&originValid&&sessionSecretValid,missing,checks:{originValid,sessionSecretValid},repository:'wollab/learning-game-atlas',next:'After provider deployment, owner verifies callback, health, permissions, save/conflict/revert and canonical proposal review. This check makes no network requests and prints no secret values.'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const r=setupReport();console.log(JSON.stringify(r,null,2));process.exitCode=r.configured?0:1;}
