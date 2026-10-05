import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../components/Toast";

const { mockUpdateDoc, mockDoc } = vi.hoisted(() => ({ mockUpdateDoc: vi.fn(), mockDoc: vi.fn((...a) => a.join("/")) }));

vi.mock("../firebase", () => ({
  db: {},
  doc: mockDoc,
  updateDoc: mockUpdateDoc,
  getDoc: vi.fn(),
  getDocs: vi.fn(() => ({ docs: [] })),
  addDoc: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  increment: vi.fn(),
  serverTimestamp: vi.fn(() => new Date()),
  usersRef: {},
  registrationTokensRef: {},
  registrationEntriesRef: {},
  bracketTokensRef: {},
  query: vi.fn(),
  where: vi.fn(),
  onSnapshot: vi.fn(() => () => {}),
}));
vi.mock("../utils/logger", () => ({ logEvent: vi.fn() }));

// BracketView and the sidebar are stubbed so these tests focus on TournamentDetail's own wiring.
vi.mock("../components/BracketView", () => ({
  default: ({ matches, onMatchClick, tournamentType, canSwap, onSwapPlayers }) => (
    <div data-testid="bracket-view" data-type={tournamentType ?? ""}>
      <button onClick={() => onMatchClick(matches[0])}>open-first-match</button>
      {canSwap && <button onClick={() => onSwapPlayers(matches[0].id, 0, matches[1].id, 0)}>swap-first-slots</button>}
    </div>
  ),
}));
vi.mock("../components/TournamentSidebar", () => ({
  default: ({ hideWinCondition }) => <div data-testid="sidebar" data-hide-wc={String(!!hideWinCondition)} />,
}));

import TournamentDetail from "../components/TournamentDetail";
import { generateFinalChampionshipBracket } from "../utils/finalChampionship";

const now = Date.now();
const gamePool = ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot", "Golf", "Hotel", "India", "Juliet", "Kilo"]
  .map((name, i) => ({ id: `g${i}`, name }));

const participants = [
  { id: "p1", name: "Ann", email: "", tier: "regular" },
  { id: "p2", name: "Ben", email: "", tier: "regular" },
  { id: "p3", name: "Cat", email: "", tier: "regular" },
  { id: "p4", name: "Dan", email: "", tier: "regular" },
  { id: "p5", name: "Eve", email: "", tier: "winner" },
  { id: "p6", name: "Fay", email: "", tier: "champion" },
];

const fcTournament = {
  id: "t-fc",
  name: "Final Championship",
  adminId: "admin-1",
  adminName: "Admin",
  maxParticipants: 16,
  regStart: new Date(now - 86400000),
  regEnd: new Date(now + 86400000),
  published: true,
  started: false,
  bracketType: "double",
  tournamentType: "final_championship",
  gamePool,
  participants,
  matches: [],
};

const admin = { uid: "admin-1", displayName: "Admin", email: "a@test.com" };
const other = { uid: "user-2", displayName: "Other", email: "o@test.com" };

function renderDetail(tournament, user = admin, onUpdate = vi.fn()) {
  render(<TournamentDetail tournament={tournament} user={user} onBack={() => {}} onUpdate={onUpdate} onDelete={() => {}} />, {
    wrapper: ToastProvider,
  });
  return onUpdate;
}

beforeEach(() => vi.clearAllMocks());

