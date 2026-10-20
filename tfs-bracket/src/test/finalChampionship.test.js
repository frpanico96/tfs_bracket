import { describe, it, expect } from "vitest";
import { advanceBracket, computeRankings } from "../utils/bracket";
import {
  generateFinalChampionshipBracket,
  initPickBan,
  applyPickBanStep,
  undoPickBanStep,
  getNextAction,
  getRemainingGames,
  getPlayOrder,
  isPickBanComplete,
  minPoolSize,
  validateSetScore,
  appendSet,
  removeLastSet,
  getMatchProgress,
  getFcRoundName,
  getTier,
  getSetTarget,
  canSwapSlots,
} from "../utils/finalChampionship";

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

function makePlayers(r, w, c) {
  const out = [];
  let n = 0;
  for (let i = 0; i < r; i++) out.push({ id: `p${n}`, name: `R${n++}`, tier: "regular" });
  for (let i = 0; i < w; i++) out.push({ id: `p${n}`, name: `W${n++}`, tier: "winner" });
  for (let i = 0; i < c; i++) out.push({ id: `p${n}`, name: `C${n++}`, tier: "champion" });
  return out;
}

const real = (p) => p && p !== "TBD" && p !== "BYE";

// Plays every playable match with random winners until the tournament is done.
function playOut(initial, rng) {
  let matches = initial;
  const losses = {};
  for (let guard = 0; guard < 1000; guard++) {
    const active = matches.filter((m) => !(m.isGrandFinalReset && m.player1 === "TBD"));
    if (active.every((m) => m.winner != null)) return { matches, losses, complete: true };
    const idx = matches.findIndex(
      (m) => m.winner == null && real(m.player1) && real(m.player2)
    );
    if (idx === -1) return { matches, losses, complete: false };
    const m = matches[idx];
    const w = rng() < 0.5 ? 0 : 1;
    const loser = w === 0 ? m.player2 : m.player1;
    losses[loser] = (losses[loser] || 0) + 1;
    matches = advanceBracket(matches, idx, w, { p1Score: w === 0 ? 2 : 0, p2Score: w === 1 ? 2 : 0 });
  }
  return { matches, losses, complete: false };
}

function champion(matches) {
  const gf0 = matches.find((m) => m.id === "gf-m0");
  const gf1 = matches.find((m) => m.id === "gf-m1");
  if (gf1 && real(gf1.player1) && gf1.winner != null) return gf1.winner === 0 ? gf1.player1 : gf1.player2;
  return gf0.winner === 0 ? gf0.player1 : gf0.player2;
}

