import { describe, it, expect } from "vitest";
import { generateDoubleEliminationBracket, advanceBracket, computeRankings } from "../utils/bracket";
import { generateFinalChampionshipBracket } from "../utils/finalChampionship";
import { getAvailablePositions, getPositionGroups } from "../utils/positions";

function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const real = (p) => p && p !== "TBD" && p !== "BYE";
const mk = (r, w = 0, c = 0) => {
  const out = [];
  let n = 0;
  for (let i = 0; i < r; i++) out.push({ id: `p${n}`, name: `R${n++}`, tier: "regular" });
  for (let i = 0; i < w; i++) out.push({ id: `p${n}`, name: `W${n++}`, tier: "winner" });
  for (let i = 0; i < c; i++) out.push({ id: `p${n}`, name: `C${n++}`, tier: "champion" });
  return out;
};
const dbl = (players, max = 64) => ({ bracketType: "double", maxParticipants: max, participants: players });
const fc = (players, max = 64) => ({ ...dbl(players, max), tournamentType: "final_championship" });

// Plays random results; returns the finished matches and the round in which each
// player took their second loss (the ground truth for "knocked out in the same round").
function playRandom(matches, rng) {
  const losses = {};
  const exit = {};
  let ms = matches;
  for (let guard = 0; guard < 5000; guard++) {
    const active = ms.filter((m) => !(m.isGrandFinalReset && m.player1 === "TBD"));
    if (active.every((m) => m.winner != null)) return { ms, exit };
    const idx = ms.findIndex((m) => m.winner == null && real(m.player1) && real(m.player2));
    if (idx === -1) throw new Error("stuck");
    const m = ms[idx];
    const w = rng() < 0.5 ? 0 : 1;
    const loser = w === 0 ? m.player2 : m.player1;
    losses[loser] = (losses[loser] || 0) + 1;
    if (losses[loser] === 2) exit[loser] = m.bracket === "grandFinal" ? Infinity : m.round;
    ms = advanceBracket(ms, idx, w, { p1Score: 1, p2Score: 0 });
  }
  throw new Error("guard");
}

describe("getAvailablePositions - standard double elimination", () => {
  it("matches the classic placement table for power-of-two fields", () => {
    expect(getAvailablePositions(dbl(mk(4)))).toEqual([1, 2, 3, 4]);
    expect(getAvailablePositions(dbl(mk(8)))).toEqual([1, 2, 3, 4, 5, 7]);
    expect(getAvailablePositions(dbl(mk(16)))).toEqual([1, 2, 3, 4, 5, 7, 9, 13]);
    expect(getAvailablePositions(dbl(mk(32)))).toEqual([1, 2, 3, 4, 5, 7, 9, 13, 17, 25]);
    expect(getAvailablePositions(dbl(mk(64)))).toEqual([1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49]);
  });

  it("handles non power-of-two fields", () => {
    expect(getAvailablePositions(dbl(mk(2)))).toEqual([1, 2]);
    expect(getAvailablePositions(dbl(mk(3)))).toEqual([1, 2, 3]);
    expect(getAvailablePositions(dbl(mk(7)))).toEqual([1, 2, 3, 4, 5, 7]);
    expect(getAvailablePositions(dbl(mk(11)))).toEqual([1, 2, 3, 4, 5, 7, 9, 11]);
  });

  it("reports how many players share each position", () => {
    const { groups, playerCount, estimated } = getPositionGroups(dbl(mk(8)));
    expect(groups).toEqual([
      { rank: 1, size: 1 }, { rank: 2, size: 1 }, { rank: 3, size: 1 },
      { rank: 4, size: 1 }, { rank: 5, size: 2 }, { rank: 7, size: 2 },
    ]);
    expect(playerCount).toBe(8);
    expect(estimated).toBe(false);
  });

  it("every position group adds up to the number of players", () => {
    for (let n = 2; n <= 64; n++) {
      const { groups } = getPositionGroups(dbl(mk(n)));
      expect(groups.reduce((s, g) => s + g.size, 0), `n=${n}`).toBe(n);
      expect(groups[0].rank).toBe(1);
      groups.reduce((next, g) => { expect(g.rank, `n=${n}`).toBe(next); return next + g.size; }, 1);
    }
  });

  it("ignores participants beyond the maximum", () => {
    expect(getAvailablePositions(dbl(mk(20), 8))).toEqual([1, 2, 3, 4, 5, 7]);
  });

  it("uses the maximum while there are fewer than 2 participants", () => {
    const info = getPositionGroups(dbl([], 16));
    expect(info.estimated).toBe(true);
    expect(info.playerCount).toBe(16);
    expect(info.groups.map((g) => g.rank)).toEqual([1, 2, 3, 4, 5, 7, 9, 13]);
    expect(getPositionGroups(dbl(mk(1), 8)).estimated).toBe(true);
  });

  it("does not restrict single elimination", () => {
    expect(getAvailablePositions({ bracketType: "single", maxParticipants: 8, participants: mk(8) })).toBeNull();
    expect(getAvailablePositions(null)).toBeNull();
  });
});

