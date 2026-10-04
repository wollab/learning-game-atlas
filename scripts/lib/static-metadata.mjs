
/** Join only reviewed work identities. Publisher facts and edition reviews stay untouched. */
export function staticMetadataAdapter(contract, identityMap) {
  const games = new Map();
  for (const g of contract?.games ?? []) {
    if (!g.game_id || games.has(g.game_id)) throw new Error('Missing or duplicate static game_id');
    games.set(g.game_id, g);
  }
  const identities = new Map();
  for (const r of identityMap?.records ?? []) {
    if (!r.game_id || identities.has(r.game_id)) throw new Error('Missing or duplicate identity game_id');
    identities.set(r.game_id, r);
  }
  const sources = new Map((contract?.external_sources ?? []).map(s => [s.id, s]));
  const annotate = (snapshot, bggId) => {
    if (!snapshot) return null;
    const source = sources.get(snapshot.source_id);
    if (!source || new URL(source.url).protocol !== 'https:') throw new Error('Missing or unsafe snapshot source');
    return {...snapshot, bgg_id:bggId, source_url:source.url,
      snapshot_label:source.snapshot_label, exact_capture_time:snapshot.exact_capture_time ?? null,
      claim_status:'third-party-snapshot', game_url:'https://boardgamegeek.com/boardgame/'+bggId};
  };
  return {
    assertCoverage(rows) {
      const ids = rows.map(g => g.game_id ?? g.id);
      if (new Set(ids).size !== ids.length || ids.length !== games.size || ids.some(id => !games.has(id)))
        throw new Error('Static contract and catalogue IDs differ');
    },
    apply(game) {
      const id=game.game_id ?? game.id, flat=games.get(id), identity=identities.get(id);
      const matched=identity?.game_identity_verified===true && flat?.bgg_id!=null &&
        Number(identity.bgg_id)===Number(flat.bgg_id);
      return {...game,
        bgg_ranking_snapshot:matched?annotate(flat.bgg_ranking_snapshot,flat.bgg_id):null,
        bgg_metadata_snapshot:matched?annotate(flat.bgg_metadata_snapshot,flat.bgg_id):null};
    }
  };
}