describe("generateFinalChampionshipBracket", () => {
  it("places Winners one round and Champions two rounds after regulars", () => {
    const matches = generateFinalChampionshipBracket(makePlayers(16, 4, 2), 64, seeded(1));
    const wb = (r) => matches.filter((m) => m.bracket === "winners" && m.round === r);
    const names = (ms) => ms.flatMap((m) => [m.player1, m.player2]);

    expect(wb(1)).toHaveLength(8);
    expect(names(wb(1)).every((n) => n.startsWith("R"))).toBe(true);
    expect(names(wb(2)).filter((n) => n.startsWith("W"))).toHaveLength(4);
    expect(names(wb(2)).some((n) => n.startsWith("C"))).toBe(false);
    expect(names(wb(3)).filter((n) => n.startsWith("C"))).toHaveLength(2);
  });

  it("works with only regular participants (plain double elimination shape)", () => {
    const matches = generateFinalChampionshipBracket(makePlayers(8, 0, 0), 64, seeded(2));
    expect(matches.filter((m) => m.bracket === "winners" && m.round === 1)).toHaveLength(4);
    expect(matches.some((m) => m.id === "gf-m0")).toBe(true);
    expect(matches.some((m) => m.id === "gf-m1")).toBe(true);
  });

  it("returns an empty bracket for fewer than two participants", () => {
    expect(generateFinalChampionshipBracket(makePlayers(1, 0, 0), 64, seeded(3))).toEqual([]);
  });

  it("treats participants without a tier as regular", () => {
    expect(getTier({ name: "x" })).toBe("regular");
    expect(getTier({ name: "x", tier: "bogus" })).toBe("regular");
  });

  it("respects the max participants cap", () => {
    const matches = generateFinalChampionshipBracket(makePlayers(10, 0, 0), 4, seeded(4));
    const names = new Set(matches.flatMap((m) => [m.player1, m.player2]).filter(real));
    expect(names.size).toBe(4);
  });

  it("does not make Champions meet each other in their entry round when avoidable", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const matches = generateFinalChampionshipBracket(makePlayers(16, 4, 2), 64, seeded(seed));
      const wb3 = matches.filter((m) => m.bracket === "winners" && m.round === 3);
      expect(wb3.some((m) => m.player1.startsWith("C") && m.player2.startsWith("C"))).toBe(false);
    }
  });

  it("assigns formats by phase: FT2 early, FT3 semis, FT5 finals and grand final", () => {
    const matches = generateFinalChampionshipBracket(makePlayers(16, 4, 2), 64, seeded(5));
    const wbRounds = [...new Set(matches.filter((m) => m.bracket === "winners").map((m) => m.round))];
    const lbRounds = [...new Set(matches.filter((m) => m.bracket === "losers").map((m) => m.round))];
    const wc = (b, r) => matches.find((m) => m.bracket === b && m.round === r).winCondition;
    const maxWb = Math.max(...wbRounds);
    const maxLb = Math.max(...lbRounds);

    expect(wc("winners", maxWb)).toBe("ft5");
    expect(wc("winners", maxWb - 1)).toBe("ft3");
    expect(wc("winners", 1)).toBe("ft2");
    expect(wc("losers", maxLb)).toBe("ft5");
    expect(wc("losers", maxLb - 1)).toBe("ft3");
    expect(wc("losers", 1)).toBe("ft2");
    expect(matches.find((m) => m.id === "gf-m0").winCondition).toBe("ft5");
    expect(matches.find((m) => m.id === "gf-m1").winCondition).toBe("ft5");
    expect(matches.every((m) => Array.isArray(m.sets) && m.pickBan === null && m.setFt === 3)).toBe(true);
  });

  it("names rounds from their phase", () => {
    const matches = generateFinalChampionshipBracket(makePlayers(16, 4, 2), 64, seeded(6));
    const names = new Set(matches.map(getFcRoundName));
    for (const n of ["Winners Final", "Winners Semifinal", "Losers Final", "Losers Semifinal", "Grand Final", "Grand Final Reset"]) {
      expect(names.has(n)).toBe(true);
    }
  });

  it("completes and crowns exactly one champion for every tier mix", () => {
    const configs = [];
    for (let r = 0; r <= 14; r++) {
      for (let w = 0; w <= 6; w++) {
        for (let c = 0; c <= 5; c++) {
          if (r + w + c >= 2) configs.push([r, w, c]);
        }
      }
    }
    configs.push([40, 8, 4], [31, 3, 2], [20, 3, 2], [1, 0, 3], [0, 0, 2], [0, 5, 0], [0, 3, 3]);

    for (const [r, w, c] of configs) {
      for (const seed of [1, 2, 3]) {
        const players = makePlayers(r, w, c);
        const generated = generateFinalChampionshipBracket(players, 64, seeded(seed));
        const result = playOut(generated, seeded(seed * 7));
        const label = `R=${r} W=${w} C=${c} seed=${seed}`;

        expect(result.complete, label).toBe(true);
        expect(players.map((p) => p.name), label).toContain(champion(result.matches));
        // Double elimination: everyone but the champion is out with exactly two
        // losses, and nobody is left stranded alive.
        const champ = champion(result.matches);
        for (const p of players) {
          const expected = p.name === champ ? undefined : 2;
          if (expected) expect(result.losses[p.name] || 0, `${label} ${p.name}`).toBe(2);
          else expect(result.losses[p.name] || 0, `${label} champion`).toBeLessThanOrEqual(1);
        }
        const ranks = computeRankings(result.matches, "double", null, players, { rankByLosersExit: true });
        expect(ranks[0]?.players[0]?.name, label).toBe(champ);
        const ranked = ranks.flatMap((e) => e.players.map((q) => q.name));
        expect(new Set(ranked).size, label).toBe(players.length);
        const appearing = new Set(result.matches.flatMap((m) => [m.player1, m.player2]).filter(real));
        expect(appearing.size, label).toBe(players.length);
      }
    }
  });
});

