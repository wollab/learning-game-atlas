/** BGG #1 first; unknown/zero/invalid ranks last, with a stable name tie-break. */
export function byBggRank(a,b){
 const rank=g=>{const n=Number(g.rank_summary?.overall_rank);return Number.isInteger(n)&&n>0?n:Infinity;};
 const ar=rank(a),br=rank(b);
 return ar===br?String(a.name??'').localeCompare(String(b.name??'')):ar<br?-1:1;
}