describe("getAvailablePositions - Final Championship", () => {
  it("follows the tier-aware bracket", () => {
    const positions = getAvailablePositions(fc(mk(10, 3, 2)));
    expect(positions[0]).toBe(1);
    expect(positions).toContain(3);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(getPositionGroups(fc(mk(10, 3, 2))).groups.reduce((s, g) => s + g.size, 0)).toBe(15);
  });
});

// The positions must describe what rankings really produce, whoever wins.
describe("positions are independent of the results", () => {
  const cases = [
    ["standard", (n) => generateDoubleEliminationBracket(mk(n), 64, "ft2"), (n) => dbl(mk(n))],
    ["final championship", (n, seed) => generateFinalChampionshipBracket(mk(n - 4, 3, 1), 64, seeded(seed)), (n) => fc(mk(n - 4, 3, 1))],
  ];
  for (const [name, make, tournament] of cases) {
    it(`${name}: random playouts always end on the announced positions`, () => {
      for (let n = 6; n <= 40; n++) {
        const expected = getAvailablePositions(tournament(n));
        for (const seed of [1, 2, 3, 4]) {
          const rng = seeded(n * 31 + seed);
          const o = Math.random;
          Math.random = rng;
          const generated = make(n, seed);
          Math.random = o;
          const { ms } = playRandom(generated, rng);
          const players = tournament(n).participants;
          const got = computeRankings(ms, "double", null, players).map((e) => e.rank);
          expect(got, `${name} n=${n} seed=${seed}`).toEqual(expected);
        }
      }
    });
  }
});

describe("same losers round = same position and same points", () => {
  it("players knocked out in the same round share rank and points; later exits never rank worse", () => {
    // Distinct points for every rank so a wrong grouping would show up as different points.
    const rankScores = Array.from({ length: 64 }, (_, i) => 1000 - i * 10);
    for (let n = 3; n <= 40; n++) {
      for (const seed of [1, 2, 3]) {
        const rng = seeded(n * 7 + seed);
        const o = Math.random;
        Math.random = rng;
        const generated = generateDoubleEliminationBracket(mk(n), 64, "ft2");
        Math.random = o;
        const { ms, exit } = playRandom(generated, rng);
        const ranking = computeRankings(ms, "double", rankScores, mk(n));
        const rankOf = {};
        const pointsOf = {};
        for (const e of ranking) for (const p of e.players) { rankOf[p.name] = e.rank; pointsOf[p.name] = e.points; }
        expect(Object.keys(rankOf).length).toBe(n);

        const names = Object.keys(exit);
        for (const a of names) {
          expect(pointsOf[a]).toBe(rankScores[rankOf[a] - 1]);
          for (const b of names) {
            const label = `n=${n} seed=${seed} ${a}/${b}`;
            if (exit[a] === exit[b]) {
              expect(rankOf[a], label).toBe(rankOf[b]);
              expect(pointsOf[a], label).toBe(pointsOf[b]);
            } else if (exit[a] > exit[b]) {
              expect(rankOf[a], label).toBeLessThan(rankOf[b]);
            }
          }
        }
      }
    }
  });

  it("keeps the podium unchanged: champion, runner-up, third and fourth are single players", () => {
    const o = Math.random;
    const rng = seeded(5);
    Math.random = rng;
    const generated = generateDoubleEliminationBracket(mk(16), 64, "ft2");
    Math.random = o;
    const { ms } = playRandom(generated, rng);
    const r = computeRankings(ms, "double", null, mk(16));
    expect(r.slice(0, 4).map((e) => [e.rank, e.players.length, e.label])).toEqual([
      [1, 1, "Champion"], [2, 1, "Runner-up"], [3, 1, "Third Place"], [4, 1, "Fourth Place"],
    ]);
    expect(r[4].displayRank).toBe("5th-6th");
  });
});
