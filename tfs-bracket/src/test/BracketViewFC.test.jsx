import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BracketView from "../components/BracketView";
import { generateFinalChampionshipBracket } from "../utils/finalChampionship";

const players = [
  ...Array.from({ length: 12 }, (_, i) => ({ id: `r${i}`, name: `Reg${i}`, tier: "regular" })),
  ...Array.from({ length: 3 }, (_, i) => ({ id: `w${i}`, name: `Win${i}`, tier: "winner" })),
  ...Array.from({ length: 2 }, (_, i) => ({ id: `c${i}`, name: `Champ${i}`, tier: "champion" })),
];

function renderFc(matches, props = {}) {
  return render(
    <BracketView
      matches={matches}
      onMatchClick={() => {}}
      isAdmin
      bracketType="double"
      tournamentType="final_championship"
      onMatchWinConditionClick={() => {}}
      {...props}
    />
  );
}

describe("BracketView - Final Championship", () => {
  const matches = generateFinalChampionshipBracket(players, 64, () => 0.3);

  it("names rounds after their phase", () => {
    renderFc(matches);
    for (const name of ["Winners Final", "Winners Semifinal", "Losers Final", "Losers Semifinal", "Grand Final"]) {
      expect(screen.getAllByText(name).length).toBeGreaterThan(0);
    }
  });

  it("shows the fixed formats and does not let the admin change them", async () => {
    const onCond = vi.fn();
    const user = userEvent.setup();
    // The format label only renders once both players are known, so fill in later rounds.
    const maxWb = Math.max(...matches.filter((m) => m.bracket === "winners").map((m) => m.round));
    const known = matches.map((m) =>
      m.winCondition !== "ft2" && m.bracket !== "grandFinal" ? { ...m, player1: "X", player2: "Y" } : m
    );
    expect(known.some((m) => m.bracket === "winners" && m.round === maxWb && m.winCondition === "ft5")).toBe(true);
    renderFc(known, { onMatchWinConditionClick: onCond });

    const ft2 = screen.getAllByText("FT2")[0];
    expect(ft2.classList.contains("clickable-cond")).toBe(false);
    await user.click(ft2);
    await user.click(screen.getAllByText("FT5")[0]);
    expect(onCond).not.toHaveBeenCalled();
    expect(screen.getAllByText("FT3").length).toBeGreaterThan(0);
  });

  it("shows the running set score of a match in progress", () => {
    const inProgress = matches.map((m) =>
      m.id === "wb-r1-m0"
        ? { ...m, sets: [{ game: { id: "g1", name: "A" }, scoreP1: 3, scoreP2: 1, winner: 0 }] }
        : m
    );
    const { container } = renderFc(inProgress);
    const live = [...container.querySelectorAll(".score-live")].map((e) => e.textContent);
    expect(live).toEqual(["1", "0"]);
  });

  it("keeps the win condition editable for standard tournaments", () => {
    const standard = matches.map((m) => ({ ...m, winCondition: "ft3" }));
    const { container } = render(
      <BracketView matches={standard} onMatchClick={() => {}} isAdmin bracketType="double" onMatchWinConditionClick={() => {}} />
    );
    expect(container.querySelector(".clickable-cond")).not.toBeNull();
    expect(within(container).queryByText("Winners Semifinal")).toBeNull();
  });
});