describe("pick/ban engine", () => {
  const pool = Array.from({ length: 11 }, (_, i) => ({ id: `g${i}`, name: `Game ${i}`, image: "x" }));

  function run(template, rng = () => 0) {
    let pb = initPickBan(template, pool);
    const log = [];
    while (getNextAction(pb)) {
      const next = getNextAction(pb);
      const game = getRemainingGames(pb)[0];
      log.push(`${next.action}:${next.player}`);
      pb = applyPickBanStep(pb, game.id, rng);
    }
    return { pb, log };
  }

  it("FT2 follows ban/ban/pick/pick/ban/ban then a random decider from the remaining 5", () => {
    const { pb, log } = run("ft2");
    expect(log).toEqual(["ban:0", "ban:1", "pick:0", "pick:1", "ban:0", "ban:1"]);
    expect(isPickBanComplete(pb)).toBe(true);
    expect(getPlayOrder(pb)).toHaveLength(3);
    const decider = pb.steps[pb.steps.length - 1];
    expect(decider.action).toBe("decider");
    // 11 in pool - 6 used = 5 candidates; rng()=0 -> first of them
    expect(decider.game.id).toBe("g6");
  });

  it("FT3 follows the 8 manual steps and draws the decider from the remaining 3", () => {
    const { pb, log } = run("ft3", () => 0.99);
    expect(log).toEqual(["ban:0", "ban:1", "pick:0", "pick:1", "ban:0", "ban:1", "pick:0", "pick:1"]);
    expect(getPlayOrder(pb)).toHaveLength(5);
    expect(pb.steps[pb.steps.length - 1].game.id).toBe("g10");
  });

  it("FT5 follows the 10 manual steps and the last remaining game is the decider", () => {
    const { pb, log } = run("ft5");
    expect(log).toEqual([
      "pick:0", "pick:1", "ban:0", "ban:1", "pick:0", "pick:1", "pick:0", "pick:1", "pick:0", "pick:1",
    ]);
    expect(getPlayOrder(pb)).toHaveLength(9);
    expect(pb.steps[pb.steps.length - 1]).toMatchObject({ action: "decider", game: { id: "g10" } });
  });

  it("plays picks in the order they were made and the decider last", () => {
    let pb = initPickBan("ft2", pool);
    for (const id of ["g0", "g1", "g2", "g3", "g4", "g5"]) pb = applyPickBanStep(pb, id, () => 0);
    expect(getPlayOrder(pb).slice(0, 2).map((g) => g.id)).toEqual(["g2", "g3"]);
  });

  it("rejects games that are not in the pool or were already used", () => {
    let pb = initPickBan("ft2", pool);
    expect(() => applyPickBanStep(pb, "nope")).toThrow();
    pb = applyPickBanStep(pb, "g0");
    expect(() => applyPickBanStep(pb, "g0")).toThrow();
  });

  it("rejects steps once complete", () => {
    const { pb } = run("ft2");
    expect(() => applyPickBanStep(pb, "g10")).toThrow();
  });

  it("undo removes the last manual step and a drawn decider together", () => {
    const { pb } = run("ft2");
    const undone = undoPickBanStep(pb);
    expect(undone.steps).toHaveLength(5);
    expect(isPickBanComplete(undone)).toBe(false);
    expect(getNextAction(undone)).toMatchObject({ action: "ban", player: 1 });
    expect(undoPickBanStep(initPickBan("ft2", pool)).steps).toHaveLength(0);
  });

  it("stores only id and name for pool games", () => {
    expect(initPickBan("ft2", pool).pool[0]).toEqual({ id: "g0", name: "Game 0" });
  });

  it("de-duplicates the pool and enforces the minimum size", () => {
    expect(minPoolSize("ft2")).toBe(7);
    expect(minPoolSize("ft3")).toBe(9);
    expect(minPoolSize("ft5")).toBe(11);
    expect(() => initPickBan("ft5", pool.slice(0, 10))).toThrow();
    expect(() => initPickBan("ft5", [...pool.slice(0, 10), pool[0]])).toThrow();
    expect(() => initPickBan("ft9", pool)).toThrow();
  });
});

