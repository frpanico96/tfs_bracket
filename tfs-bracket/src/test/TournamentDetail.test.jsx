import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { mockDoc, mockUpdateDoc, logEvent } = vi.hoisted(() => ({
  mockDoc: vi.fn(),
  mockUpdateDoc: vi.fn(),
  logEvent: vi.fn(),
}));

vi.mock("../firebase", () => ({
  doc: mockDoc,
  updateDoc: mockUpdateDoc,
  db: {},
}));

vi.mock("../utils/logger", () => ({ logEvent }));

vi.mock("../utils/bracket", () => ({
  generateBracket: vi.fn(() => []),
  generateDoubleEliminationBracket: vi.fn(() => []),
  advanceBracket: vi.fn(() => []),
  parseFirestoreDate: vi.fn((v) => v instanceof Date ? v : new Date(v)),
  computeRankings: vi.fn(() => []),
}));

let mockOnSave = null;

vi.mock("../components/BracketView", () => ({ default: () => <div data-testid="bracket-view" /> }));
vi.mock("../components/TournamentSidebar", () => ({ default: ({ isOpen }) => <div data-testid="sidebar">Sidebar {isOpen ? "open" : "closed"}</div> }));
vi.mock("../components/MatchScoreModal", () => ({
  default: ({ isOpen, onSave }) => {
    mockOnSave = onSave;
    return isOpen ? <div data-testid="score-modal" /> : null;
  },
}));

import TournamentDetail from "../components/TournamentDetail";

const now = new Date();
const futureDate = new Date(now.getTime() + 86400000);
const pastDate = new Date(now.getTime() - 86400000);

const baseTournament = {
  id: "t-1",
  name: "Test Tournament",
  adminId: "admin-1",
  adminName: "Admin User",
  maxParticipants: 16,
  regStart: pastDate,
  regEnd: futureDate,
  published: true,
  started: false,
  bracketType: "single",
  participants: [],
  matches: [],
};

const adminUser = { uid: "admin-1", displayName: "Admin User", email: "admin@test.com" };
const otherUser = { uid: "user-2", displayName: "Other User", email: "other@test.com" };

beforeEach(() => {
  vi.clearAllMocks();
  mockOnSave = null;
});