describe("TournamentDetail - Final Championship setup", () => {
  it("shows the format, the game pool and tier badges", () => {
    renderDetail(fcTournament);
    expect(screen.getByText(/Final Championship \(double elimination\)/)).toBeInTheDocument();
    expect(screen.getByText(/11 games/)).toBeInTheDocument();
    const badges = [...document.querySelectorAll(".tier-badge")].map((b) => b.textContent);
    expect(badges).toEqual(["Winner", "Champion"]);
  });

  it("lets only the admin choose tiers", () => {
    renderDetail(fcTournament, other);
    expect(screen.queryByLabelText("Tier for Ann")).not.toBeInTheDocument();
  });

  it("saves a tier change", async () => {
    const user = userEvent.setup();
    const onUpdate = renderDetail(fcTournament);
    await user.selectOptions(screen.getByLabelText("Tier for Ann"), "champion");

    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const saved = mockUpdateDoc.mock.calls[0][1].participants;
    expect(saved.find((p) => p.id === "p1").tier).toBe("champion");
    expect(saved.find((p) => p.id === "p2").tier).toBe("regular");
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ participants: saved }));
  });

  it("does not offer tiers on a standard tournament", () => {
    renderDetail({ ...fcTournament, tournamentType: undefined, gamePool: undefined, bracketType: "single" });
    expect(screen.queryByLabelText("Tier for Ann")).not.toBeInTheDocument();
    expect(document.querySelector(".tier-badge")).toBeNull();
  });

  it("starts with a Final Championship bracket: Winners enter round 2, Champions round 3", async () => {
    const user = userEvent.setup();
    const onUpdate = renderDetail(fcTournament);
    await user.click(screen.getByRole("button", { name: /Start Tournament/ }));

    const [, update] = mockUpdateDoc.mock.calls[0];
    expect(update.started).toBe(true);
    const wb = (r) => update.matches.filter((m) => m.bracket === "winners" && m.round === r);
    const inRound = (r) => wb(r).flatMap((m) => [m.player1, m.player2]);
    expect(inRound(1)).toEqual(expect.not.arrayContaining(["Eve", "Fay"]));
    expect(inRound(2)).toContain("Eve");
    expect(inRound(2)).not.toContain("Fay");
    expect(inRound(3)).toContain("Fay");
    expect(update.matches.some((m) => m.winCondition === "ft5")).toBe(true);
    expect(onUpdate).toHaveBeenCalled();
  });
});

describe("TournamentDetail - Final Championship play", () => {
  const started = () => ({
    ...fcTournament,
    started: true,
    matches: generateFinalChampionshipBracket(participants.map((p) => ({ ...p, tier: "regular" })), 16, () => 0.3),
  });

  it("hides the win-condition settings and tells the bracket view the type", () => {
    renderDetail(started());
    expect(screen.getByTestId("sidebar").dataset.hideWc).toBe("true");
    expect(screen.getByTestId("bracket-view").dataset.type).toBe("final_championship");
  });

  it("opens the pick/ban flow for a match and saves each step", async () => {
    const user = userEvent.setup();
    const t = started();
    const first = t.matches[0];
    renderDetail(t);
    await user.click(screen.getByText("open-first-match"));

    expect(screen.getByRole("dialog").textContent).toContain("Pick & Ban");
    await user.click(screen.getByRole("button", { name: "Alpha" }));

    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const saved = mockUpdateDoc.mock.calls[0][1].matches.find((m) => m.id === first.id);
    expect(saved.pickBan.steps).toHaveLength(1);
    expect(saved.pickBan.steps[0]).toMatchObject({ action: "ban", player: 0, game: { name: "Alpha" } });
    expect(saved.winner).toBeNull();
  });

  const swapTournament = (secondMatchFirstPlayer) => ({
    ...fcTournament,
    started: true,
    matches: [
      { id: "m-a", bracket: "winners", round: 1, matchIndex: 0, player1: "Ann", player2: "Ben", winner: null, isPlayed: false, winCondition: "ft2", sets: [], pickBan: null },
      { id: "m-b", bracket: "winners", round: 1, matchIndex: 1, player1: secondMatchFirstPlayer, player2: "Dan", winner: null, isPlayed: false, winCondition: "ft2", sets: [], pickBan: null },
    ],
  });

  it("refuses to swap players of different tiers", async () => {
    const user = userEvent.setup();
    renderDetail(swapTournament("Fay")); // Ann is regular, Fay is a champion
    await user.click(screen.getByRole("button", { name: /Swap Players/ }));
    await user.click(screen.getByText("swap-first-slots"));

    expect(mockUpdateDoc).not.toHaveBeenCalled();
    expect(await screen.findByText("Players can only be swapped with others of the same tier")).toBeInTheDocument();
  });

  it("swaps players of the same tier", async () => {
    const user = userEvent.setup();
    renderDetail(swapTournament("Cat")); // Ann and Cat are both regular
    await user.click(screen.getByRole("button", { name: /Swap Players/ }));
    await user.click(screen.getByText("swap-first-slots"));

    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const saved = mockUpdateDoc.mock.calls[0][1].matches;
    expect(saved.find((m) => m.id === "m-a").player1).toBe("Cat");
    expect(saved.find((m) => m.id === "m-b").player1).toBe("Ann");
  });
});
