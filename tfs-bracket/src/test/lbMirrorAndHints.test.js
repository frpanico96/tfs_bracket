import { describe, it, expect } from "vitest";
import { generateDoubleEliminationBracket, advanceBracket } from "../utils/bracket";
import { slotSourceLabel, matchRef } from "../utils/slotLabels";

const real = (p) => p && p !== "TBD" && p !== "BYE";
const mk = (n) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i + 1}`, tier: "regular" }));
const gen = (n) => generateDoubleEliminationBracket(mk(n), 64, "ft3");

// Player 1 always wins: the WB champion never loses, so no grand final reset.
function playAll(matches) {
  let ms = matches;
  const losses = {};
  for (let guard = 0; guard < 1000; guard++) {
    const idx = ms.findIndex((m) => m.winner == null && real(m.player1) && real(m.player2));
    if (idx < 0) break;
    losses[ms[idx].player2] = (losses[ms[idx].player2] || 0) + 1;
    ms = advanceBracket(ms, idx, 0, { p1Score: 2, p2Score: 0 });
  }
  return { ms, losses };
}

describe("losers bracket mirror drop order", () => {
  it("first WB loser of a drop round plays last in the LB round (16 players)", () => {
    const ms = gen(16);
    const wb = ms.filter((m) => m.id.startsWith("wb-r2-"));
    const lbDrop = ms.filter((m) => m.id.startsWith("lb-r2-"));
    expect(wb).toHaveLength(4);
    wb.forEach((m, i) => expect(m.loserGoesTo).toBe(`lb-r2-m${wb.length - 1 - i}`));
    expect(lbDrop[lbDrop.length - 1].prevMatchLoser2 ?? lbDrop[lbDrop.length - 1].prevMatchLoser1).toBe("wb-r2-m0");
    expect(lbDrop[0].prevMatchLoser2 ?? lbDrop[0].prevMatchLoser1).toBe("wb-r2-m3");
  });

  it("advanceBracket drops the loser into the slot named by prevMatchLoser", () => {
    const ms = gen(16);
    const idx = ms.findIndex((m) => m.id === "wb-r1-m0");
    expect(real(ms[idx].player1) && real(ms[idx].player2)).toBe(true);
    const out = advanceBracket(ms, idx, 0, { p1Score: 3, p2Score: 0 });
    const loser = ms[idx].player2;
    const target = out.find((m) => m.id === ms[idx].loserGoesTo);
    const slot = target.prevMatchLoser1 === "wb-r1-m0" ? target.player1 : target.player2;
    expect(slot).toBe(loser);
  });

  it.each([2, 3, 4, 5, 6, 8, 11, 16, 20, 32, 50, 64])("n=%i plays out; every non-champion loses exactly twice", (n) => {
    const { ms, losses } = playAll(gen(n));
    expect(ms.find((m) => m.id === "gf-m0").winner).toBe(0);
    const counts = Object.values(losses);
    expect(counts).toHaveLength(n - 1);
    expect(counts.every((c) => c === 2)).toBe(true);
  });
});

describe("slotSourceLabel", () => {
  const ms = gen(8);
  const byId = new Map(ms.map((m) => [m.id, m]));
  it("labels WB, LB and loser feeders", () => {
    expect(slotSourceLabel(byId.get("wb-r2-m0"), 0, byId).text).toBe("Winner WB R1 #1");
    const lb = ms.find((m) => m.id.startsWith("lb-r2-"));
    const t = [0, 1].map((s) => slotSourceLabel(lb, s, byId)?.text);
    expect(t.some((x) => /^Loser WB R2 #\d$/.test(x)) || t.some((x) => /^Winner LB/.test(x))).toBe(true);
    expect(slotSourceLabel(byId.get("gf-m0"), 0, byId).text).toMatch(/^Winner WB/);
    expect(slotSourceLabel(byId.get("gf-m0"), 1, byId).text).toMatch(/^Winner LB/);
    expect(slotSourceLabel(byId.get("gf-m1"), 0, byId).text).toBe("Grand Final finalist");
  });
  it("skips named and BYE slots, adds tooltip with real names", () => {
    expect(slotSourceLabel(byId.get("wb-r1-m0"), 0, byId)).toBeNull();
    expect(slotSourceLabel({ id: "x", player1: "BYE", player2: "TBD" }, 0, byId)).toBeNull();
    const r2 = byId.get("wb-r2-m0");
    expect(slotSourceLabel(r2, 0, byId).title).toMatch(/^Winner of P\d+ vs P\d+$/);
  });
  it("matchRef formats ids", () => {
    expect(matchRef("r1-m2")).toBe("R1 #3");
    expect(matchRef("lb-r2-m0")).toBe("LB R2 #1");
    expect(matchRef("x")).toBeNull();
  });
});
