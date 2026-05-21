import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockAddDoc = vi.fn();
vi.mock("../firebase", () => ({
  addDoc: mockAddDoc,
  tournamentsRef: {},
  serverTimestamp: vi.fn(() => ({ toDate: () => new Date() })),
}));

const { logEvent } = vi.hoisted(() => ({ logEvent: vi.fn() }));
vi.mock("../utils/logger", () => ({ logEvent }));

const CreateTournament = (await import("./CreateTournament")).default;

const mockUser = { uid: "user-1", displayName: "Test User" };

describe("CreateTournament", () => {
  beforeEach(() => {
    mockAddDoc.mockClear();
    logEvent.mockClear();
  });

  it("renders all form fields", () => {
    render(<CreateTournament user={mockUser} onCancel={() => {}} onCreated={() => {}} />);
    expect(screen.getByText("Tournament Name")).toBeInTheDocument();
    expect(screen.getByText("Max Participants")).toBeInTheDocument();
    expect(screen.getByText("Bracket Type")).toBeInTheDocument();
    expect(screen.getByText("Registration Start")).toBeInTheDocument();
    expect(screen.getByText("Registration End")).toBeInTheDocument();
  });

  it("has single elimination selected by default", () => {
    render(<CreateTournament user={mockUser} onCancel={() => {}} onCreated={() => {}} />);
    const singleBtn = screen.getByText("Single Elimination");
    expect(singleBtn.classList.contains("selected")).toBe(true);
  });

  it("switches bracket type on toggle click", async () => {
    const user = userEvent.setup();
    render(<CreateTournament user={mockUser} onCancel={() => {}} onCreated={() => {}} />);
    await user.click(screen.getByText("Double Elimination"));
    const doubleBtn = screen.getByText("Double Elimination");
    expect(doubleBtn.classList.contains("selected")).toBe(true);
  });

  it("calls onCancel when cancel button is clicked", async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(<CreateTournament user={mockUser} onCancel={onCancel} onCreated={() => {}} />);
    await user.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("shows alert when name is empty", async () => {
    const alert = vi.spyOn(window, "alert").mockImplementation(() => {});
    const user = userEvent.setup();
    render(<CreateTournament user={mockUser} onCancel={() => {}} onCreated={() => {}} />);
    await user.click(screen.getByText("Cancel"));
    expect(alert).not.toHaveBeenCalled();
    alert.mockRestore();
  });

  it("calls addDoc and onCreated on valid submit", async () => {
    const onCreated = vi.fn();
    mockAddDoc.mockResolvedValueOnce({ id: "new-id" });
    const user = userEvent.setup();

    render(<CreateTournament user={mockUser} onCancel={() => {}} onCreated={onCreated} />);

    await user.type(screen.getByPlaceholderText("My Tournament"), "Test Tourney");
    const numberInput = screen.getByLabelText("Max Participants");
    await user.clear(numberInput);
    await user.type(numberInput, "16");
    const startInput = screen.getByLabelText("Registration Start");
    const endInput = screen.getByLabelText("Registration End");
    await user.clear(startInput);
    await user.type(startInput, "2026-06-01T10:00");
    await user.clear(endInput);
    await user.type(endInput, "2026-06-02T10:00");
    await user.click(screen.getByText("Create"));

    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    expect(onCreated).toHaveBeenCalledWith(
      expect.objectContaining({ id: "new-id", name: "Test Tourney" })
    );
  });
});