describe("TournamentDetail - Manual Participant Addition", () => {
  it("shows Add Participant button for admin when tournament hasn't started", () => {
    render(
      <TournamentDetail
        tournament={baseTournament}
        user={adminUser}
        onBack={() => {}}
        onUpdate={() => {}}
        onDelete={() => {}}
      />
    );
    expect(screen.getByText("+ Add Participant")).toBeInTheDocument();
  });

  it("does not show Add Participant button for non-admin users", () => {
    render(
      <TournamentDetail
        tournament={baseTournament}
        user={otherUser}
        onBack={() => {}}
        onUpdate={() => {}}
        onDelete={() => {}}
      />
    );
    expect(screen.queryByText("+ Add Participant")).not.toBeInTheDocument();
  });

  it("does not show Add Participant button when tournament has started", () => {
    render(
      <TournamentDetail
        tournament={{ ...baseTournament, started: true, matches: [{ id: "r1-m0", round: 1, matchIndex: 0, player1: "A", player2: "B", winner: null, isPlayed: false, prevMatch1: null, prevMatch2: null, winCondition: "ft3" }] }}
        user={adminUser}
        onBack={() => {}}
        onUpdate={() => {}}
        onDelete={() => {}}
      />
    );
    expect(screen.queryByText("+ Add Participant")).not.toBeInTheDocument();
  });

  it("opens modal when Add Participant is clicked", async () => {
    const user = userEvent.setup();
    render(
      <TournamentDetail
        tournament={baseTournament}
        user={adminUser}
        onBack={() => {}}
        onUpdate={() => {}}
        onDelete={() => {}}
      />
    );
    await user.click(screen.getByText("+ Add Participant"));
    expect(screen.getByText("Add Participant")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Player name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("player@example.com")).toBeInTheDocument();
  });

  it("disables Add button when name field is empty", async () => {
    const user = userEvent.setup();
    render(
      <TournamentDetail
        tournament={baseTournament}
        user={adminUser}
        onBack={() => {}}
        onUpdate={() => {}}
        onDelete={() => {}}
      />
    );
    await user.click(screen.getByText("+ Add Participant"));
    const addButton = screen.getByText("Add");
    expect(addButton).toBeDisabled();
  });

  it("submits with valid name and calls updateDoc and onUpdate", async () => {
    const onUpdate = vi.fn();
    mockDoc.mockReturnValue({ id: "t-1" });
    mockUpdateDoc.mockResolvedValueOnce();
    const user = userEvent.setup();

    render(
      <TournamentDetail
        tournament={baseTournament}
        user={adminUser}
        onBack={() => {}}
        onUpdate={onUpdate}
        onDelete={() => {}}
      />
    );

    await user.click(screen.getByText("+ Add Participant"));
    await user.type(screen.getByPlaceholderText("Player name"), "New Player");
    await user.click(screen.getByText("Add"));

    expect(mockDoc).toHaveBeenCalledWith({}, "tournaments", "t-1");
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    expect(mockUpdateDoc.mock.calls[0][1].participants).toHaveLength(1);
    expect(mockUpdateDoc.mock.calls[0][1].participants[0].name).toBe("New Player");
    expect(mockUpdateDoc.mock.calls[0][1].participants[0].id).toMatch(/^manual-/);
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });

  it("adds participant with email when provided", async () => {
    const onUpdate = vi.fn();
    mockDoc.mockReturnValue({ id: "t-1" });
    mockUpdateDoc.mockResolvedValueOnce();
    const user = userEvent.setup();

    render(
      <TournamentDetail
        tournament={baseTournament}
        user={adminUser}
        onBack={() => {}}
        onUpdate={onUpdate}
        onDelete={() => {}}
      />
    );

    await user.click(screen.getByText("+ Add Participant"));
    await user.type(screen.getByPlaceholderText("Player name"), "John Doe");
    await user.type(screen.getByPlaceholderText("player@example.com"), "john@example.com");
    await user.click(screen.getByText("Add"));

    expect(mockUpdateDoc.mock.calls[0][1].participants[0].email).toBe("john@example.com");
  });

  it("closes modal on Cancel and resets form state", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <TournamentDetail
        tournament={baseTournament}
        user={adminUser}
        onBack={() => {}}
        onUpdate={() => {}}
        onDelete={() => {}}
      />
    );

    await user.click(screen.getByText("+ Add Participant"));
    await user.type(screen.getByPlaceholderText("Player name"), "Some Player");
    await user.click(screen.getByText("Cancel"));

    rerender(
      <TournamentDetail
        tournament={baseTournament}
        user={adminUser}
        onBack={() => {}}
        onUpdate={() => {}}
        onDelete={() => {}}
      />
    );

    expect(screen.queryByText("Add Participant")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Player name")).not.toBeInTheDocument();
  });

  it("logs event on successful participant addition", async () => {
    mockDoc.mockReturnValue({ id: "t-1" });
    mockUpdateDoc.mockResolvedValueOnce();
    const user = userEvent.setup();

    render(
      <TournamentDetail
        tournament={{ ...baseTournament, participants: [] }}
        user={adminUser}
        onBack={() => {}}
        onUpdate={() => {}}
        onDelete={() => {}}
      />
    );

    await user.click(screen.getByText("+ Add Participant"));
    await user.type(screen.getByPlaceholderText("Player name"), "Log Test");
    await user.click(screen.getByText("Add"));

    expect(logEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: "add_manual_participant" })
    );
  });

  it("appends to existing participants array", async () => {
    const onUpdate = vi.fn();
    mockDoc.mockReturnValue({ id: "t-1" });
    mockUpdateDoc.mockResolvedValueOnce();

    const tournamentWithPlayers = {
      ...baseTournament,
      participants: [
        { id: "existing-1", name: "Existing Player", email: "existing@test.com" },
      ],
    };

    const user = userEvent.setup();
    render(
      <TournamentDetail
        tournament={tournamentWithPlayers}
        user={adminUser}
        onBack={() => {}}
        onUpdate={onUpdate}
        onDelete={() => {}}
      />
    );

    await user.click(screen.getByText("+ Add Participant"));
    await user.type(screen.getByPlaceholderText("Player name"), "Another Player");
    await user.click(screen.getByText("Add"));

    expect(mockUpdateDoc.mock.calls[0][1].participants).toHaveLength(2);
    expect(mockUpdateDoc.mock.calls[0][1].participants[0].name).toBe("Existing Player");
    expect(mockUpdateDoc.mock.calls[0][1].participants[1].name).toBe("Another Player");
  });
});

