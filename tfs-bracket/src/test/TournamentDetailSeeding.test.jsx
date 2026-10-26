import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../components/Toast";

const { mockUpdateDoc, mockGetDocs } = vi.hoisted(() => ({ mockUpdateDoc: vi.fn(), mockGetDocs: vi.fn() }));

vi.mock("../firebase", () => ({
  db: {}, doc: vi.fn((...a) => a.join("/")), updateDoc: mockUpdateDoc, getDoc: vi.fn(),
  getDocs: mockGetDocs, addDoc: vi.fn(), setDoc: vi.fn(), deleteDoc: vi.fn(),
  increment: vi.fn(), serverTimestamp: vi.fn(() => new Date()), usersRef: {},
  registrationTokensRef: {}, registrationEntriesRef: {}, bracketTokensRef: {},
  query: vi.fn(), where: vi.fn(), onSnapshot: vi.fn(() => () => {}),
}));
vi.mock("../utils/logger", () => ({ logEvent: vi.fn() }));
vi.mock("../components/BracketView", () => ({ default: () => <div /> }));
vi.mock("../components/TournamentSidebar", () => ({ default: () => <div /> }));

import TournamentDetail from "../components/TournamentDetail";

const names = ["Ann", "Bob", "Cat", "Dan", "Eve", "Fay", "Gus", "Hal"];
const tournament = {
  id: "t1", name: "T", adminId: "admin-1", adminName: "A", maxParticipants: 8,
  regStart: new Date(Date.now() - 1e6), regEnd: new Date(Date.now() + 1e6),
  published: true, started: false, bracketType: "double",
  participants: names.map((name, i) => ({ id: `u${i}`, name, email: "", tier: "regular" })),
  matches: [],
};
const admin = { uid: "admin-1", displayName: "A", email: "a@t.com" };
// Hal 80, Gus 70, Fay 60 ... Ann 10 -> Hal is seed 1, Ann seed 8.
const scoreDocs = names.map((_, i) => ({ id: `u${i}`, data: () => ({ score: (i + 1) * 10 }) }));

async function start() {
  const onUpdate = vi.fn();
  const user = userEvent.setup();
  render(<TournamentDetail tournament={tournament} user={admin} onBack={() => {}} onUpdate={onUpdate} onDelete={() => {}} />, { wrapper: ToastProvider });
  await user.click(screen.getByRole("button", { name: /Start Tournament/ }));
  return mockUpdateDoc.mock.calls[0][1];
}

describe("starting a tournament seeds players by leaderboard score", () => {
  beforeEach(() => { mockUpdateDoc.mockReset(); mockGetDocs.mockReset(); });

  it("pairs best vs worst and stores seeded: true", async () => {
    mockGetDocs.mockResolvedValue({ docs: scoreDocs });
    const update = await start();
    const r1 = update.matches.filter((m) => /^wb-r1-m/.test(m.id)).map((m) => `${m.player1}v${m.player2}`);
    expect(r1).toEqual(["HalvAnn", "EvevDan", "GusvBob", "FayvCat"]); // 1v8, 4v5, 2v7, 3v6
    expect(update.seeded).toBe(true);
    expect(update.started).toBe(true);
  });

  it("falls back to a random draw (seeded: false) when scores can not be read", async () => {
    mockGetDocs.mockRejectedValue(new Error("offline"));
    const update = await start();
    expect(update.matches.length).toBeGreaterThan(0);
    expect(update.seeded).toBe(false);
  });
});
