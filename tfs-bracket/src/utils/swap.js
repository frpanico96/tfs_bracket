import { swapPlayers } from "./bracket";

// Slot swapping for the bracket editor.
//
// A slot is one side of a match: { player1 | player2, prevMatch1 | prevMatch2 }.
// A slot either holds a named player (no feeder) or "TBD" fed by an earlier match.
//
// - named <-> named : the names are exchanged (delegates to swapPlayers, unchanged).
// - anything with a TBD slot: the whole slot (name AND feeder link) is exchanged, so
//   "winner of match X" can be moved to another match. That is how a bracket gets
//   rewired to mirror an external backup bracket.

const isReal = (p) => !!p && p !== "TBD" && p !== "BYE";
const keys = (slot) =>
  slot === 0 ? { player: "player1", prev: "prevMatch1" } : { player: "player2", prev: "prevMatch2" };
const onWinnersSide = (m) => !m.bracket || m.bracket === "winners";
const isDone = (m) => !!m && (m.isPlayed === true || m.winner != null);

export function isSwappableSlot(match, slot) {
  if (!match) return false;
  const { player, prev } = keys(slot);
  const name = match[player];
  if (name === "BYE") return false;
  if (isReal(name)) return true;
  // TBD: only slots fed by a winners-bracket match can be rewired.
  return !!match[prev] && onWinnersSide(match);
}

// Returns the new matches array, or the SAME array reference when the swap is refused.
export function swapSlots(matches, matchId1, slot1, matchId2, slot2) {
  const m1 = matches.find((m) => m.id === matchId1);
  const m2 = matches.find((m) => m.id === matchId2);
  if (!m1 || !m2) return matches;
  if (matchId1 === matchId2 && slot1 === slot2) return matches;

  const k1 = keys(slot1);
  const k2 = keys(slot2);
  const a = m1[k1.player];
  const b = m2[k2.player];
  if (a === "BYE" || b === "BYE") return matches;

  if (isReal(a) && isReal(b)) return swapPlayers(matches, matchId1, slot1, matchId2, slot2);

  // At least one TBD slot from here on.
  if (!isSwappableSlot(m1, slot1) || !isSwappableSlot(m2, slot2)) return matches;
  // Same round keeps the bracket a valid tree (no feeder can end up below itself)
  // and keeps every player's entry round.
  if (m1.round !== m2.round) return matches;

  const feeder = (m, k) => (m[k.prev] ? matches.find((x) => x.id === m[k.prev]) : null);
  if ([m1, m2, feeder(m1, k1), feeder(m2, k2)].some(isDone)) return matches;

  const updated = matches.map((m) => ({ ...m }));
  const u1 = updated.find((m) => m.id === matchId1);
  const u2 = updated.find((m) => m.id === matchId2);
  const player1 = u1[k1.player];
  const prev1 = u1[k1.prev] ?? null;
  const player2 = u2[k2.player];
  const prev2 = u2[k2.prev] ?? null;
  u1[k1.player] = player2;
  u1[k1.prev] = prev2;
  u2[k2.player] = player1;
  u2[k2.prev] = prev1;
  return updated;
}
