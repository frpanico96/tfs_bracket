import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BracketView from "../components/BracketView";

const singleElimMatches = [
  { id: "r1-m0", round: 1, matchIndex: 0, player1: "Alice", player2: "Bob", winner: null, isPlayed: false, prevMatch1: null, prevMatch2: null, winCondition: "ft3", scoreP1: 0, scoreP2: 0 },
  { id: "r1-m1", round: 1, matchIndex: 1, player1: "Charlie", player2: "Dave", winner: null, isPlayed: false, prevMatch1: null, prevMatch2: null, winCondition: "ft3", scoreP1: 0, scoreP2: 0 },
  { id: "r2-m0", round: 2, matchIndex: 0, player1: "TBD", player2: "TBD", winner: null, isPlayed: false, prevMatch1: "r1-m0", prevMatch2: "r1-m1", winCondition: "ft3", scoreP1: 0, scoreP2: 0 },
];

const doubleElimMatches = [
  { id: "wb-r1-m0", bracket: "winners", round: 1, matchIndex: 0, player1: "Alice", player2: "Bob", winner: null, isPlayed: false, prevMatch1: null, prevMatch2: null, loserGoesTo: "lb-r1-m0", winCondition: "ft3", scoreP1: 0, scoreP2: 0 },
  { id: "wb-r1-m1", bracket: "winners", round: 1, matchIndex: 1, player1: "Charlie", player2: "Dave", winner: null, isPlayed: false, prevMatch1: null, prevMatch2: null, loserGoesTo: "lb-r1-m0", winCondition: "ft3", scoreP1: 0, scoreP2: 0 },
  { id: "wb-r2-m0", bracket: "winners", round: 2, matchIndex: 0, player1: "TBD", player2: "TBD", winner: null, isPlayed: false, prevMatch1: "wb-r1-m0", prevMatch2: "wb-r1-m1", loserGoesTo: null, winCondition: "ft3", scoreP1: 0, scoreP2: 0 },
  { id: "lb-r1-m0", bracket: "losers", round: 1, matchIndex: 0, player1: "TBD", player2: "TBD", winner: null, isPlayed: false, prevMatch1: null, prevMatch2: null, prevMatchLoser1: "wb-r1-m0", prevMatchLoser2: "wb-r1-m1", winCondition: "ft3", scoreP1: 0, scoreP2: 0 },
  { id: "gf-m0", bracket: "grandFinal", round: 3, matchIndex: 0, player1: "TBD", player2: "TBD", winner: null, isPlayed: false, prevMatch1: "wb-r2-m0", prevMatch2: "lb-r1-m0", winCondition: "ft5", scoreP1: 0, scoreP2: 0, isGrandFinalReset: false },
  { id: "gf-m1", bracket: "grandFinal", round: 3, matchIndex: 1, player1: "TBD", player2: "TBD", winner: null, isPlayed: false, prevMatch1: null, prevMatch2: null, winCondition: "ft5", scoreP1: 0, scoreP2: 0, isGrandFinalReset: true },
];

