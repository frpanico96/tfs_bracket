import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TournamentList from "../components/TournamentList";

const futureDate = new Date(Date.now() + 86400000);
const pastDate = new Date(Date.now() - 86400000);

const baseTournament = (overrides = {}) => ({
  id: "t1",
  name: "Test Tournament",
  maxParticipants: 8,
  participants: [],
  published: true,
  adminId: "admin-1",
  regStart: pastDate,
  regEnd: futureDate,
  createdAt: new Date(),
  ...overrides,
});

const mockUser = { uid: "admin-1" };

describe("TournamentList", () => {
  it("renders empty state with create prompt for admin", () => {
    render(
      <TournamentList tournaments={[]} user={mockUser} isGlobalAdmin={true} onSelect={() => {}} onCreate={() => {}} onDelete={() => {}} />
    );
    expect(screen.getByText("No tournaments yet. Create one!")).toBeInTheDocument();
  });

  it("renders empty state without create prompt for non-admin", () => {
    render(
      <TournamentList tournaments={[]} user={mockUser} isGlobalAdmin={false} onSelect={() => {}} onCreate={() => {}} onDelete={() => {}} />
    );
    expect(screen.getByText("No tournaments yet.")).toBeInTheDocument();
    expect(screen.queryByText("Create one!")).not.toBeInTheDocument();
  });

  it("renders tournament cards", () => {
    const t = baseTournament();
    render(
      <TournamentList tournaments={[t]} user={mockUser} isGlobalAdmin={false} onSelect={() => {}} onCreate={() => {}} onDelete={() => {}} />
    );
    expect(screen.getByText("Test Tournament")).toBeInTheDocument();
    expect(screen.getByText(/0\/8 players/)).toBeInTheDocument();
  });

  it("shows Join Open badge for publishable tournaments with space", () => {
    const t = baseTournament();
    render(
      <TournamentList tournaments={[t]} user={mockUser} isGlobalAdmin={false} onSelect={() => {}} onCreate={() => {}} onDelete={() => {}} />
    );
    expect(screen.getByText("Join Open")).toBeInTheDocument();
  });

  it("does not show Join Open for past registration", () => {
    const t = baseTournament({ regEnd: pastDate });
    render(
      <TournamentList tournaments={[t]} user={mockUser} isGlobalAdmin={false} onSelect={() => {}} onCreate={() => {}} onDelete={() => {}} />
    );
    expect(screen.queryByText("Join Open")).not.toBeInTheDocument();
  });

  it("shows delete button for admin", () => {
    const t = baseTournament({ adminId: "admin-1" });
    render(
      <TournamentList tournaments={[t]} user={{ uid: "admin-1" }} isGlobalAdmin={false} onSelect={() => {}} onCreate={() => {}} onDelete={() => {}} />
    );
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("does not show delete button for non-admin", () => {
    const t = baseTournament({ adminId: "admin-1" });
    render(
      <TournamentList tournaments={[t]} user={{ uid: "other-user" }} isGlobalAdmin={false} onSelect={() => {}} onCreate={() => {}} onDelete={() => {}} />
    );
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
  });

  it("calls onSelect when card is clicked", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    const t = baseTournament();
    render(
      <TournamentList tournaments={[t]} user={mockUser} isGlobalAdmin={false} onSelect={onSelect} onCreate={() => {}} onDelete={() => {}} />
    );
    await user.click(screen.getByText("Test Tournament"));
    expect(onSelect).toHaveBeenCalledWith(t);
  });

  it("calls onDelete after confirming delete", async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    const t = baseTournament();
    render(
      <TournamentList tournaments={[t]} user={mockUser} isGlobalAdmin={false} onSelect={() => {}} onCreate={() => {}} onDelete={onDelete} />
    );
    await user.click(screen.getByText("Delete"));
    expect(screen.getByText(/Are you sure/)).toBeInTheDocument();
    await user.click(screen.getByText("Delete", { selector: ".btn-danger" }));
    expect(onDelete).toHaveBeenCalledWith("t1");
  });

  it("cancels delete on Cancel click", async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    const t = baseTournament();
    render(
      <TournamentList tournaments={[t]} user={mockUser} isGlobalAdmin={false} onSelect={() => {}} onCreate={() => {}} onDelete={onDelete} />
    );
    await user.click(screen.getByText("Delete"));
    await user.click(screen.getByText("Cancel"));
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("shows create button for global admin", () => {
    render(
      <TournamentList tournaments={[baseTournament()]} user={mockUser} isGlobalAdmin={true} onSelect={() => {}} onCreate={() => {}} onDelete={() => {}} />
    );
    expect(screen.getByText("+ Create Tournament")).toBeInTheDocument();
  });

  it("hides create button for non-admin", () => {
    render(
      <TournamentList tournaments={[baseTournament()]} user={mockUser} isGlobalAdmin={false} onSelect={() => {}} onCreate={() => {}} onDelete={() => {}} />
    );
    expect(screen.queryByText("+ Create Tournament")).not.toBeInTheDocument();
  });

  it("calls onCreate when create button is clicked", async () => {
    const onCreate = vi.fn();
    const user = userEvent.setup();
    render(
      <TournamentList tournaments={[baseTournament()]} user={mockUser} isGlobalAdmin={true} onSelect={() => {}} onCreate={onCreate} onDelete={() => {}} />
    );
    await user.click(screen.getByText("+ Create Tournament"));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it("shows Completed badge when all matches have winners", () => {
    const t = baseTournament({
      started: true,
      matches: [
        { id: "m1", player1: "A", player2: "B", winner: 0, isPlayed: true },
        { id: "m2", player1: "C", player2: "D", winner: 1, isPlayed: true },
      ],
    });
    const { container } = render(
      <TournamentList tournaments={[t]} user={mockUser} isGlobalAdmin={false} onSelect={() => {}} onCreate={() => {}} onDelete={() => {}} />
    );
    expect(container.querySelector(".badge-completed")).toBeInTheDocument();
    expect(screen.queryByText("Join Open")).not.toBeInTheDocument();
  });

  it("shows Published status for unstarted tournament", () => {
    const t = baseTournament();
    render(
      <TournamentList tournaments={[t]} user={mockUser} isGlobalAdmin={false} onSelect={() => {}} onCreate={() => {}} onDelete={() => {}} />
    );
    expect(screen.getByText(/Published/)).toBeInTheDocument();
    expect(screen.queryByText("Completed")).not.toBeInTheDocument();
  });

  it("does not show Completed badge when matches have no winners", () => {
    const t = baseTournament({
      started: true,
      matches: [
        { id: "m1", player1: "A", player2: "B", winner: null, isPlayed: false },
      ],
    });
    render(
      <TournamentList tournaments={[t]} user={mockUser} isGlobalAdmin={false} onSelect={() => {}} onCreate={() => {}} onDelete={() => {}} />
    );
    expect(screen.queryByText("Completed")).not.toBeInTheDocument();
  });

  it("sorts completed tournaments after active ones", () => {
    const { container } = render(
      <TournamentList
        tournaments={[
          baseTournament({
            id: "t-active",
            name: "Active Tournament",
            started: true,
            matches: [{ id: "m1", player1: "A", player2: "B", winner: null, isPlayed: false }],
          }),
          baseTournament({
            id: "t-done",
            name: "Done Tournament",
            started: true,
            matches: [{ id: "m2", player1: "C", player2: "D", winner: 0, isPlayed: true }],
          }),
        ]}
        user={mockUser}
        isGlobalAdmin={false}
        onSelect={() => {}}
        onCreate={() => {}}
        onDelete={() => {}}
      />
    );
    const cards = container.querySelectorAll(".card h3");
    expect(cards[0].textContent).toBe("Active Tournament");
    expect(cards[1].textContent).toBe("Done Tournament");
  });

  it("applies card-completed class to completed tournaments", () => {
    const t = baseTournament({
      started: true,
      matches: [{ id: "m1", player1: "A", player2: "B", winner: 0, isPlayed: true }],
    });
    const { container } = render(
      <TournamentList tournaments={[t]} user={mockUser} isGlobalAdmin={false} onSelect={() => {}} onCreate={() => {}} onDelete={() => {}} />
    );
    expect(container.querySelector(".card-completed")).toBeInTheDocument();
  });
});
