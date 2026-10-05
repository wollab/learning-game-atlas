/** Evidence-backed filters. All requested skills must share a usable player count. */
export const connectedSkills = game => (game.skills ?? []).filter(s => s.bridge && ['R','C'].includes(s.status));
export function matchesFilters(game, filter) {
 const counts = (game.players ?? []).filter(n => !filter.players || (n >= filter.players[0] && n <= filter.players[1]));
 if (filter.players && !counts.length) return false;
 if (filter.minutes && (game.play_max == null || game.play_max < filter.minutes[0] || game.play_max > filter.minutes[1])) return false;
 if (filter.formats?.length && !filter.formats.some(t => game.format?.includes(t))) return false;
 if (filter.genres?.length && !filter.genres.some(t => game.genres?.includes(t) || (t === 'family' && game.rank_summary?.category_ranks?.familygames) || (t === 'party' && game.rank_summary?.category_ranks?.partygames) || (t === 'strategy' && game.rank_summary?.category_ranks?.strategygames))) return false;
 if (filter.sdj && !(game.awards ?? []).some(a => a.status === 'winner' && a.source_url && /spiel|sdj/i.test(a.category ?? ''))) return false;
 if (!filter.skills?.length) return true;
 const evidence = connectedSkills(game);
 const matchesAt = n => filter.skills.map(id => evidence.some(s => s.skill_id === id && Array.isArray(s.applicable_player_counts) && s.applicable_player_counts.includes(n)));
 return counts.some(n => filter.skillMode === 'all' ? matchesAt(n).every(Boolean) : matchesAt(n).some(Boolean));
}
