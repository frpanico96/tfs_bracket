import { describe, it, expect } from "vitest";
import {
  generateBracket,
  generateDoubleEliminationBracket,
  advanceBracket,
  groupByRound,
  parseFirestoreDate,
  resetBracket,
  isDoubleBracket,
  swapPlayers,
} from "../utils/bracket";

function makeParticipants(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: `Player ${i + 1}`,
    email: `p${i}@test.com`,
  }));
}

function findMatch(matches, id) {
  return matches.find((m) => m.id === id);
}

describe("generateBracket (single elimination)", () => {
  it("creates correct number of rounds for power of 2", () => {
    const matches = generateBracket(makeParticipants(8), 8, "ft3");
    const rounds = groupByRound(matches);
    expect(rounds).toHaveLength(3); // QF, SF, F
    expect(matches).toHaveLength(7); // 4 + 2 + 1
  });

  it("creates preliminary round for non-power of 2", () => {
    const matches = generateBracket(makeParticipants(11), 11, "ft3");
    const rounds = groupByRound(matches);
    expect(rounds).toHaveLength(4); // prelim + r2 + r3 + F
    expect(matches).toHaveLength(10); // 3 + 4 + 2 + 1
  });

  it("handles minimum 2 participants", () => {
    const participants = makeParticipants(2);
    const matches = generateBracket(participants, 2, "ft3");
    expect(matches).toHaveLength(1);
    const names = [matches[0].player1, matches[0].player2];
    expect(names).toContain("Player 1");
    expect(names).toContain("Player 2");
  });

  it("applies winCondition to all matches", () => {
    const matches = generateBracket(makeParticipants(8), 8, "ft5");
    matches.forEach((m) => expect(m.winCondition).toBe("ft5"));
  });

  it("defaults winCondition to ft3", () => {
    const matches = generateBracket(makeParticipants(4), 4);
    matches.forEach((m) => expect(m.winCondition).toBe("ft3"));
  });

  it("auto-advances BYE matches as played", () => {
    const matches = generateBracket(makeParticipants(5), 5, "ft3");
    const played = matches.filter((m) => m.isPlayed);
    played.forEach((m) => expect(m.winner).not.toBeNull());
  });

  it("does not exceed max participants", () => {
    const matches = generateBracket(makeParticipants(20), 8, "ft3");
    const rounds = groupByRound(matches);
    expect(rounds).toHaveLength(3); // 8 players → 3 rounds
  });

  it("generates unique match IDs", () => {
    const matches = generateBracket(makeParticipants(8), 8, "ft3");
    const ids = matches.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("generateDoubleEliminationBracket", () => {
  it("creates correct match structure for 4 participants", () => {
    const matches = generateDoubleEliminationBracket(makeParticipants(4), 4, "ft3");
    const wb = matches.filter((m) => m.bracket === "winners");
    const lb = matches.filter((m) => m.bracket === "losers");
    const gf = matches.filter((m) => m.bracket === "grandFinal");
    expect(wb.length).toBeGreaterThan(0);
    expect(lb.length).toBeGreaterThan(0);
    expect(gf).toHaveLength(2);
  });

  it("WB matches have loserGoesTo linking to LB", () => {
    const matches = generateDoubleEliminationBracket(makeParticipants(4), 4, "ft3");
    const wb = matches.filter((m) => m.bracket === "winners");
    const wbWithLoserLink = wb.filter((m) => m.loserGoesTo);
    expect(wbWithLoserLink.length).toBeGreaterThan(0);
    wbWithLoserLink.forEach((m) => {
      const lbMatch = matches.find((lm) => lm.id === m.loserGoesTo);
      expect(lbMatch).toBeDefined();
      expect(lbMatch.bracket).toBe("losers");
    });
  });

  it("creates grand final with gf-m0 and gf-m1", () => {
    const matches = generateDoubleEliminationBracket(makeParticipants(4), 4, "ft3");
    const gf0 = findMatch(matches, "gf-m0");
    const gf1 = findMatch(matches, "gf-m1");
    expect(gf0).toBeDefined();
    expect(gf1).toBeDefined();
    expect(gf1.isGrandFinalReset).toBe(true);
  });

  it("applies winCondition to all matches", () => {
    const matches = generateDoubleEliminationBracket(makeParticipants(8), 8, "ft7");
    matches.forEach((m) => expect(m.winCondition).toBe("ft7"));
  });

  it("handles non-power-of-2 participants with prelims", () => {
    const matches = generateDoubleEliminationBracket(makeParticipants(6), 6, "ft3");
    const prelims = matches.filter((m) => m.round === 1 && m.bracket === "winners");
    expect(prelims.length).toBeGreaterThan(0);
  });

  it("structures LB rounds correctly for consolidation", () => {
    const matches = generateDoubleEliminationBracket(makeParticipants(4), 4, "ft3");
    const lbRounds = [...new Set(matches.filter((m) => m.bracket === "losers").map((m) => m.round))];
    expect(lbRounds.length).toBeGreaterThan(0);
    lbRounds.forEach((r) => expect(Number.isInteger(r)).toBe(true));
  });
});

describe("advanceBracket", () => {
  const baseMatches = generateBracket(makeParticipants(8), 8, "ft3");

  it("records winner and scores", () => {
    const result = advanceBracket(baseMatches, 0, 0, { p1Score: 3, p2Score: 1 });
    expect(result[0].winner).toBe(0);
    expect(result[0].isPlayed).toBe(true);
    expect(result[0].scoreP1).toBe(3);
    expect(result[0].scoreP2).toBe(1);
  });

  it("propagates winner to next match", () => {
    const winnerName = baseMatches[0].player1;
    const result = advanceBracket(baseMatches, 0, 0, { p1Score: 3, p2Score: 0 });
    const nextMatch = result.find((m) => m.prevMatch1 === "r1-m0" || m.prevMatch2 === "r1-m0");
    expect(nextMatch.player1 === winnerName || nextMatch.player2 === winnerName).toBe(true);
  });

  it("does not mutate the original matches array", () => {
    const original = baseMatches[0].winner;
    advanceBracket(baseMatches, 0, 0, { p1Score: 3, p2Score: 1 });
    expect(baseMatches[0].winner).toBe(original);
  });

  it("handles GF reset when LB champ wins gf-m0", () => {
    const matches = generateDoubleEliminationBracket(makeParticipants(4), 4, "ft3");
    const gf0 = findMatch(matches, "gf-m0");
    if (gf0.player1 !== "TBD" && gf0.player2 !== "TBD") {
      const result = advanceBracket(matches, matches.indexOf(gf0), 1, { p1Score: 2, p2Score: 3 });
      const gf1 = findMatch(result, "gf-m1");
      expect(gf1.isPlayed).toBe(false);
      expect(gf1.winner).toBeNull();
    }
  });

  it("completes bracket when WB champion wins gf-m0", () => {
    const matches = generateDoubleEliminationBracket(makeParticipants(4), 4, "ft3");
    const gf0 = findMatch(matches, "gf-m0");
    if (gf0.player1 !== "TBD" && gf0.player2 !== "TBD") {
      const result = advanceBracket(matches, matches.indexOf(gf0), 0, { p1Score: 3, p2Score: 1 });
      expect(result.find((m) => m.id === "gf-m0").winner).toBe(0);
    }
  });

  it("sends loser to LB in double elimination", () => {
    const matches = generateDoubleEliminationBracket(makeParticipants(4), 4, "ft3");
    const firstWb = matches.find((m) => m.bracket === "winners" && m.round === 1);
    if (firstWb && firstWb.player1 !== "TBD" && firstWb.player2 !== "TBD") {
      const loser = firstWb.player2;
      const result = advanceBracket(matches, matches.indexOf(firstWb), 0, { p1Score: 3, p2Score: 1 });
      const lbMatch = result.find((m) => m.id === firstWb.loserGoesTo);
      if (lbMatch) {
        expect(lbMatch.player1 === loser || lbMatch.player2 === loser).toBe(true);
      }
    }
  });
});

describe("resetBracket", () => {
  it("generates single elimination by default", () => {
    const matches = resetBracket(makeParticipants(8), 8, "single", "ft3");
    expect(matches[0].bracket).toBeUndefined();
  });

  it("generates double elimination when type is double", () => {
    const matches = resetBracket(makeParticipants(4), 4, "double", "ft3");
    expect(matches[0].bracket).toBe("winners");
  });

  it("forwards winCondition", () => {
    const matches = resetBracket(makeParticipants(4), 4, "single", "ft5");
    expect(matches[0].winCondition).toBe("ft5");
  });
});

describe("groupByRound", () => {
  it("groups matches by round index", () => {
    const matches = [
      { id: "r1-m0", round: 1 },
      { id: "r2-m0", round: 2 },
      { id: "r2-m1", round: 2 },
    ];
    const rounds = groupByRound(matches);
    expect(rounds).toHaveLength(2);
    expect(rounds[0]).toHaveLength(1);
    expect(rounds[1]).toHaveLength(2);
  });

  it("returns empty array for no matches", () => {
    expect(groupByRound([])).toEqual([]);
  });
});

describe("parseFirestoreDate", () => {
  it("parses Firestore Timestamp with toDate", () => {
    const d = new Date("2025-06-01");
    const ts = { toDate: () => d };
    expect(parseFirestoreDate(ts)).toBe(d);
  });

  it("returns Date object as-is", () => {
    const d = new Date();
    expect(parseFirestoreDate(d)).toBe(d);
  });

  it("parses ISO string", () => {
    const result = parseFirestoreDate("2025-06-01T00:00:00");
    expect(result).toBeInstanceOf(Date);
    expect(result.getFullYear()).toBe(2025);
  });

  it("returns null for null/undefined", () => {
    expect(parseFirestoreDate(null)).toBeNull();
    expect(parseFirestoreDate(undefined)).toBeNull();
  });
});

describe("isDoubleBracket", () => {
  it("returns true for double elimination matches", () => {
    const matches = [{ bracket: "winners" }];
    expect(isDoubleBracket(matches)).toBe(true);
  });

  it("returns false for single elimination matches", () => {
    const matches = [{ id: "r1-m0" }];
    expect(isDoubleBracket(matches)).toBe(false);
  });

  it("returns false for empty array", () => {
    expect(isDoubleBracket([])).toBe(false);
  });

  it("returns falsy for null/undefined", () => {
    expect(isDoubleBracket(null)).toBeFalsy();
    expect(isDoubleBracket(undefined)).toBeFalsy();
  });
});

describe("swapPlayers", () => {
  const matches = [
    { id: "r1-m0", player1: "A", player2: "B", isPlayed: false },
    { id: "r1-m1", player1: "C", player2: "D", isPlayed: false },
  ];

  it("swaps player1 of first match with player1 of second match", () => {
    const result = swapPlayers(matches, "r1-m0", 0, "r1-m1", 0);
    expect(result[0].player1).toBe("C");
    expect(result[1].player1).toBe("A");
    expect(result[0].player2).toBe("B");
    expect(result[1].player2).toBe("D");
  });

  it("swaps player1 with player2 across matches", () => {
    const result = swapPlayers(matches, "r1-m0", 0, "r1-m1", 1);
    expect(result[0].player1).toBe("D");
    expect(result[1].player2).toBe("A");
  });

  it("does not mutate original matches array", () => {
    const original = matches[0].player1;
    swapPlayers(matches, "r1-m0", 0, "r1-m1", 0);
    expect(matches[0].player1).toBe(original);
    expect(matches[0].player1).toBe("A");
    expect(matches[1].player1).toBe("C");
  });

  it("rejects swap involving TBD player", () => {
    const withTbd = [
      { id: "r1-m0", player1: "A", player2: "TBD", isPlayed: false },
      { id: "r1-m1", player1: "C", player2: "D", isPlayed: false },
    ];
    const result = swapPlayers(withTbd, "r1-m0", 1, "r1-m1", 0);
    expect(result).toBe(withTbd);
  });

  it("rejects swap involving BYE player", () => {
    const withBye = [
      { id: "r1-m0", player1: "A", player2: "BYE", isPlayed: false },
      { id: "r1-m1", player1: "C", player2: "D", isPlayed: false },
    ];
    const result = swapPlayers(withBye, "r1-m0", 1, "r1-m1", 0);
    expect(result).toBe(withBye);
  });

  it("rejects swap when either match is not found", () => {
    const result = swapPlayers(matches, "r1-m0", 0, "nonexistent", 0);
    expect(result).toBe(matches);
  });

  it("swaps within the same match (player1 and player2)", () => {
    const result = swapPlayers(matches, "r1-m0", 0, "r1-m0", 1);
    expect(result[0].player1).toBe("B");
    expect(result[0].player2).toBe("A");
  });
});
