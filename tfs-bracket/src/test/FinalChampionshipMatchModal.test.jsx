import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FinalChampionshipMatchModal from "../components/FinalChampionshipMatchModal";

const names = ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot", "Golf", "Hotel", "India", "Juliet", "Kilo"];
const pool = names.map((name, i) => ({ id: `g${i}`, name }));

const match = {
  id: "wb-r1-m0",
  bracket: "winners",
  round: 1,
  matchIndex: 0,
  player1: "Alice",
  player2: "Bob",
  winner: null,
  isPlayed: false,
  winCondition: "ft2",
  phase: "general",
  sets: [],
  pickBan: null,
  scoreP1: 0,
  scoreP2: 0,
};

function setup(overrides = {}, props = {}) {
  const onClose = vi.fn();
  const onSaveProgress = vi.fn().mockResolvedValue(undefined);
  const onComplete = vi.fn().mockResolvedValue(undefined);
  render(
    <FinalChampionshipMatchModal
      isOpen
      onClose={onClose}
      match={{ ...match, ...overrides }}
      gamePool={pool}
      onSaveProgress={onSaveProgress}
      onComplete={onComplete}
      rng={() => 0}
      {...props}
    />
  );
  return { onClose, onSaveProgress, onComplete, user: userEvent.setup() };
}

const prompt = () => document.querySelector(".fc-prompt")?.textContent.replace(/\s+/g, " ").trim();

async function clickGames(user, list) {
  for (const g of list) await user.click(screen.getByRole("button", { name: g }));
}

// FT2 with rng()=0: bans Alpha/Bravo, picks Charlie/Delta, bans Echo/Foxtrot, decider = Golf.
const FT2_STEPS = ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot"];

