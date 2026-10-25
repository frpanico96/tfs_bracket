// Descriptive "who is expected here" hints for TBD slots (display only: the stored
// player stays "TBD"). Slot 0 is fed by prevMatch1 / prevMatchLoser1, slot 1 by
// prevMatch2 / prevMatchLoser2.

const isReal = (p) => !!p && p !== "TBD" && p !== "BYE";

// "wb-r1-m2" -> "WB R1 #3", "lb-r2-m0" -> "LB R2 #1", "r1-m2" -> "R1 #3", "gf-m0" -> "Grand Final".
export function matchRef(matchId) {
  if (matchId === "gf-m0") return "Grand Final";
  const m = /^(?:(wb|lb)-)?r(\d+)-m(\d+)$/.exec(matchId || "");
  if (!m) return null;
  const tag = m[1] ? `${m[1].toUpperCase()} ` : "";
  return `${tag}R${m[2]} #${Number(m[3]) + 1}`;
}

function sourceTitle(kind, src) {
  if (!src || !isReal(src.player1) || !isReal(src.player2)) return undefined;
  return `${kind} of ${src.player1} vs ${src.player2}`;
}

// -> { text, title? } or null (BYE slots, named slots, unknown source).
export function slotSourceLabel(match, slot, byId) {
  if (!match) return null;
  const player = slot === 0 ? match.player1 : match.player2;
  if (player === "BYE" || isReal(player)) return null;
  const winnerId = slot === 0 ? match.prevMatch1 : match.prevMatch2;
  const loserId = slot === 0 ? match.prevMatchLoser1 : match.prevMatchLoser2;
  if (loserId) {
    const ref = matchRef(loserId);
    return ref ? { text: `Loser ${ref}`, title: sourceTitle("Loser", byId?.get(loserId)) } : null;
  }
  if (winnerId) {
    const ref = matchRef(winnerId);
    return ref ? { text: `Winner ${ref}`, title: sourceTitle("Winner", byId?.get(winnerId)) } : null;
  }
  if (match.id === "gf-m1") return { text: "Grand Final finalist" };
  return null;
}
