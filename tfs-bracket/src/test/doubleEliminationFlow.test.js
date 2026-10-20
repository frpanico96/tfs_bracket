import { describe, it, expect } from "vitest";
import { generateDoubleEliminationBracket, advanceBracket } from "../utils/bracket";
import { addNames, removeName, renameName } from "../utils/participants";

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

// Guards the BYE / losers-bracket propagation: every field size from 2 to 64 must
// play out to a single champion, and everyone else must lose exactly twice.
describe("standard double elimination - full playthrough", () => {
  it("completes for every field size 2-64 with exactly two losses per non-champion", () => {
    for (let n = 2; n <= 64; n++) {
      const players = Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));
      const rng = seeded(n * 17);
      const realRandom = Math.random;
      Math.random = rng;
      let matches = generateDoubleEliminationBracket(players, 64, "ft3");
      Math.random = realRandom;

      const losses = {};
      let done = false;
      for (let guard = 0; guard < 1000 && !done; guard++) {
        const active = matches.filter((m) => !(m.isGrandFinalReset && m.player1 === "TBD"));
        if (active.every((m) => m.winner != null)) { done = true; break; }
        const idx = matches.findIndex((m) => m.winner == null && real(m.player1) && real(m.player2));
        if (idx === -1) break;
        const m = matches[idx];
        const w = rng() < 0.5 ? 0 : 1;
        const loser = w === 0 ? m.player2 : m.player1;
        losses[loser] = (losses[loser] || 0) + 1;
        matches = advanceBracket(matches, idx, w, { p1Score: w === 0 ? 2 : 0, p2Score: w === 1 ? 2 : 0 });
      }
      expect(done, `n=${n} stuck`).toBe(true);
      const twoLosses = Object.values(losses).filter((c) => c === 2).length;
      expect(twoLosses, `n=${n}`).toBe(n - 1);
      expect(Object.values(losses).every((c) => c <= 2), `n=${n}`).toBe(true);
    }
  });
});

describe("participant name set helpers", () => {
  it("adds one or many names lowercased without mutating the input", () => {
    const input = { ann: true };
    expect(addNames(input, "Bob")).toEqual({ ann: true, bob: true });
    expect(addNames(input, ["Cat", "DAN"])).toEqual({ ann: true, cat: true, dan: true });
    expect(input).toEqual({ ann: true });
  });

  it("tolerates a missing set", () => {
    expect(addNames(undefined, "Ann")).toEqual({ ann: true });
    expect(removeName(undefined, "Ann")).toEqual({});
  });

  it("removes and renames", () => {
    expect(removeName({ ann: true, bob: true }, "ANN")).toEqual({ bob: true });
    expect(renameName({ ann: true, bob: true }, "Ann", "Zed")).toEqual({ bob: true, zed: true });
    expect(renameName({ ann: true }, "Ann", "ANN")).toEqual({ ann: true });
  });
});
