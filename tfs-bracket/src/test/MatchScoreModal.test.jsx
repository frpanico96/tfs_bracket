import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MatchScoreModal from "../components/MatchScoreModal";

const match = {
  id: "r1-m0",
  round: 1,
  matchIndex: 0,
  player1: "Alice",
  player2: "Bob",
  winner: null,
  isPlayed: false,
  winCondition: "ft3",
  scoreP1: 0,
  scoreP2: 0,
};

describe("MatchScoreModal", () => {
  it("renders nothing when isOpen is false", () => {
    const { container } = render(
      <MatchScoreModal isOpen={false} onClose={() => {}} match={match} onSave={() => {}} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders player names and win condition", () => {
    render(
      <MatchScoreModal isOpen={true} onClose={() => {}} match={match} onSave={() => {}} />
    );
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("FT3")).toBeInTheDocument();
  });

  it("renders score buttons up to win target", () => {
    render(
      <MatchScoreModal isOpen={true} onClose={() => {}} match={match} onSave={() => {}} />
    );
    const buttons3 = screen.getAllByText("3");
    expect(buttons3.length).toBe(2); // one per player column
  });

  it("disables save when scores are not valid", () => {
    render(
      <MatchScoreModal isOpen={true} onClose={() => {}} match={match} onSave={() => {}} />
    );
    expect(screen.getByText("Save")).toBeDisabled();
  });

  it("shows validation hint when scores invalid", () => {
    render(
      <MatchScoreModal isOpen={true} onClose={() => {}} match={match} onSave={() => {}} />
    );
    expect(screen.getByText(/Winner must reach FT3/)).toBeInTheDocument();
  });

  it("enables save when valid score is entered", async () => {
    const user = userEvent.setup();
    render(
      <MatchScoreModal isOpen={true} onClose={() => {}} match={match} onSave={() => {}} />
    );
    const scoreButtons = screen.getAllByRole("button", { name: "3" });
    await user.click(scoreButtons[0]); // Alice gets 3
    await user.click(scoreButtons[1]); // Bob gets 3 → invalid (draw)
    await user.click(screen.getAllByRole("button", { name: "0" })[1]); // Bob gets 0
    expect(screen.getByText("Save")).not.toBeDisabled();
  });

  it("calls onSave with correct data", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(
      <MatchScoreModal isOpen={true} onClose={() => {}} match={match} onSave={onSave} />
    );
    await user.click(screen.getAllByRole("button", { name: "3" })[0]); // Alice gets 3
    await user.click(screen.getAllByRole("button", { name: "1" })[1]); // Bob gets 1
    expect(screen.getByText("Save")).not.toBeDisabled();
    await user.click(screen.getByText("Save"));
    expect(onSave).toHaveBeenCalledWith(match, { p1Score: 3, p2Score: 1, winnerIndex: 0 });
  });

  it("calls onClose and resets scores on close", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <MatchScoreModal isOpen={true} onClose={onClose} match={match} onSave={() => {}} />
    );
    await user.click(screen.getAllByText("3")[0]);
    await user.click(screen.getAllByText("2")[1]);
    await user.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalledTimes(1);
    rerender(
      <MatchScoreModal isOpen={true} onClose={onClose} match={match} onSave={() => {}} />
    );
    // After rerender, scores should reset to 0-0
    expect(screen.getByText("0 - 0")).toBeInTheDocument();
  });

  it("displays correct round info", () => {
    render(
      <MatchScoreModal isOpen={true} onClose={() => {}} match={match} onSave={() => {}} />
    );
    expect(screen.getByText("Round 1")).toBeInTheDocument();
    expect(screen.getByText("#1")).toBeInTheDocument();
  });
});