describe("TournamentDetail - Input Validation", () => {
  const startedTournament = {
    ...baseTournament,
    started: true,
    matches: [{ id: "r1-m0", round: 1, matchIndex: 0, player1: "A", player2: "B", winner: null, isPlayed: false, prevMatch1: null, prevMatch2: null, winCondition: "ft3" }],
  };

  it("rejects invalid email format when adding participant", async () => {
    mockDoc.mockReturnValue({ id: "t-1" });
    mockUpdateDoc.mockResolvedValueOnce();
    const user = userEvent.setup();

    render(
      <TournamentDetail
        tournament={baseTournament}
        user={adminUser}
        onBack={() => {}}
        onUpdate={() => {}}
        onDelete={() => {}}
      />
    );

    await user.click(screen.getByText("+ Add Participant"));
    await user.type(screen.getByPlaceholderText("Player name"), "Bad Email");
    await user.type(screen.getByPlaceholderText("player@example.com"), "not-an-email");
    await user.click(screen.getByText("Add"));

    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it("saves with auto-generated email when email is empty", async () => {
    mockDoc.mockReturnValue({ id: "t-1" });
    mockUpdateDoc.mockResolvedValueOnce();
    const user = userEvent.setup();

    render(
      <TournamentDetail
        tournament={baseTournament}
        user={adminUser}
        onBack={() => {}}
        onUpdate={() => {}}
        onDelete={() => {}}
      />
    );

    await user.click(screen.getByText("+ Add Participant"));
    await user.type(screen.getByPlaceholderText("Player name"), "John Doe");
    await user.click(screen.getByText("Add"));

    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    expect(mockUpdateDoc.mock.calls[0][1].participants[0].email).toBe("john.doe@manual.local");
  });

  it("rejects negative scores on save score handler", async () => {
    mockDoc.mockReturnValue({ id: "t-1" });
    mockUpdateDoc.mockResolvedValueOnce();
    const user = userEvent.setup();

    render(
      <TournamentDetail
        tournament={startedTournament}
        user={adminUser}
        onBack={() => {}}
        onUpdate={() => {}}
        onDelete={() => {}}
      />
    );

    await user.click(screen.getByTestId("bracket-view"));

    if (mockOnSave) {
      mockOnSave(startedTournament.matches[0], { p1Score: -1, p2Score: 3, winnerIndex: 1 });
    }

    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it("rejects non-number scores on save score handler", async () => {
    mockDoc.mockReturnValue({ id: "t-1" });
    mockUpdateDoc.mockResolvedValueOnce();
    const user = userEvent.setup();

    render(
      <TournamentDetail
        tournament={startedTournament}
        user={adminUser}
        onBack={() => {}}
        onUpdate={() => {}}
        onDelete={() => {}}
      />
    );

    await user.click(screen.getByTestId("bracket-view"));

    if (mockOnSave) {
      mockOnSave(startedTournament.matches[0], { p1Score: "abc", p2Score: 3, winnerIndex: 1 });
    }

    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it("rejects invalid winnerIndex on save score handler", async () => {
    mockDoc.mockReturnValue({ id: "t-1" });
    mockUpdateDoc.mockResolvedValueOnce();
    const user = userEvent.setup();

    render(
      <TournamentDetail
        tournament={startedTournament}
        user={adminUser}
        onBack={() => {}}
        onUpdate={() => {}}
        onDelete={() => {}}
      />
    );

    await user.click(screen.getByTestId("bracket-view"));

    if (mockOnSave) {
      mockOnSave(startedTournament.matches[0], { p1Score: 1, p2Score: 3, winnerIndex: 99 });
    }

    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });
});
