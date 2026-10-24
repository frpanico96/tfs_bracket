import { describe, it, expect } from "vitest";
import {
  generateBracket,
  generateDoubleEliminationBracket,
  advanceBracket,
  swapPlayers,
} from "../utils/bracket";
import { generateFinalChampionshipBracket } from "../utils/finalChampionship";
import { swapSlots, isSwappableSlot, feederLabel } from "../utils/swap";

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
const mk = (n, tier = "regular") => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i + 1}`, tier }));

function withSeed(seed, fn) {
  const o = Math.random;
  Math.random = seeded(seed);
  try { return fn(); } finally { Math.random = o; }
}

// 11 players: 3 preliminaries, round 2 mixes TBD (fed by a prelim) and named slots.
const double11 = () => withSeed(1, () => generateDoubleEliminationBracket(mk(11), 64, "ft3"));
const byId = (ms, id) => ms.find((m) => m.id === id);
const slotOf = (m, s) => (s === 0 ? m.player1 : m.player2);
const prevOf = (m, s) => (s === 0 ? m.prevMatch1 : m.prevMatch2);

describe("swapSlots - named players (unchanged behaviour)", () => {
  it("returns exactly what swapPlayers returns for two named slots", () => {
    const ms = double11();
    const named = [];
    for (const m of ms) for (const s of [0, 1]) if (real(slotOf(m, s))) named.push([m.id, s]);
    for (let i = 0; i < named.length; i++) {
      for (let j = 0; j < named.length; j++) {
        const [a, sa] = named[i];
        const [b, sb] = named[j];
        expect(swapSlots(ms, a, sa, b, sb)).toEqual(swapPlayers(ms, a, sa, b, sb));
      }
    }
  });
});

describe("swapSlots - TBD slots", () => {
  it("moves a named round-2 player into a TBD slot and re-routes the feeder", () => {
    const ms = double11();
    expect(slotOf(byId(ms, "wb-r2-m0"), 0)).toBe("TBD");
    expect(prevOf(byId(ms, "wb-r2-m0"), 0)).toBe("wb-r1-m0");
    const named = slotOf(byId(ms, "wb-r2-m1"), 1);
    expect(real(named)).toBe(true);
    const otherSide = slotOf(byId(ms, "wb-r2-m0"), 1);

    // wb-r2-m1 slot 1 (named P4) <-> wb-r2-m0 slot 0 (TBD, fed by wb-r1-m0)
    const out = swapSlots(ms, "wb-r2-m1", 1, "wb-r2-m0", 0);
    expect(out).not.toBe(ms);

    const a = byId(out, "wb-r2-m0");
    const b = byId(out, "wb-r2-m1");
    expect([slotOf(a, 0), prevOf(a, 0)]).toEqual([named, null]);
    expect([slotOf(b, 1), prevOf(b, 1)]).toEqual(["TBD", "wb-r1-m0"]);

    // The prelim winner now lands in the other match.
    const idx = out.findIndex((m) => m.id === "wb-r1-m0");
    const winner = out[idx].player1;
    const adv = advanceBracket(out, idx, 0, { p1Score: 3, p2Score: 0 });
    expect(byId(adv, "wb-r2-m1").player2).toBe(winner);
    expect(byId(adv, "wb-r2-m0").player1).toBe(named);
    expect(byId(adv, "wb-r2-m0").player2).toBe(otherSide);
  });

  it("swaps two TBD slots (exchanges which prelim feeds which match)", () => {
    const ms = double11();
    const out = swapSlots(ms, "wb-r2-m0", 0, "wb-r2-m1", 0);
    expect(prevOf(byId(out, "wb-r2-m0"), 0)).toBe("wb-r1-m1");
    expect(prevOf(byId(out, "wb-r2-m1"), 0)).toBe("wb-r1-m0");
  });

  it("flips a TBD slot with the named slot of the same match", () => {
    const ms = double11();
    const named = slotOf(byId(ms, "wb-r2-m0"), 1);
    const out = swapSlots(ms, "wb-r2-m0", 0, "wb-r2-m0", 1);
    const m = byId(out, "wb-r2-m0");
    expect([m.player1, m.prevMatch1, m.player2, m.prevMatch2]).toEqual([named, null, "TBD", "wb-r1-m0"]);
  });

  it("does not mutate its input and keeps every other match untouched", () => {
    const ms = double11();
    const snapshot = JSON.stringify(ms);
    const out = swapSlots(ms, "wb-r2-m1", 1, "wb-r2-m0", 0);
    expect(JSON.stringify(ms)).toBe(snapshot);
    for (const m of out) {
      if (m.id === "wb-r2-m0" || m.id === "wb-r2-m1") continue;
      expect(m).toEqual(byId(ms, m.id));
    }
  });

  it("works in single elimination too", () => {
    const ms = withSeed(2, () => generateBracket(mk(11), 64, "ft3"));
    const tbd = ms.find((m) => m.round === 2 && m.player1 === "TBD" && m.prevMatch1);
    const named = ms.find((m) => m.round === 2 && m.id !== tbd.id && real(m.player1) && real(m.player2));
    expect(named).toBeTruthy();
    const out = swapSlots(ms, tbd.id, 0, named.id, 0);
    expect(out).not.toBe(ms);
    expect(byId(out, named.id).prevMatch1).toBe(tbd.prevMatch1);
  });
});

describe("swapSlots - refusals return the same array", () => {
  const ms = double11();
  const refused = (...args) => expect(swapSlots(ms, ...args)).toBe(ms);

  it("refuses a TBD slot against another round", () => {
    refused("wb-r2-m0", 0, "wb-r1-m0", 0); // TBD (round 2) <-> named (round 1)
    refused("wb-r2-m3", 0, "wb-r3-m0", 0); // named (round 2) <-> TBD (round 3)
  });

  it("refuses slots of the losers bracket or grand final that are TBD", () => {
    const lb = ms.find((m) => m.bracket === "losers" && m.player1 === "TBD");
    refused(lb.id, 0, "wb-r2-m3", 0);
    refused("gf-m0", 0, "wb-r2-m3", 0);
  });

  it("refuses BYE slots, unknown matches and a slot against itself", () => {
    const withBye = ms.map((m) => (m.id === "wb-r2-m3" ? { ...m, player2: "BYE" } : m));
    expect(swapSlots(withBye, "wb-r2-m3", 1, "wb-r2-m2", 1)).toBe(withBye);
    refused("nope", 0, "wb-r2-m0", 0);
    refused("wb-r2-m0", 0, "wb-r2-m0", 0);
  });

  it("refuses once a related match has been played", () => {
    const playedFeeder = ms.map((m) => (m.id === "wb-r1-m0" ? { ...m, isPlayed: true, winner: 0 } : m));
    expect(swapSlots(playedFeeder, "wb-r2-m0", 0, "wb-r2-m3", 0)).toBe(playedFeeder);
    const playedMatch = ms.map((m) => (m.id === "wb-r2-m3" ? { ...m, isPlayed: true, winner: 0 } : m));
    expect(swapSlots(playedMatch, "wb-r2-m0", 0, "wb-r2-m3", 0)).toBe(playedMatch);
  });
});

describe("isSwappableSlot / feederLabel", () => {
  const ms = double11();
  it("accepts named slots and fed TBD slots of the winners side only", () => {
    expect(isSwappableSlot(byId(ms, "wb-r2-m0"), 1)).toBe(true);
    expect(isSwappableSlot(byId(ms, "wb-r2-m0"), 0)).toBe(true);
    expect(isSwappableSlot(byId(ms, "gf-m0"), 0)).toBe(false);
    expect(isSwappableSlot({ id: "x", player1: "BYE", player2: "A" }, 0)).toBe(false);
    expect(isSwappableSlot({ id: "x", player1: "TBD", player2: "A" }, 0)).toBe(false);
    expect(isSwappableSlot(undefined, 0)).toBe(false);
  });
  it("labels feeders", () => {
    expect(feederLabel("wb-r1-m2")).toBe("Winner R1 #3");
    expect(feederLabel("r2-m0")).toBe("Winner R2 #1");
    expect(feederLabel(null)).toBeNull();
    expect(feederLabel("gf-m0")).toBeNull();
  });
});

// Property test: whatever sequence of swaps is accepted, the bracket must stay a
// valid tree that plays out completely.
describe("swapSlots - brackets stay playable after random swaps", () => {
  function allSlots(ms) {
    const out = [];
    for (const m of ms) for (const s of [0, 1]) if (isSwappableSlot(m, s)) out.push([m.id, s]);
    return out;
  }

  function playOut(initial, rng) {
    let ms = initial;
    const losses = {};
    for (let guard = 0; guard < 2000; guard++) {
      const active = ms.filter((m) => !(m.isGrandFinalReset && m.player1 === "TBD"));
      if (active.every((m) => m.winner != null)) return { ms, losses, done: true };
      const idx = ms.findIndex((m) => m.winner == null && real(m.player1) && real(m.player2));
      if (idx === -1) return { ms, losses, done: false };
      const m = ms[idx];
      const w = rng() < 0.5 ? 0 : 1;
      const loser = w === 0 ? m.player2 : m.player1;
      losses[loser] = (losses[loser] || 0) + 1;
      ms = advanceBracket(ms, idx, w, { p1Score: w === 0 ? 2 : 0, p2Score: w === 1 ? 2 : 0 });
    }
    return { ms, losses, done: false };
  }

  // Every winners-side match feeds at most one slot, and no slot has two feeders.
  function feedersAreUnique(ms) {
    const seen = new Set();
    for (const m of ms) {
      if (m.bracket === "losers") continue;
      for (const p of [m.prevMatch1, m.prevMatch2]) {
        if (!p || (m.bracket === "grandFinal" && m.isGrandFinalReset)) continue;
        const key = `${m.bracket === "grandFinal" ? "gf" : "wb"}:${p}`;
        if (m.bracket !== "grandFinal" && seen.has(key)) return false;
        seen.add(key);
      }
    }
    return true;
  }

  const makers = {
    double: (n, seed) => withSeed(seed, () => generateDoubleEliminationBracket(mk(n), 64, "ft3")),
    single: (n, seed) => withSeed(seed, () => generateBracket(mk(n), 64, "ft3")),
    fc: (n, seed) => {
      const players = mk(n);
      players.forEach((p, i) => { p.tier = i % 7 === 0 ? "champion" : i % 4 === 0 ? "winner" : "regular"; });
      return generateFinalChampionshipBracket(players, 64, seeded(seed));
    },
  };

  for (const [kind, make] of Object.entries(makers)) {
    it(`${kind}: random swaps never break the tournament`, () => {
      let accepted = 0;
      let tbdAccepted = 0;
      for (let n = 3; n <= 40; n++) {
        for (const seed of [1, 2]) {
          const rng = seeded(n * 101 + seed);
          let ms = make(n, seed);
          if (ms.length === 0) continue;
          const names = ms.flatMap((m) => [m.player1, m.player2]).filter(real).sort();
          for (let k = 0; k < 12; k++) {
            const slots = allSlots(ms);
            const [a, sa] = slots[Math.floor(rng() * slots.length)];
            const [b, sb] = slots[Math.floor(rng() * slots.length)];
            const wasTbd = !real(slotOf(byId(ms, a), sa)) || !real(slotOf(byId(ms, b), sb));
            const next = swapSlots(ms, a, sa, b, sb);
            if (next !== ms) { accepted++; if (wasTbd) tbdAccepted++; }
            ms = next;
          }
          const label = `${kind} n=${n} seed=${seed}`;
          expect(ms.flatMap((m) => [m.player1, m.player2]).filter(real).sort(), label).toEqual(names);
          expect(feedersAreUnique(ms), label).toBe(true);

          const res = playOut(ms, rng);
          expect(res.done, label).toBe(true);
          if (kind !== "single") {
            const out = Object.values(res.losses).filter((c) => c === 2).length;
            expect(out, label).toBe(names.length - 1);
          }
        }
      }
      expect(accepted).toBeGreaterThan(100);
      expect(tbdAccepted).toBeGreaterThan(20);
    });
  }
});
