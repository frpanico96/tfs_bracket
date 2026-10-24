import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BracketView from "../components/BracketView";

const base = { winner: null, isPlayed: false, winCondition: "ft3", scoreP1: 0, scoreP2: 0 };

// Round 1: prelim a vs b. Round 2: [TBD fed by prelim] vs Cat, and Dan vs Eve. Round 3: final.
const matches = [
  { ...base, id: "wb-r1-m0", bracket: "winners", round: 1, matchIndex: 0, player1: "Ann", player2: "Bob", prevMatch1: null, prevMatch2: null },
  { ...base, id: "wb-r2-m0", bracket: "winners", round: 2, matchIndex: 0, player1: "TBD", player2: "Cat", prevMatch1: "wb-r1-m0", prevMatch2: null },
  { ...base, id: "wb-r2-m1", bracket: "winners", round: 2, matchIndex: 1, player1: "Dan", player2: "Eve", prevMatch1: null, prevMatch2: null },
  { ...base, id: "wb-r3-m0", bracket: "winners", round: 3, matchIndex: 0, player1: "TBD", player2: "TBD", prevMatch1: "wb-r2-m0", prevMatch2: "wb-r2-m1" },
  { ...base, id: "lb-r1-m0", bracket: "losers", round: 1, matchIndex: 0, player1: "TBD", player2: "TBD", prevMatch1: null, prevMatch2: null },
  { ...base, id: "gf-m0", bracket: "grandFinal", round: 4, matchIndex: 0, player1: "TBD", player2: "TBD", prevMatch1: "wb-r3-m0", prevMatch2: "lb-r1-m0", isGrandFinalReset: false },
  { ...base, id: "gf-m1", bracket: "grandFinal", round: 4, matchIndex: 1, player1: "TBD", player2: "TBD", prevMatch1: null, prevMatch2: null, isGrandFinalReset: true },
];

function setup(canSwap = true) {
  const onSwap = vi.fn();
  render(<BracketView matches={matches} onMatchClick={() => {}} isAdmin bracketType="double" canSwap={canSwap} onSwapPlayers={onSwap} />);
  return { onSwap, user: userEvent.setup() };
}

// A TBD slot is the span whose own text is "TBD"; pick the one inside a given match card.
const tbdIn = (matchPlayerName) => {
  const card = screen.getByText(matchPlayerName).closest(".match");
  return [...card.querySelectorAll("span")].find((s) => s.firstChild?.textContent === "TBD");
};

describe("BracketView - swapping TBD slots", () => {
  it("lets a named player be swapped with a TBD slot of the same round", async () => {
    const { onSwap, user } = setup();
    await user.click(screen.getByText("Dan"));
    await user.click(tbdIn("Cat"));
    expect(onSwap).toHaveBeenCalledWith("wb-r2-m1", 0, "wb-r2-m0", 0);
  });

  it("lets a TBD slot be picked first", async () => {
    const { onSwap, user } = setup();
    await user.click(tbdIn("Cat"));
    expect(tbdIn("Cat").className).toContain("swap-selected");
    await user.click(screen.getByText("Eve"));
    expect(onSwap).toHaveBeenCalledWith("wb-r2-m0", 0, "wb-r2-m1", 1);
  });

  it("ignores a TBD slot of another round", async () => {
    const { onSwap, user } = setup();
    await user.click(screen.getByText("Dan"));
    await user.click(tbdIn("Cat")); // would be fine: same round
    onSwap.mockClear();

    await user.click(screen.getByText("Ann")); // round 1
    const finalCard = document.querySelectorAll(".match")[3];
    await user.click([...finalCard.querySelectorAll("span")].find((s) => s.firstChild?.textContent === "TBD"));
    expect(onSwap).not.toHaveBeenCalled();
  });

  it("only makes TBD slots of the winners side selectable (not losers bracket or grand final)", async () => {
    const { user } = setup();
    const tbdSpans = [...document.querySelectorAll(".match span, .grand-final span")].filter(
      (s) => s.firstChild?.textContent === "TBD"
    );
    expect(tbdSpans.length).toBeGreaterThan(3); // at least one non-selectable TBD slot exists
    let selectable = 0;
    for (const span of tbdSpans) {
      await user.click(span);
      const selected = span.className.includes("swap-selected");
      // Winners-side TBD slots carry a feeder hint; losers bracket / grand final ones do not.
      expect(selected, span.parentElement.textContent).toBe(!!span.querySelector(".swap-feeder"));
      if (selected) {
        selectable++;
        await user.click(span); // deselect
      }
    }
    expect(selectable).toBe(3);
  });

  it("shows which match feeds a TBD slot while swapping", () => {
    setup(true);
    expect(screen.getAllByText("Winner R1 #1").length).toBeGreaterThan(0);
  });

  it("does not show feeder hints outside swap mode", () => {
    setup(false);
    expect(screen.queryByText("Winner R1 #1")).not.toBeInTheDocument();
  });
});