describe("FinalChampionshipMatchModal", () => {
  it("starts with player 1 banning and offers the whole pool", () => {
    setup();
    expect(prompt()).toBe("Alice must ban a game (step 1 of 6)");
    expect(document.querySelectorAll(".fc-game-btn")).toHaveLength(11);
    expect(screen.getByText("FT2")).toBeInTheDocument();
  });

  it("follows the FT2 order and draws the decider from what is left", async () => {
    const { user, onSaveProgress } = setup();
    await clickGames(user, FT2_STEPS.slice(0, 2));
    expect(prompt()).toBe("Alice must pick a game (step 3 of 6)");
    await clickGames(user, FT2_STEPS.slice(2, 4));
    expect(prompt()).toBe("Alice must ban a game (step 5 of 6)");
    await clickGames(user, FT2_STEPS.slice(4));

    const history = [...document.querySelectorAll(".fc-history li")].map((li) => li.textContent);
    expect(history).toEqual([
      "Alice banned Alpha",
      "Bob banned Bravo",
      "Alice picked Charlie",
      "Bob picked Delta",
      "Alice banned Echo",
      "Bob banned Foxtrot",
      "Decider: Golf",
    ]);
    // The picks are played in order, followed by the decider.
    const titles = [...document.querySelectorAll(".fc-set-title strong")].map((e) => e.textContent);
    expect(titles).toEqual(["Charlie", "Delta", "Golf"]);
    expect(onSaveProgress).toHaveBeenCalledTimes(6);
  });

  it("starts an FT5 match with picks, not bans", () => {
    setup({ id: "gf-m0", bracket: "grandFinal", winCondition: "ft5", phase: "final" });
    expect(prompt()).toBe("Alice must pick a game (step 1 of 10)");
    expect(screen.getByText("FT5")).toBeInTheDocument();
  });

  it("can undo the last pick/ban step and saves the change", async () => {
    const { user, onSaveProgress } = setup();
    await clickGames(user, ["Alpha", "Bravo"]);
    await user.click(screen.getByRole("button", { name: /undo last step/i }));
    expect(prompt()).toBe("Bob must ban a game (step 2 of 6)");
    expect(onSaveProgress.mock.calls.at(-1)[1].pickBan.steps).toHaveLength(1);
  });

  it("scores sets in play order and completes the match 2-0", async () => {
    const { user, onComplete, onClose, onSaveProgress } = setup();
    await clickGames(user, FT2_STEPS);

    await user.click(screen.getByRole("button", { name: "Alice 3" }));
    await user.click(screen.getByRole("button", { name: "Bob 1" }));
    await user.click(screen.getByRole("button", { name: "Save set" }));
    expect(onSaveProgress.mock.calls.at(-1)[1].sets).toHaveLength(1);
    expect(onComplete).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Alice 3" }));
    await user.click(screen.getByRole("button", { name: "Bob 0" }));
    await user.click(screen.getByRole("button", { name: "Save set" }));

    expect(onComplete).toHaveBeenCalledTimes(1);
    const [, result] = onComplete.mock.calls[0];
    expect(result).toMatchObject({ p1Score: 2, p2Score: 0, winnerIndex: 0, dq: null });
    expect(result.sets.map((s) => [s.game.name, s.scoreP1, s.scoreP2, s.winner])).toEqual([
      ["Charlie", 3, 1, 0],
      ["Delta", 3, 0, 0],
    ]);
    expect(result.pickBan.steps).toHaveLength(7);
    expect(onClose).toHaveBeenCalled();
  });

  it("goes to the decider at 1-1 and awards the match to its winner", async () => {
    const { user, onComplete } = setup();
    await clickGames(user, FT2_STEPS);

    await user.click(screen.getByRole("button", { name: "Alice 3" }));
    await user.click(screen.getByRole("button", { name: "Bob 2" }));
    await user.click(screen.getByRole("button", { name: "Save set" }));
    await user.click(screen.getByRole("button", { name: "Alice 1" }));
    await user.click(screen.getByRole("button", { name: "Bob 3" }));
    await user.click(screen.getByRole("button", { name: "Save set" }));

    expect(onComplete).not.toHaveBeenCalled();
    expect(screen.getByText("decider")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Alice 0" }));
    await user.click(screen.getByRole("button", { name: "Bob 3" }));
    await user.click(screen.getByRole("button", { name: "Save set" }));

    const [, result] = onComplete.mock.calls[0];
    expect(result).toMatchObject({ p1Score: 1, p2Score: 2, winnerIndex: 1 });
    expect(result.sets[2].game.name).toBe("Golf");
  });

  it("does not accept a set where nobody reached 3 rounds", async () => {
    const { user } = setup();
    await clickGames(user, FT2_STEPS);
    await user.click(screen.getByRole("button", { name: "Alice 1" }));
    await user.click(screen.getByRole("button", { name: "Bob 2" }));
    expect(screen.getByRole("button", { name: "Save set" })).toBeDisabled();
    expect(screen.getByText("One player must reach 3 rounds")).toBeInTheDocument();
  });

  it("disqualifies a player and awards the match to the opponent", async () => {
    const { user, onComplete } = setup();
    await user.click(screen.getByRole("button", { name: "Alice" }));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0][1]).toMatchObject({ dq: 0, winnerIndex: 1, p1Score: null, p2Score: null });
  });

  it("resumes a match that already has pick/ban and a played set", () => {
    const resumed = {
      pickBan: {
        template: "ft2",
        pool: pool.map(({ id, name }) => ({ id, name })),
        steps: [
          { action: "ban", player: 0, game: pool[0] },
          { action: "ban", player: 1, game: pool[1] },
          { action: "pick", player: 0, game: pool[2] },
          { action: "pick", player: 1, game: pool[3] },
          { action: "ban", player: 0, game: pool[4] },
          { action: "ban", player: 1, game: pool[5] },
          { action: "decider", player: null, game: pool[6] },
        ],
      },
      sets: [{ game: pool[2], scoreP1: 3, scoreP2: 0, winner: 0 }],
    };
    setup(resumed);
    expect(document.querySelector(".fc-sets-won").textContent).toBe("1");
    expect(document.querySelector(".fc-set.done .fc-set-result").textContent).toContain("3 – 0");
    expect(document.querySelector(".fc-set.current .fc-set-title").textContent).toContain("Delta");
    expect(document.querySelector(".fc-prompt")).toBeNull();
  });

  it("shows an error and keeps the set open when saving progress fails", async () => {
    const { user, onSaveProgress } = setup();
    onSaveProgress.mockRejectedValue(new Error("offline"));
    await user.click(screen.getByRole("button", { name: "Alpha" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not save progress");
  });
});
