import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../components/Toast";

const { mockUpdateDoc } = vi.hoisted(() => ({ mockUpdateDoc: vi.fn() }));
vi.mock("../firebase", () => ({
  db: {}, doc: vi.fn((...a) => a.join("/")), updateDoc: mockUpdateDoc, getDoc: vi.fn(),
  getDocs: vi.fn(() => ({ docs: [] })), addDoc: vi.fn(), setDoc: vi.fn(), deleteDoc: vi.fn(),
  increment: vi.fn(), serverTimestamp: vi.fn(() => new Date()), usersRef: {},
  registrationTokensRef: {}, registrationEntriesRef: {}, bracketTokensRef: {},
  query: vi.fn(), where: vi.fn(), onSnapshot: vi.fn(() => () => {}),
}));
vi.mock("../utils/logger", () => ({ logEvent: vi.fn() }));
vi.mock("../components/BracketView", () => ({ default: () => <div /> }));
vi.mock("../components/TournamentSidebar", () => ({ default: () => <div /> }));

import TournamentDetail from "../components/TournamentDetail";

const people = (n) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `Player ${i + 1}`, email: "", tier: "regular" }));
const tournament = (extra = {}) => ({
  id: "t1", name: "T", adminId: "admin-1", adminName: "A", maxParticipants: 8,
  regStart: new Date(Date.now() - 1e6), regEnd: new Date(Date.now() + 1e6),
  published: true, started: false, bracketType: "double", participants: people(8), matches: [], ...extra,
});
const admin = { uid: "admin-1", displayName: "A", email: "a@t.com" };

async function openScores(t) {
  const onUpdate = vi.fn();
  const user = userEvent.setup();
  render(<TournamentDetail tournament={t} user={admin} onBack={() => {}} onUpdate={onUpdate} onDelete={() => {}} />, { wrapper: ToastProvider });
  await user.click(screen.getByRole("button", { name: "Set Scores" }));
  return { user, onUpdate };
}
const labels = () => [...document.querySelectorAll(".rank-score-label")].map((e) => e.textContent);

beforeEach(() => vi.clearAllMocks());

describe("Score Settings modal - available positions", () => {
  it("shows only the positions that exist for a double elimination bracket", async () => {
    await openScores(tournament());
    expect(labels()).toEqual(["1st Place", "2nd Place", "3rd Place", "4th Place", "5th-6th Place", "7th-8th Place"]);
    expect(screen.getByText(/only the positions that exist for 8 players/i)).toBeInTheDocument();
  });

  it("follows the number of registered players, not the maximum", async () => {
    await openScores(tournament({ maxParticipants: 16, participants: people(4) }));
    expect(labels()).toEqual(["1st Place", "2nd Place", "3rd Place", "4th Place"]);
  });

  it("falls back to the maximum when nobody has registered yet", async () => {
    await openScores(tournament({ maxParticipants: 16, participants: [] }));
    expect(labels()).toEqual(["1st Place", "2nd Place", "3rd Place", "4th Place", "5th-6th Place", "7th-8th Place", "9th-12th Place", "13th-16th Place"]);
    expect(document.querySelector(".rank-positions-note").textContent).toMatch(/based on the maximum number of players/);
  });

  it("keeps every position for single elimination, exactly as before", async () => {
    await openScores(tournament({ bracketType: "single" }));
    expect(labels()).toHaveLength(8);
    expect(labels()[0]).toBe("1st Place");
    expect(labels()[7]).toBe("8th Place");
    expect(screen.queryByText(/only the positions that exist/i)).not.toBeInTheDocument();
  });

  it("saves points by position number, so shared positions keep their slot", async () => {
    const { user, onUpdate } = await openScores(tournament({ rankScores: [100, 70, 50, 40, 30, 0, 20, 0] }));
    const inputs = [...document.querySelectorAll(".rank-score-input")];
    expect(inputs.map((i) => i.value)).toEqual(["100", "70", "50", "40", "30", "20"]);
    await user.clear(inputs[4]);
    await user.type(inputs[4], "35");
    await user.click(screen.getByRole("button", { name: "Save Scores" }));

    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    expect(mockUpdateDoc.mock.calls[0][1].rankScores).toEqual([100, 70, 50, 40, 35, 0, 20, 0]);
    expect(onUpdate).toHaveBeenCalled();
  });

  it("uses the tiers of a Final Championship", async () => {
    const t = tournament({
      tournamentType: "final_championship",
      participants: people(8).map((p, i) => ({ ...p, tier: i < 2 ? "champion" : i < 4 ? "winner" : "regular" })),
    });
    await openScores(t);
    expect(labels()[0]).toBe("1st Place");
    expect(labels().length).toBeGreaterThanOrEqual(4);
  });
});