describe("sets", () => {
  const pool = Array.from({ length: 11 }, (_, i) => ({ id: `g${i}`, name: `Game ${i}` }));
  function matchWithPickBan(winCondition) {
    let pb = initPickBan(winCondition, pool);
    while (getNextAction(pb)) pb = applyPickBanStep(pb, getRemainingGames(pb)[0].id, () => 0);
    return { winCondition, pickBan: pb, sets: [] };
  }

  it("validates FT3 set scores", () => {
    expect(validateSetScore(3, 0)).toBe(true);
    expect(validateSetScore(1, 3)).toBe(true);
    expect(validateSetScore(3, 3)).toBe(false);
    expect(validateSetScore(2, 2)).toBe(false);
    expect(validateSetScore(4, 0)).toBe(false);
    expect(validateSetScore(-1, 3)).toBe(false);
    expect(validateSetScore(1.5, 3)).toBe(false);
  });

  it("derives set target from the format", () => {
    expect(getSetTarget("ft2")).toBe(2);
    expect(getSetTarget("ft5")).toBe(5);
  });

  it("records sets against the games in play order and decides at the target", () => {
    let m = matchWithPickBan("ft2");
    const order = getPlayOrder(m.pickBan);
    m = { ...m, sets: appendSet(m, 3, 1) };
    expect(m.sets[0]).toMatchObject({ game: order[0], winner: 0 });
    expect(getMatchProgress(m)).toMatchObject({ p1Sets: 1, p2Sets: 0, decided: false, nextSetIndex: 1 });

    m = { ...m, sets: appendSet(m, 0, 3) };
    expect(m.sets[1].game).toEqual(order[1]);
    expect(getMatchProgress(m).decided).toBe(false);

    m = { ...m, sets: appendSet(m, 3, 2) };
    expect(getMatchProgress(m)).toMatchObject({ p1Sets: 2, p2Sets: 1, decided: true, winnerIndex: 0 });
    expect(() => appendSet(m, 3, 0)).toThrow();
  });

  it("ends an FT2 match 2-0 without needing the decider", () => {
    let m = matchWithPickBan("ft2");
    m = { ...m, sets: appendSet(m, 3, 0) };
    m = { ...m, sets: appendSet(m, 3, 0) };
    expect(getMatchProgress(m)).toMatchObject({ decided: true, winnerIndex: 0 });
  });

  it("can undo the last set", () => {
    let m = matchWithPickBan("ft2");
    m = { ...m, sets: appendSet(m, 3, 0) };
    expect(removeLastSet(m)).toHaveLength(0);
  });

  it("refuses sets before pick/ban is complete", () => {
    const m = { winCondition: "ft2", pickBan: initPickBan("ft2", pool), sets: [] };
    expect(() => appendSet(m, 3, 0)).toThrow();
  });
});

// ── Rankings ────────────────────────────────────────────────

describe("rankings for the Final Championship bracket", () => {
  // Plays with random winners and records the round in which each player took a
  // second loss, which is the ground truth for their final placement.
  function playRecordingExits(players, rng) {
    let matches = generateFinalChampionshipBracket(players, 64, rng);
    const losses = {};
    const exitRound = {};
    for (let guard = 0; guard < 2000; guard++) {
      const active = matches.filter((m) => !(m.isGrandFinalReset && m.player1 === "TBD"));
      if (active.every((m) => m.winner != null)) return { matches, exitRound };
      const idx = matches.findIndex((m) => m.winner == null && real(m.player1) && real(m.player2));
      if (idx === -1) throw new Error("stuck");
      const m = matches[idx];
      const w = rng() < 0.5 ? 0 : 1;
      const loser = w === 0 ? m.player2 : m.player1;
      losses[loser] = (losses[loser] || 0) + 1;
      if (losses[loser] === 2) exitRound[loser] = m.bracket === "grandFinal" ? Infinity : m.round;
      matches = advanceBracket(matches, idx, w, { p1Score: w === 0 ? 2 : 0, p2Score: w === 1 ? 2 : 0 });
    }
    throw new Error("guard");
  }

  it("never ranks a player who went out in an earlier losers round above one who went out later", () => {
    const configs = [[3, 3, 3], [3, 3, 0], [0, 3, 3], [7, 2, 1], [16, 4, 2], [30, 5, 3], [51, 9, 4], [1, 0, 3], [5, 5, 5]];
    for (const [r, w, c] of configs) {
      for (let seed = 1; seed <= 25; seed++) {
        const players = makePlayers(r, w, c);
        const { matches, exitRound } = playRecordingExits(players, seeded(seed * 31 + r));
        const ranks = computeRankings(matches, "double", null, players, { rankByLosersExit: true });
        const rankOf = {};
        ranks.forEach((e) => e.players.forEach((p) => { rankOf[p.name] = e.rank; }));
        const names = Object.keys(exitRound);
        for (const a of names) {
          for (const b of names) {
            if (exitRound[a] > exitRound[b]) {
              expect(rankOf[a], `R=${r} W=${w} C=${c} seed=${seed}: ${a} vs ${b}`).toBeLessThanOrEqual(rankOf[b]);
            }
          }
        }
      }
    }
  });

  it("leaves the default ranking behaviour untouched when the option is not set", () => {
    const players = makePlayers(6, 0, 0);
    const { matches } = playRecordingExits(players, seeded(9));
    expect(computeRankings(matches, "double", null, players)).toEqual(
      computeRankings(matches, "double", null, players, {})
    );
  });
});