describe("BracketView - Single Elimination", () => {
  it("renders rounds and match cards", () => {
    render(<BracketView matches={singleElimMatches} onMatchClick={() => {}} isAdmin={false} bracketType="single" />);
    expect(screen.getByText("Semifinals")).toBeInTheDocument();
    expect(screen.getByText("Finals")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("shows empty state for no matches", () => {
    render(<BracketView matches={[]} onMatchClick={() => {}} isAdmin={false} bracketType="single" />);
    expect(screen.getByText("No matches yet")).toBeInTheDocument();
  });

  it("calls onMatchClick when a playable match is clicked", async () => {
    const onMatchClick = vi.fn();
    const user = userEvent.setup();
    render(<BracketView matches={singleElimMatches} onMatchClick={onMatchClick} isAdmin={true} bracketType="single" />);
    await user.click(screen.getByText("Alice").closest(".match"));
    expect(onMatchClick).toHaveBeenCalledWith(expect.objectContaining({ id: "r1-m0" }));
  });

  it("calls onMatchWinConditionClick when badge is clicked", async () => {
    const onWinClick = vi.fn();
    const user = userEvent.setup();
    render(
      <BracketView matches={singleElimMatches} onMatchClick={() => {}} isAdmin={true} bracketType="single" onMatchWinConditionClick={onWinClick} />
    );
    const badges = screen.getAllByText("FT3");
    await user.click(badges[0]);
    expect(onWinClick).toHaveBeenCalledWith(expect.objectContaining({ id: "r1-m0" }));
  });

  it("shows champion when finals are played", () => {
    const completedMatches = singleElimMatches.map((m) =>
      m.id === "r2-m0" ? { ...m, player1: "Alice", player2: "Bob", winner: 0, isPlayed: true, scoreP1: 3, scoreP2: 1 } : m
    );
    render(<BracketView matches={completedMatches} onMatchClick={() => {}} isAdmin={false} bracketType="single" />);
    expect(screen.getByText("Champion")).toBeInTheDocument();
    expect(screen.getByText("Champion").closest(".champion-display")).toBeInTheDocument();
  });
});

describe("BracketView - Double Elimination", () => {
  it("renders winners, losers, and grand final sections", () => {
    render(<BracketView matches={doubleElimMatches} onMatchClick={() => {}} isAdmin={false} bracketType="double" />);
    expect(screen.getByText("Winners Bracket")).toBeInTheDocument();
    expect(screen.getByText("Losers Bracket")).toBeInTheDocument();
    const gfHeadings = screen.getAllByText("Grand Final");
    expect(gfHeadings.length).toBeGreaterThanOrEqual(1);
  });

  it("renders grand final match with win condition", () => {
    const withPlayers = doubleElimMatches.map((m) =>
      m.id === "gf-m0" ? { ...m, player1: "Alice", player2: "Charlie" } : m
    );
    render(<BracketView matches={withPlayers} onMatchClick={() => {}} isAdmin={false} bracketType="double" />);
    expect(screen.getByText("FT5")).toBeInTheDocument();
  });

  it("does not render GF reset match when not active", () => {
    render(<BracketView matches={doubleElimMatches} onMatchClick={() => {}} isAdmin={false} bracketType="double" />);
    expect(screen.queryByText("Grand Final Reset")).not.toBeInTheDocument();
  });

  it("renders GF reset match when active", () => {
    const active = doubleElimMatches.map((m) =>
      m.id === "gf-m1" ? { ...m, player1: "Charlie", player2: "Alice" } : m
    );
    render(<BracketView matches={active} onMatchClick={() => {}} isAdmin={false} bracketType="double" />);
    expect(screen.getByText("Grand Final Reset")).toBeInTheDocument();
  });

  it("shows champion after GF completion", () => {
    const completed = doubleElimMatches.map((m) =>
      m.id === "gf-m0" ? { ...m, player1: "Alice", player2: "Charlie", winner: 0, isPlayed: true, scoreP1: 3, scoreP2: 2 } : m
    );
    render(<BracketView matches={completed} onMatchClick={() => {}} isAdmin={false} bracketType="double" />);
    expect(screen.getByText("Champion")).toBeInTheDocument();
  });

  it("calls onMatchWinConditionClick from grand final match", async () => {
    const onWinClick = vi.fn();
    const user = userEvent.setup();
    const active = doubleElimMatches.map((m) =>
      m.id === "gf-m0" ? { ...m, player1: "Alice", player2: "Charlie" } : m
    );
    render(
      <BracketView matches={active} onMatchClick={() => {}} isAdmin={true} bracketType="double" onMatchWinConditionClick={onWinClick} />
    );
    const ft5Badges = screen.getAllByText("FT5");
    const gfBadge = ft5Badges.find((b) => b.closest(".grand-final"));
    await user.click(gfBadge);
    expect(onWinClick).toHaveBeenCalledWith(expect.objectContaining({ id: "gf-m0" }));
  });
});

describe("BracketView - Swap Players", () => {
  it("does not show swap clickable players when canSwap is false", () => {
    render(
      <BracketView matches={singleElimMatches} onMatchClick={() => {}} isAdmin={true} bracketType="single" canSwap={false} />
    );
    expect(screen.getByText("Alice").className).not.toContain("swap-player");
  });

  it("renders swap-player class when canSwap is true", () => {
    render(
      <BracketView matches={singleElimMatches} onMatchClick={() => {}} isAdmin={true} bracketType="single" canSwap={true} onSwapPlayers={() => {}} />
    );
    const alice = screen.getByText("Alice");
    expect(alice.className).toContain("swap-player");
  });

  it("calls onSwapPlayers when two players are clicked", async () => {
    const onSwap = vi.fn();
    const user = userEvent.setup();
    render(
      <BracketView matches={singleElimMatches} onMatchClick={() => {}} isAdmin={true} bracketType="single" canSwap={true} onSwapPlayers={onSwap} />
    );
    await user.click(screen.getByText("Alice"));
    await user.click(screen.getByText("Charlie"));
    expect(onSwap).toHaveBeenCalledWith("r1-m0", 0, "r1-m1", 0);
  });

  it("deselects when clicking the same player again", async () => {
    const onSwap = vi.fn();
    const user = userEvent.setup();
    render(
      <BracketView matches={singleElimMatches} onMatchClick={() => {}} isAdmin={true} bracketType="single" canSwap={true} onSwapPlayers={onSwap} />
    );
    await user.click(screen.getByText("Alice"));
    expect(screen.getByText("Alice").className).toContain("swap-selected");
    await user.click(screen.getByText("Alice"));
    expect(screen.getByText("Alice").className).not.toContain("swap-selected");
    expect(onSwap).not.toHaveBeenCalled();
  });

  it("does not call onSwapPlayers when clicking TBD player", async () => {
    const onSwap = vi.fn();
    const user = userEvent.setup();
    render(
      <BracketView matches={singleElimMatches} onMatchClick={() => {}} isAdmin={true} bracketType="single" canSwap={true} onSwapPlayers={onSwap} />
    );
    await user.click(screen.getByText("Alice"));
    const tdbs = screen.getAllByText("TBD");
    const nonMatchTbd = tdbs.find(t => t.closest(".future"));
    if (nonMatchTbd) {
      await user.click(nonMatchTbd);
    }
    expect(onSwap).not.toHaveBeenCalled();
  });
});
