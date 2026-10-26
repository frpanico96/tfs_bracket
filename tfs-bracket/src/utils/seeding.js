// Seeding: players are ranked by their leaderboard score (best first) and the bracket is
// built from that ranking. A participant with a numeric `seed` (1 = best) is "seeded";
// brackets are only seeded when EVERY participant has one, otherwise the old random draw
// is used (so existing callers, tests and tournaments behave exactly as before).

export const hasSeeds = (players) =>
  Array.isArray(players) && players.length > 0 && players.every((p) => Number.isFinite(p?.seed));

export const bySeed = (a, b) => a.seed - b.seed;

function shuffled(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// scores: { [participantId]: totalScore }. Returns copies (same order as the input)
// with `seed` attached. Higher score = better seed. Equal scores, players without an
// account and players without any score are ordered randomly among themselves.
export function seedParticipants(participants, scores = {}, rng = Math.random) {
  const scoreOf = (p) => Number(scores?.[p.id]) || 0;
  const ranked = shuffled(participants, rng).sort((a, b) => scoreOf(b) - scoreOf(a));
  const seedById = new Map(ranked.map((p, i) => [p, i + 1]));
  return participants.map((p) => ({ ...p, seed: seedById.get(p) }));
}

// Seed numbers in bracket order for a power-of-two size; neighbours meet in round 1
// (8 -> 1,8,4,5,2,7,3,6) and the top seeds can only meet in the last rounds.
export function standardOrder(size) {
  let order = [1];
  while (order.length < size) {
    const n = order.length * 2;
    order = order.flatMap((s) => [s, n + 1 - s]);
  }
  return order;
}

// First-round layout for `players` sorted best seed first, with `base` the largest
// power of two <= players.length. The best (base - prelims) seeds get a bye into the
// first full round, the others play preliminaries best-vs-worst (13v20, 14v19, ...);
// a preliminary winner takes the slot of the better seed of its match.
//   pairs[j]  : [playerA, playerB] of preliminary j
//   slots[k]  : { name } for a bye player or { prelim: j } for a preliminary winner,
//               in bracket order (slots 2i and 2i+1 form first-round match i).
export function seededFirstRound(players, base) {
  const n = players.length;
  const prelims = n - base;
  const byes = base - prelims;
  const pairs = [];
  for (let j = 0; j < prelims; j++) pairs.push([players[byes + j], players[n - 1 - j]]);
  const slots = standardOrder(base).map((s) => (s <= byes ? { name: players[s - 1].name } : { prelim: s - byes - 1 }));
  return { pairs, slots };
}
