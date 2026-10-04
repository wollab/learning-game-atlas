const https=url=>{try{const u=new URL(url);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}};
/** Canonical image register is the only approval owner. A reachable candidate is not approved. */
export function staticImageAdapter(register,identities){
 const records=new Map();for(const r of register.records??[]){if(records.has(r.game_id))throw Error('Duplicate image game_id');records.set(r.game_id,r);}
 const matches=new Map((identities.records??[]).map(r=>[r.game_id,r]));
 return {apply(game){
  const id=game.game_id??game.id,r=records.get(id),identity=matches.get(id);
  const candidates=r?[...(r.publisher_image_candidates??[]),r,...(r.bgg_image_candidates??[])]:[];
  const chosen=candidates.find(c=>c.display_allowed===true&&c.game_identity_verified===true&&
   (!c.bgg_id||(identity?.game_identity_verified===true&&Number(identity.bgg_id)===Number(c.bgg_id)))&&
   (!c.exact_printing_claimed||c.printing_match_verified===true)&&
   https(c.url??c.thumbnail_url??c.candidate_url)&&https(c.source_url)&&https(c.usage_basis_url)&&
   typeof c.attribution==='string'&&c.attribution.trim()&&c.rights_status==='approved-source-use');
  const external_cover=chosen?{url:chosen.url??chosen.thumbnail_url??chosen.candidate_url,source_url:chosen.source_url,usage_basis_url:chosen.usage_basis_url,attribution:chosen.attribution,image_scope:chosen.image_scope??'representative cover',display_allowed:true}:game.external_cover??null;
  return {...game,external_cover};
 }};
}
