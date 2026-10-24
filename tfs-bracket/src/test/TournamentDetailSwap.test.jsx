import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../components/Toast";

const { mockUpdateDoc } = vi.hoisted(() => ({ mockUpdateDoc: vi.fn() }));
const swapArgs = { current: null };

vi.mock("../firebase", () => ({
  db: {}, doc: vi.fn((...a) => a.join("/")), updateDoc: mockUpdateDoc, getDoc: vi.fn(),
  getDocs: vi.fn(() => ({ docs: [] })), addDoc: vi.fn(), setDoc: vi.fn(), deleteDoc: vi.fn(),
  increment: vi.fn(), serverTimestamp: vi.fn(() => new Date()), usersRef: {},
  registrationTokensRef: {}, registrationEntriesRef: {}, bracketTokensRef: {},
  query: vi.fn(), where: vi.fn(), onSnapshot: vi.fn(() => () => {}),
}));
vi.mock("../utils/logger", () => ({ logEvent: vi.fn() }));
vi.mock("../components/TournamentSidebar", () => ({ default: () => <div /> }));
// The bracket view is stubbed: it just fires the swap the test asks for.
vi.mock("../components/BracketView", () => ({
  default: ({ canSwap, onSwapPlayers }) => (
    <div>{canSwap && <button onClick={() => onSwapPlayers(...swapArgs.current)}>do-swap</button>}</div>
  ),
}));

import TournamentDetail from "../components/TournamentDetail";

const base = { winner: null, isPlayed: false, winCondition: "ft3", scoreP1: 0, scoreP2: 0 };
const matches = () => [
  { ...base, id: "wb-r1-m0", bracket: "winners", round: 1, matchIndex: 0, player1: "Ann", player2: "Bob", prevMatch1: null, prevMatch2: null },
  { ...base, id: "wb-r2-m0", bracket: "winners", round: 2, matchIndex: 0, player1: "TBD", player2: "Cat", prevMatch1: "wb-r1-m0", prevMatch2: null },
  { ...base, id: "wb-r2-m1", bracket: "winners", round: 2, matchIndex: 1, player1: "Dan", player2: "Eve", prevMatch1: null, prevMatch2: null },
];
const tournament = (extra = {}) => ({
  id: "t1", name: "T", adminId: "admin-1", adminName: "A", maxParticipants: 8,
  regStart: new Date(Date.now() - 1e6), regEnd: new Date(Date.now() + 1e6),
  published: true, started: true, bracketType: "double",
  participants: ["Ann", "Bob", "Cat", "Dan", "Eve"].map((name, i) => ({ id: `p${i}`, name, email: "", tier: "regular" })),
  matches: matches(), ...extra,
});
const admin = { uid: "admin-1", displayName: "A", email: "a@t.com" };

async function swap(t, args) {
  swapArgs.current = args;
  const onUpdate = vi.fn();
  const user = userEvent.setup();
  render(<TournamentDetail tournament={t} user={admin} onBack={() => {}} onUpdate={onUpdate} onDelete={() => {}} />, { wrapper: ToastProvider });
  await user.click(screen.getByRole("button", { name: /Swap Players/ }));
  await user.click(screen.getByText("do-swap"));
  return onUpdate;
}

beforeEach(() => vi.clearAllMocks());

describe("TournamentDetail - swapping with TBD slots", () => {
  it("saves a named <-> TBD swap of the same round, feeder link included", async () => {
    const onUpdate = await swap(tournament(), ["wb-r2-m1", 0, "wb-r2-m0", 0]);
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const saved = mockUpdateDoc.mock.calls[0][1].matches;
    const a = saved.find((m) => m.id === "wb-r2-m0");
    const b = saved.find((m) => m.id === "wb-r2-m1");
    expect([a.player1, a.prevMatch1]).toEqual(["Dan", null]);
    expect([b.player1, b.prevMatch1]).toEqual(["TBD", "wb-r1-m0"]);
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ matches: saved }));
  });

  it("refuses a cross-round TBD swap with a message and writes nothing", async () => {
    await swap(tournament(), ["wb-r1-m0", 0, "wb-r2-m0", 0]);
    expect(mockUpdateDoc).not.toHaveBeenCalled();
    expect(await screen.findByText(/These slots can't be swapped/)).toBeInTheDocument();
  });

  it("lets a Final Championship Winner swap with a TBD slot of their round", async () => {
    const t = tournament({
      tournamentType: "final_championship",
      participants: tournament().participants.map((p) => (p.name === "Dan" ? { ...p, tier: "winner" } : p)),
    });
    await swap(t, ["wb-r2-m1", 0, "wb-r2-m0", 0]);
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
  });
});
