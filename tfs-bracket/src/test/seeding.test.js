import { describe, it, expect } from "vitest";
import { generateBracket, generateDoubleEliminationBracket, advanceBracket } from "../utils/bracket";
import { generateFinalChampionshipBracket } from "../utils/finalChampionship";
import { seedParticipants, standardOrder, hasSeeds } from "../utils/seeding";

function rngOf(seed) {
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
// Player "P{k}" has seed k (P1 = best).
const seededPlayers = (n, tier = () => "regular", offset = 0) =>
  Array.from({ length: n }, (_, i) => ({ id: `u${offset + i + 1}`, name: `P${offset + i + 1}`, seed: offset + i + 1, tier: tier(i) }));
const seedOf = (name) => Number(name.slice(1));

// The better seed always wins.
function playFavourites(matches) {
  let ms = matches;
  const losses = {};
  for (let g = 0; g < 2000; g++) {
    const idx = ms.findIndex((m) => m.winner == null && real(m.player1) && real(m.player2));
    if (idx < 0) break;
    const m = ms[idx];
    const w = seedOf(m.player1) < seedOf(m.player2) ? 0 : 1;
    const l = w === 0 ? m.player2 : m.player1;
    losses[l] = (losses[l] || 0) + 1;
    ms = advanceBracket(ms, idx, w, { p1Score: w === 0 ? 2 : 0, p2Score: w === 1 ? 2 : 0 });
  }
  return { ms, losses };
}

describe("seedParticipants", () => {
  const people = ["a", "b", "c", "d", "e"].map((id) => ({ id, name: id.toUpperCase() }));
  it("ranks by score, best first, keeps input order and does not mutate", () => {
    const out = seedParticipants(people, { a: 10, c: 50, e: 30 }, rngOf(1));
    expect(out.map((p) => p.id)).toEqual(["a", "b", "c", "d", "e"]);
    expect(out.find((p) => p.id === "c").seed).toBe(1);
    expect(out.find((p) => p.id === "e").seed).toBe(2);
    expect(out.find((p) => p.id === "a").seed).toBe(3);
    expect(people[0].seed).toBeUndefined();
  });
  it("players without score share the lowest seeds, in random order", () => {
    const seen = new Set();
    for (let s = 1; s <= 30; s++) {
      const out = seedParticipants(people, { a: 10 }, rngOf(s));
      expect(out.find((p) => p.id === "a").seed).toBe(1);
      seen.add(out.find((p) => p.id === "b").seed);
    }
    expect(seen.size).toBeGreaterThan(1);
    expect([...seen].every((x) => x >= 2 && x <= 5)).toBe(true);
  });
  it("hasSeeds needs every player seeded", () => {
    expect(hasSeeds(seededPlayers(3))).toBe(true);
    expect(hasSeeds([{ seed: 1 }, {}])).toBe(false);
    expect(hasSeeds([])).toBe(false);
  });
  it("standardOrder", () => {
    expect(standardOrder(2)).toEqual([1, 2]);
    expect(standardOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
  });
});

describe("seeded single / double elimination", () => {
  it("8 players: 1v8, 4v5, 2v7, 3v6", () => {
    for (const gen of [generateBracket, generateDoubleEliminationBracket]) {
      const r1 = gen(seededPlayers(8), 8, "ft3").filter((m) => /^(wb-)?r1-m/.test(m.id));
      expect(r1.map((m) => `${m.player1}v${m.player2}`)).toEqual(["P1vP8", "P4vP5", "P2vP7", "P3vP6"]);
    }
  });

  it("20 players: top 12 get a bye, 13v20 14v19 15v18 16v17 play round 1, seed 1 meets the 16v17 winner", () => {
    for (const [gen, pre] of [[generateBracket, ""], [generateDoubleEliminationBracket, "wb-"]]) {
      const ms = gen(seededPlayers(20), 20, "ft3");
      const r1 = ms.filter((m) => m.id.startsWith(`${pre}r1-`));
      expect(r1.map((m) => `${m.player1}v${m.player2}`)).toEqual(["P13vP20", "P14vP19", "P15vP18", "P16vP17"]);
      const r2 = ms.filter((m) => m.id.startsWith(`${pre}r2-`));
      expect(r2).toHaveLength(8);
      const named = r2.flatMap((m) => [m.player1, m.player2]).filter(real);
      expect(named.map(seedOf).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
      const first = r2[0];
      expect(first.player1).toBe("P1");
      expect(first.prevMatch2).toBe(`${pre}r1-m3`); // seed 1 faces the winner of 16v17
    }
  });

  it.each([2, 3, 4, 5, 7, 8, 11, 16, 20, 24, 33, 50, 64])("n=%i: favourites win -> seed 1 champion, 1v2 final, losers lose twice", (n) => {
    const ms = generateDoubleEliminationBracket(seededPlayers(n), 64, "ft3");
    const { ms: done, losses } = playFavourites(ms);
    expect(done.find((m) => m.id === "gf-m0").winner).toBe(0);
    expect(done.find((m) => m.id === "gf-m0").player1).toBe("P1");
    if (n >= 4) {
      const wbFinal = done.filter((m) => m.bracket === "winners").sort((a, b) => b.round - a.round)[0];
      expect([wbFinal.player1, wbFinal.player2].sort()).toEqual(["P1", "P2"]);
    }
    expect(Object.values(losses).every((c) => c === 2)).toBe(true);
    expect(Object.keys(losses)).toHaveLength(n - 1);
  });

  it.each([2, 5, 8, 13, 32, 50])("single elimination n=%i plays out with seed 1 winning", (n) => {
    const { ms } = playFavourites(generateBracket(seededPlayers(n), 64, "ft3"));
    const last = ms.reduce((a, b) => (b.round > a.round ? b : a));
    expect(last.winner != null && [last.player1, last.player2][last.winner]).toBe("P1");
  });

  it("without seeds the draw is still random and complete", () => {
    const plain = Array.from({ length: 12 }, (_, i) => ({ id: `x${i}`, name: `X${i}` }));
    const ms = generateDoubleEliminationBracket(plain, 12, "ft3");
    expect(ms.length).toBeGreaterThan(0);
  });
});

describe("seeded Final Championship", () => {
  const field = (reg, win, champ) => [
    ...seededPlayers(reg, () => "regular"),
    ...seededPlayers(win, () => "winner", reg),
    ...seededPlayers(champ, () => "champion", reg + win),
  ];
  const entryRound = (ms, name) => Math.min(...ms.filter((m) => m.bracket === "winners" && (m.player1 === name || m.player2 === name)).map((m) => m.round));

  it("24 players (20 regular, 2 winners, 2 champions): winners start round 3, champions round 4", () => {
    const ms = generateFinalChampionshipBracket(field(20, 2, 2), 64, rngOf(3));
    expect(entryRound(ms, "P21")).toBe(3);
    expect(entryRound(ms, "P22")).toBe(3);
    expect(entryRound(ms, "P23")).toBe(4);
    expect(entryRound(ms, "P24")).toBe(4);
    const r1 = ms.filter((m) => m.id.startsWith("wb-r1-"));
    expect(r1.map((m) => `${m.player1}v${m.player2}`).sort()).toEqual(["P13vP20", "P14vP19", "P15vP18", "P16vP17"].sort());
    expect(entryRound(ms, "P1")).toBe(2);
    expect(entryRound(ms, "P12")).toBe(2);
  });

  it("regular field a power of two keeps winners round 2, champions round 3", () => {
    const ms = generateFinalChampionshipBracket(field(16, 2, 2), 64, rngOf(4));
    expect(entryRound(ms, "P1")).toBe(1);
    expect(entryRound(ms, "P17")).toBe(2);
    expect(entryRound(ms, "P19")).toBe(3);
    const r1 = ms.filter((m) => m.id.startsWith("wb-r1-")).map((m) => `${m.player1}v${m.player2}`);
    expect(r1).toContain("P1vP16");
  });

  it.each([[2, 0, 0], [5, 1, 1], [7, 2, 1], [11, 3, 2], [20, 2, 2], [16, 4, 4], [3, 0, 2], [0, 2, 2], [13, 0, 0]])(
    "%i regular / %i winners / %i champions: plays out, everyone loses twice but the champion",
    (r, w, c) => {
      const players = field(r, w, c);
      const ms = generateFinalChampionshipBracket(players, 64, rngOf(r * 7 + w));
      if (players.length < 2) return;
      const { ms: done, losses } = playFavourites(ms);
      const active = done.filter((m) => !(m.isGrandFinalReset && m.player1 === "TBD"));
      expect(active.every((m) => m.winner != null)).toBe(true);
      expect(Object.keys(losses)).toHaveLength(players.length - 1);
      expect(Object.values(losses).every((x) => x === 2)).toBe(true);
    }
  );

  it("without seeds the previous entry rounds (1/2/3) are unchanged", () => {
    const plain = field(20, 2, 2).map(({ seed, ...p }) => p); // eslint-disable-line no-unused-vars
    const ms = generateFinalChampionshipBracket(plain, 64, rngOf(5));
    expect(entryRound(ms, "P21")).toBe(2);
    expect(entryRound(ms, "P23")).toBe(3);
  });
});
