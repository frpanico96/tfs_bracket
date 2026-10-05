import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../components/Toast";

const mockAddDoc = vi.fn();
vi.mock("../firebase", () => ({
  addDoc: mockAddDoc,
  tournamentsRef: {},
  serverTimestamp: vi.fn(() => ({ toDate: () => new Date() })),
}));
vi.mock("../utils/logger", () => ({ logEvent: vi.fn() }));

const makeGames = (n) => Array.from({ length: n }, (_, i) => ({ id: i + 1, name: `Game ${i + 1}`, image: null }));

// The real picker talks to start.gg; a stub keeps this test about the form.
vi.mock("../components/GamePoolPicker", () => ({
  default: ({ value, onChange }) => (
    <div>
      <span data-testid="pool-size">{value.length}</span>
      <button type="button" onClick={() => onChange(makeGames(5))}>pool-5</button>
      <button type="button" onClick={() => onChange(makeGames(11))}>pool-11</button>
    </div>
  ),
}));

const CreateTournament = (await import("../components/CreateTournament")).default;
const user0 = { uid: "user-1", displayName: "Test User" };

function renderForm(onCreated = () => {}) {
  return render(<CreateTournament user={user0} onCancel={() => {}} onCreated={onCreated} />, { wrapper: ToastProvider });
}

async function fillBasics(user) {
  await user.type(screen.getByPlaceholderText("My Tournament"), "Super Week Final");
  await user.type(screen.getByLabelText("Registration Start"), "2026-06-01T10:00");
  await user.type(screen.getByLabelText("Registration End"), "2026-06-02T10:00");
}

describe("CreateTournament - Final Championship", () => {
  beforeEach(() => mockAddDoc.mockReset());

  it("defaults to a standard tournament with the single-game picker", () => {
    renderForm();
    expect(screen.getByText("Standard").classList.contains("selected")).toBe(true);
    expect(screen.getByText("Bracket Type")).toBeInTheDocument();
    expect(screen.queryByText("Game Pool")).not.toBeInTheDocument();
  });

  it("replaces bracket type and single game with a game pool for a Final Championship", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByText("Final Championship"));
    expect(screen.queryByText("Bracket Type")).not.toBeInTheDocument();
    expect(screen.queryByText("Select a game")).not.toBeInTheDocument();
    expect(screen.getByText("Game Pool")).toBeInTheDocument();
  });

  it("refuses to create without a big enough pool", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByText("Final Championship"));
    await fillBasics(user);
    await user.click(screen.getByText("pool-5"));
    await user.click(screen.getByText("Create"));
    expect(screen.getByText("The game pool needs at least 11 games")).toBeInTheDocument();
    expect(mockAddDoc).not.toHaveBeenCalled();
  });

  it("saves a double-elimination Final Championship with its pool", async () => {
    const onCreated = vi.fn();
    mockAddDoc.mockResolvedValueOnce({ id: "fc-1" });
    const user = userEvent.setup();
    renderForm(onCreated);
    await user.click(screen.getByText("Final Championship"));
    await fillBasics(user);
    await user.click(screen.getByText("pool-11"));
    await user.click(screen.getByText("Create"));

    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    const saved = mockAddDoc.mock.calls[0][1];
    expect(saved).toMatchObject({
      name: "Super Week Final",
      tournamentType: "final_championship",
      bracketType: "double",
      game: null,
    });
    expect(saved.gamePool).toHaveLength(11);
    expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ id: "fc-1", tournamentType: "final_championship" }));
  });

  it("does not add Final Championship fields to a standard tournament", async () => {
    mockAddDoc.mockResolvedValueOnce({ id: "std-1" });
    const user = userEvent.setup();
    renderForm();
    await fillBasics(user);
    await user.click(screen.getByText("Create"));
    const saved = mockAddDoc.mock.calls[0][1];
    expect(saved).not.toHaveProperty("tournamentType");
    expect(saved).not.toHaveProperty("gamePool");
    expect(saved.bracketType).toBe("single");
  });
});
