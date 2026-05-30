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
  regEnd: futureDate,
  createdAt: new Date(),
  ...overrides,
});

const mockUser = { uid: "admin-1" };

describe("TournamentList", () => {
  it("renders empty state when no tournaments", () => {
    render(
      <TournamentList tournaments={[]} user={mockUser} onSelect={() => {}} onCreate={() => {}} onDelete={() => {}} />
    );
    expect(screen.getByText("No tournaments yet. Create one!")).toBeInTheDocument();
  });

  it("renders tournament cards", () => {
    const t = baseTournament();
    render(
      <TournamentList tournaments={[t]} user={mockUser} onSelect={() => {}} onCreate={() => {}} onDelete={() => {}} />
    );
    expect(screen.getByText("Test Tournament")).toBeInTheDocument();
    expect(screen.getByText(/0\/8 players/)).toBeInTheDocument();
  });

  it("shows Join Open badge for publishable tournaments with space", () => {
    const t = baseTournament();
    render(
      <TournamentList tournaments={[t]} user={mockUser} onSelect={() => {}} onCreate={() => {}} onDelete={() => {}} />
    );
    expect(screen.getByText("Join Open")).toBeInTheDocument();
  });

  it("does not show Join Open for past registration", () => {
    const t = baseTournament({ regEnd: pastDate });
    render(
      <TournamentList tournaments={[t]} user={mockUser} onSelect={() => {}} onCreate={() => {}} onDelete={() => {}} />
    );
    expect(screen.queryByText("Join Open")).not.toBeInTheDocument();
  });

  it("shows delete button for admin", () => {
    const t = baseTournament({ adminId: "admin-1" });
    render(
      <TournamentList tournaments={[t]} user={{ uid: "admin-1" }} onSelect={() => {}} onCreate={() => {}} onDelete={() => {}} />
    );
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("does not show delete button for non-admin", () => {
    const t = baseTournament({ adminId: "admin-1" });
    render(
      <TournamentList tournaments={[t]} user={{ uid: "other-user" }} onSelect={() => {}} onCreate={() => {}} onDelete={() => {}} />
    );
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
  });

  it("calls onSelect when card is clicked", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    const t = baseTournament();
    render(
      <TournamentList tournaments={[t]} user={mockUser} onSelect={onSelect} onCreate={() => {}} onDelete={() => {}} />
    );
    await user.click(screen.getByText("Test Tournament"));
    expect(onSelect).toHaveBeenCalledWith(t);
  });

  it("calls onDelete after confirming delete", async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    const t = baseTournament();
    render(
      <TournamentList tournaments={[t]} user={mockUser} onSelect={() => {}} onCreate={() => {}} onDelete={onDelete} />
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
      <TournamentList tournaments={[t]} user={mockUser} onSelect={() => {}} onCreate={() => {}} onDelete={onDelete} />
    );
    await user.click(screen.getByText("Delete"));
    await user.click(screen.getByText("Cancel"));
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("calls onCreate when create button is clicked", async () => {
    const onCreate = vi.fn();
    const user = userEvent.setup();
    render(
      <TournamentList tournaments={[baseTournament()]} user={mockUser} onSelect={() => {}} onCreate={onCreate} onDelete={() => {}} />
    );
    await user.click(screen.getByText("+ Create Tournament"));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });
});
