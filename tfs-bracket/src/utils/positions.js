import { generateDoubleEliminationBracket, advanceBracket, computeRankings } from "./bracket";
import { generateFinalChampionshipBracket, isFinalChampionship } from "./finalChampionship";

// Finishing positions that can actually be awarded in a double elimination
// tournament. Players knocked out in the same losers round share a position, so
// with 8 players only 1, 2, 3, 4, 5 and 7 exist (5th-6th and 7th-8th are ties).
//
// The positions only depend on the shape of the bracket, never on who wins, so one
// deterministic playout of the real generator is enough.

const isReal = (p) => !!p && p !== "TBD" && p !== "BYE";

function fixedRng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function playOut(initial) {
  let matches = initial;
  for (let guard = 0; guard < 5000; guard++) {
    const active = matches.filter((m) => !(m.isGrandFinalReset && m.player1 === "TBD"));
    if (active.every((m) => m.winner != null)) return matches;
    const idx = matches.findIndex((m) => m.winner == null && isReal(m.player1) && isReal(m.player2));
    if (idx === -1) return null;
    matches = advanceBracket(matches, idx, 0, { p1Score: 1, p2Score: 0 });
  }
  return null;
}

// Returns { groups: [{ rank, size }], playerCount, estimated } or null when the
// tournament has no restricted positions (single elimination) or nothing can be computed.
// `estimated` is true when there are fewer than 2 participants and the maximum is used.
export function getPositionGroups(tournament) {
  if (!tournament || tournament.bracketType !== "double") return null;
  const max = Math.max(2, parseInt(tournament.maxParticipants, 10) || 0);
  let players = (tournament.participants || []).slice(0, max);
  let estimated = false;
  if (players.length < 2) {
    players = Array.from({ length: max }, (_, i) => ({ id: `n${i}`, name: `Player ${i + 1}`, tier: "regular" }));
    estimated = true;
  }

  const matches = isFinalChampionship(tournament)
    ? generateFinalChampionshipBracket(players, max, fixedRng(1))
    : generateDoubleEliminationBracket(players, max, "ft3");
  if (!matches || matches.length === 0) return null;

  const done = playOut(matches);
  if (!done) return null;
  const ranks = computeRankings(done, "double", null, players);
  if (!ranks || ranks.length === 0) return null;
  return {
    groups: ranks.map((e) => ({ rank: e.rank, size: e.players.length })),
    playerCount: players.length,
    estimated,
  };
}

export function getAvailablePositions(tournament) {
  const info = getPositionGroups(tournament);
  return info ? info.groups.map((g) => g.rank) : null;
}