// ── Full match flow (same path the admin UI takes) ──────────

describe("full tournament through pick/ban, sets and bracket advancement", () => {
  const pool = Array.from({ length: 11 }, (_, i) => ({ id: `g${i}`, name: `Game ${i}` }));

  function hasUndefined(value) {
    if (value === undefined) return true;
    if (value && typeof value === "object") return Object.values(value).some(hasUndefined);
    return false;
  }

  function playFullFlow(players, rng) {
    let matches = generateFinalChampionshipBracket(players, 64, rng);
    const maxGames = { ft2: 0, ft3: 0, ft5: 0 };
    for (let guard = 0; guard < 2000; guard++) {
      const active = matches.filter((m) => !(m.isGrandFinalReset && m.player1 === "TBD"));
      if (active.every((m) => m.winner != null)) return { matches, maxGames };
      const idx = matches.findIndex((m) => m.winner == null && real(m.player1) && real(m.player2));
      if (idx === -1) throw new Error("stuck");
      const m = matches[idx];

      let pb = initPickBan(m.winCondition, pool);
      while (getNextAction(pb)) {
        const remaining = getRemainingGames(pb);
        pb = applyPickBanStep(pb, remaining[Math.floor(rng() * remaining.length)].id, rng);
      }
      let current = { ...m, pickBan: pb, sets: [] };
      while (!getMatchProgress(current).decided) {
        const winner = rng() < 0.5 ? 0 : 1;
        const other = Math.floor(rng() * 3);
        current = { ...current, sets: appendSet(current, winner === 0 ? 3 : other, winner === 1 ? 3 : other) };
      }
      maxGames[m.winCondition] = Math.max(maxGames[m.winCondition], current.sets.length);
      const progress = getMatchProgress(current);
      matches = advanceBracket(matches, idx, progress.winnerIndex, { p1Score: progress.p1Sets, p2Score: progress.p2Sets });
      matches[idx].sets = current.sets;
      matches[idx].pickBan = current.pickBan;
    }
    throw new Error("guard");
  }

  it("completes with every format capped at its maximum number of games", () => {
    let seenFt5 = 0;
    for (const [r, w, c] of [[16, 4, 2], [7, 2, 1], [30, 5, 3], [0, 4, 4]]) {
      for (let seed = 1; seed <= 10; seed++) {
        const { matches, maxGames } = playFullFlow(makePlayers(r, w, c), seeded(seed * 13 + r));
        expect(maxGames.ft2).toBeLessThanOrEqual(3);
        expect(maxGames.ft3).toBeLessThanOrEqual(5);
        expect(maxGames.ft5).toBeLessThanOrEqual(9);
        for (const m of matches) {
          if (m.isPlayed && m.sets.length > 0) {
            expect(m.scoreP1 === getSetTarget(m.winCondition) || m.scoreP2 === getSetTarget(m.winCondition)).toBe(true);
            expect(m.sets.every((s) => s.scoreP1 === 3 || s.scoreP2 === 3)).toBe(true);
            if (m.winCondition === "ft5") seenFt5++;
          }
        }
      }
    }
    expect(seenFt5).toBeGreaterThan(0);
  });

  it("produces data Firestore accepts (no undefined values) and stays far below the 1 MB limit", () => {
    const { matches } = playFullFlow(makePlayers(51, 9, 4), seeded(77));
    expect(hasUndefined(matches)).toBe(false);
    expect(JSON.stringify(matches).length).toBeLessThan(400 * 1024);
  });
});

describe("canSwapSlots", () => {
  const people = [
    { name: "A", tier: "regular" }, { name: "B", tier: "regular" },
    { name: "C", tier: "winner" }, { name: "D", tier: "champion" },
  ];
  const ms = [
    { id: "m1", player1: "A", player2: "C" },
    { id: "m2", player1: "B", player2: "D" },
  ];
  it("allows same tier and refuses different tiers", () => {
    expect(canSwapSlots(ms, people, "m1", 0, "m2", 0)).toBe(true);
    expect(canSwapSlots(ms, people, "m1", 0, "m1", 1)).toBe(false);
    expect(canSwapSlots(ms, people, "m1", 1, "m2", 1)).toBe(false);
  });
  it("treats unknown players as regular", () => {
    expect(canSwapSlots([{ id: "x", player1: "Z", player2: "A" }], people, "x", 0, "x", 1)).toBe(true);
  });
});
