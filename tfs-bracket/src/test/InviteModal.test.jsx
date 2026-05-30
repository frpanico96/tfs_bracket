import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { mockCreateInvite, mockBuildInviteLink, mockLogEvent } = vi.hoisted(() => ({
  mockCreateInvite: vi.fn(),
  mockBuildInviteLink: vi.fn((token) => `https://example.com?invite=${token}`),
  mockLogEvent: vi.fn(),
}));

vi.mock("../utils/invite", () => ({
  createInvite: mockCreateInvite,
  buildInviteLink: mockBuildInviteLink,
  INVITE_ROLES: [
    { value: "tournament_admin", label: "Tournament Admin", desc: "Can create and manage tournaments" },
    { value: "player", label: "Player", desc: "Can view and join tournaments" },
  ],
}));

vi.mock("../utils/logger", () => ({ logEvent: mockLogEvent }));

import InviteModal from "../components/InviteModal";

const mockUser = { uid: "user-1", displayName: "Admin User" };

describe("InviteModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the modal with email input and role selector", () => {
    render(<InviteModal user={mockUser} onClose={() => {}} />);
    expect(screen.getByText("Invite User")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("user@gmail.com")).toBeInTheDocument();
    expect(screen.getByText("Tournament Admin")).toBeInTheDocument();
    expect(screen.getByText("Player")).toBeInTheDocument();
    expect(screen.getByText("Generate Invite Link")).toBeInTheDocument();
  });

  it("does not show invite link initially", () => {
    render(<InviteModal user={mockUser} onClose={() => {}} />);
    expect(screen.queryByText("Copy Link")).not.toBeInTheDocument();
  });

  it("selects Tournament Admin role by default", () => {
    render(<InviteModal user={mockUser} onClose={() => {}} />);
    const adminOption = screen.getByText("Tournament Admin").closest(".modal-option");
    expect(adminOption).toHaveClass("selected");
  });

  it("rejects non-gmail emails", async () => {
    const user = userEvent.setup();
    render(<InviteModal user={mockUser} onClose={() => {}} />);

    await user.type(screen.getByPlaceholderText("user@gmail.com"), "test@outlook.com");
    await user.click(screen.getByText("Generate Invite Link"));

    expect(screen.getByText(/only @gmail.com emails are supported/i)).toBeInTheDocument();
    expect(mockCreateInvite).not.toHaveBeenCalled();
  });

  it("generates invite link for valid gmail", async () => {
    mockCreateInvite.mockResolvedValue({ id: "invite-1", token: "abc-123" });

    const user = userEvent.setup();
    render(<InviteModal user={mockUser} onClose={() => {}} />);

    await user.type(screen.getByPlaceholderText("user@gmail.com"), "newuser@gmail.com");
    await user.click(screen.getByText("Generate Invite Link"));

    expect(mockCreateInvite).toHaveBeenCalledWith({
      email: "newuser@gmail.com",
      role: "tournament_admin",
      createdBy: "user-1",
      createdByName: "Admin User",
    });
    expect(screen.getByText("Invite created successfully!")).toBeInTheDocument();
    expect(screen.getByText("Copy Link")).toBeInTheDocument();
  });

  it("logs event on successful invite creation", async () => {
    mockCreateInvite.mockResolvedValue({ id: "invite-1", token: "abc-123" });

    const user = userEvent.setup();
    render(<InviteModal user={mockUser} onClose={() => {}} />);

    await user.type(screen.getByPlaceholderText("user@gmail.com"), "newuser@gmail.com");
    await user.click(screen.getByText("Generate Invite Link"));

    expect(mockLogEvent).toHaveBeenCalledWith({
      action: "invite_created",
      details: { email: "newuser@gmail.com", role: "tournament_admin", createdBy: "user-1" },
    });
  });

  it("shows invite link after generation", async () => {
    mockCreateInvite.mockResolvedValue({ id: "invite-1", token: "xyz-789" });

    const user = userEvent.setup();
    render(<InviteModal user={mockUser} onClose={() => {}} />);

    await user.type(screen.getByPlaceholderText("user@gmail.com"), "player@gmail.com");
    await user.click(screen.getByText("Generate Invite Link"));

    expect(screen.getByText(/https:\/\/example.com\?invite=xyz-789/)).toBeInTheDocument();
  });

  it("shows existing invite message when invite already exists", async () => {
    mockCreateInvite.mockResolvedValue({ id: "invite-1", token: "abc-123", existing: true });

    const user = userEvent.setup();
    render(<InviteModal user={mockUser} onClose={() => {}} />);

    await user.type(screen.getByPlaceholderText("user@gmail.com"), "existing@gmail.com");
    await user.click(screen.getByText("Generate Invite Link"));

    expect(screen.getByText(/Invite already exists/i)).toBeInTheDocument();
    expect(screen.getByText("Copy Link")).toBeInTheDocument();
  });

  it("logs invite_reused when existing invite is returned", async () => {
    mockCreateInvite.mockResolvedValue({ id: "invite-1", token: "abc-123", existing: true });

    const user = userEvent.setup();
    render(<InviteModal user={mockUser} onClose={() => {}} />);

    await user.type(screen.getByPlaceholderText("user@gmail.com"), "existing@gmail.com");
    await user.click(screen.getByText("Generate Invite Link"));

    expect(mockLogEvent).toHaveBeenCalledWith({
      action: "invite_reused",
      details: { email: "existing@gmail.com", role: "tournament_admin", createdBy: "user-1" },
    });
  });

  it("shows error on failed invite generation", async () => {
    mockCreateInvite.mockRejectedValue(new Error("Network error"));

    const user = userEvent.setup();
    render(<InviteModal user={mockUser} onClose={() => {}} />);

    await user.type(screen.getByPlaceholderText("user@gmail.com"), "test@gmail.com");
    await user.click(screen.getByText("Generate Invite Link"));

    expect(screen.getByText(/failed to create invite/i)).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<InviteModal user={mockUser} onClose={onClose} />);

    const closeBtn = screen.getByText("×");
    await user.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when overlay is clicked", async () => {
    const onClose = vi.fn();
    render(<InviteModal user={mockUser} onClose={onClose} />);

    const overlay = screen.getByText("Invite User").closest(".modal-overlay");
    await userEvent.setup().click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("disables generate button while generating", async () => {
    mockCreateInvite.mockImplementation(() => new Promise(() => {}));

    const user = userEvent.setup();
    render(<InviteModal user={mockUser} onClose={() => {}} />);

    await user.type(screen.getByPlaceholderText("user@gmail.com"), "test@gmail.com");
    await user.click(screen.getByText("Generate Invite Link"));

    expect(screen.getByText("Generating...")).toBeInTheDocument();
    expect(screen.getByText("Generating...")).toBeDisabled();
  });
});
