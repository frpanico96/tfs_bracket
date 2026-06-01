import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { mockCreateInvite, mockCreateGenericInvite, mockBuildInviteLink, mockLogEvent } = vi.hoisted(() => ({
  mockCreateInvite: vi.fn(),
  mockCreateGenericInvite: vi.fn(),
  mockBuildInviteLink: vi.fn((token) => `https://example.com?invite=${token}`),
  mockLogEvent: vi.fn(),
}));

vi.mock("../utils/invite", () => ({
  createInvite: mockCreateInvite,
  createGenericInvite: mockCreateGenericInvite,
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

  describe("non-super-admin user", () => {
    it("shows link invite form with no tabs or role picker", () => {
      render(<InviteModal user={mockUser} onClose={() => {}} />);
      expect(screen.getByText("Create Invite Link")).toBeInTheDocument();
      expect(screen.queryByText("Email Invite")).not.toBeInTheDocument();
      expect(screen.queryByText("Tournament Admin")).not.toBeInTheDocument();
      expect(screen.getByText("Generate Invite Link")).toBeInTheDocument();
    });

    it("does not show invite link initially", () => {
      render(<InviteModal user={mockUser} onClose={() => {}} />);
      expect(screen.queryByText("Copy Link")).not.toBeInTheDocument();
    });

    it("generates generic invite link with maxUses and expiry", async () => {
      mockCreateGenericInvite.mockResolvedValue({ id: "invite-1", token: "abc-123" });
      const future = new Date();
      future.setDate(future.getDate() + 1);
      const futureStr = future.toISOString().slice(0, 16);

      const user = userEvent.setup();
      render(<InviteModal user={mockUser} onClose={() => {}} />);

      const maxUsesInput = screen.getByLabelText("Max Uses");
      await user.clear(maxUsesInput);
      await user.type(maxUsesInput, "5");

      const expiresInput = screen.getByLabelText("Expires At");
      await user.type(expiresInput, futureStr);

      await user.click(screen.getByText("Generate Invite Link"));

      expect(mockCreateGenericInvite).toHaveBeenCalledWith({
        maxUses: 5,
        expiresAt: expect.any(Date),
        createdBy: "user-1",
        createdByName: "Admin User",
      });
      expect(screen.getByText("Invite created successfully!")).toBeInTheDocument();
      expect(screen.getByText("Copy Link")).toBeInTheDocument();
    });

    it("logs event on generic invite creation", async () => {
      mockCreateGenericInvite.mockResolvedValue({ id: "invite-1", token: "abc-123" });
      const future = new Date();
      future.setDate(future.getDate() + 1);
      const futureStr = future.toISOString().slice(0, 16);

      const user = userEvent.setup();
      render(<InviteModal user={mockUser} onClose={() => {}} />);

      const maxUsesInput = screen.getByLabelText("Max Uses");
      await user.clear(maxUsesInput);
      await user.type(maxUsesInput, "3");

      const expiresInput = screen.getByLabelText("Expires At");
      await user.type(expiresInput, futureStr);

      await user.click(screen.getByText("Generate Invite Link"));

      expect(mockLogEvent).toHaveBeenCalledWith({
        action: "generic_invite_created",
        details: { maxUses: 3, expiresAt: expect.any(String), createdBy: "user-1" },
      });
    });

    it("shows error on past expiration date", async () => {
      const user = userEvent.setup();
      render(<InviteModal user={mockUser} onClose={() => {}} />);

      const maxUsesInput = screen.getByLabelText("Max Uses");
      await user.clear(maxUsesInput);
      await user.type(maxUsesInput, "5");

      const expiresInput = screen.getByLabelText("Expires At");
      await user.type(expiresInput, "2020-01-01T00:00");

      await user.click(screen.getByText("Generate Invite Link"));

      expect(screen.getByText(/Expiration must be in the future/i)).toBeInTheDocument();
      expect(mockCreateGenericInvite).not.toHaveBeenCalled();
    });
  });

  describe("super admin user", () => {
    it("renders the modal with both tabs and role selector", () => {
      render(<InviteModal user={mockUser} onClose={() => {}} isSuperAdmin={true} />);
      expect(screen.getByText("Invite User")).toBeInTheDocument();
      expect(screen.getByText("Email Invite")).toBeInTheDocument();
      expect(screen.getByText("Link Invite")).toBeInTheDocument();
      expect(screen.getByText("Tournament Admin")).toBeInTheDocument();
      expect(screen.getByText("Player")).toBeInTheDocument();
      expect(screen.getByText("Generate Invite Link")).toBeInTheDocument();
    });

    it("selects Tournament Admin role by default", () => {
      render(<InviteModal user={mockUser} onClose={() => {}} isSuperAdmin={true} />);
      const adminOption = screen.getByText("Tournament Admin").closest(".modal-option");
      expect(adminOption).toHaveClass("selected");
    });

    it("rejects non-gmail emails", async () => {
      const user = userEvent.setup();
      render(<InviteModal user={mockUser} onClose={() => {}} isSuperAdmin={true} />);

      await user.type(screen.getByPlaceholderText("user@gmail.com"), "test@outlook.com");
      await user.click(screen.getByText("Generate Invite Link"));

      expect(screen.getByText(/only @gmail.com emails are supported/i)).toBeInTheDocument();
      expect(mockCreateInvite).not.toHaveBeenCalled();
    });

    it("generates email invite link for valid gmail", async () => {
      mockCreateInvite.mockResolvedValue({ id: "invite-1", token: "abc-123" });

      const user = userEvent.setup();
      render(<InviteModal user={mockUser} onClose={() => {}} isSuperAdmin={true} />);

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

    it("logs event on successful email invite creation", async () => {
      mockCreateInvite.mockResolvedValue({ id: "invite-1", token: "abc-123" });

      const user = userEvent.setup();
      render(<InviteModal user={mockUser} onClose={() => {}} isSuperAdmin={true} />);

      await user.type(screen.getByPlaceholderText("user@gmail.com"), "newuser@gmail.com");
      await user.click(screen.getByText("Generate Invite Link"));

      expect(mockLogEvent).toHaveBeenCalledWith({
        action: "invite_created",
        details: { email: "newuser@gmail.com", role: "tournament_admin", createdBy: "user-1" },
      });
    });

    it("shows existing invite message when email invite already exists", async () => {
      mockCreateInvite.mockResolvedValue({ id: "invite-1", token: "abc-123", existing: true });

      const user = userEvent.setup();
      render(<InviteModal user={mockUser} onClose={() => {}} isSuperAdmin={true} />);

      await user.type(screen.getByPlaceholderText("user@gmail.com"), "existing@gmail.com");
      await user.click(screen.getByText("Generate Invite Link"));

      expect(screen.getByText(/Invite already exists/i)).toBeInTheDocument();
      expect(screen.getByText("Copy Link")).toBeInTheDocument();
    });

    it("logs invite_reused when existing email invite is returned", async () => {
      mockCreateInvite.mockResolvedValue({ id: "invite-1", token: "abc-123", existing: true });

      const user = userEvent.setup();
      render(<InviteModal user={mockUser} onClose={() => {}} isSuperAdmin={true} />);

      await user.type(screen.getByPlaceholderText("user@gmail.com"), "existing@gmail.com");
      await user.click(screen.getByText("Generate Invite Link"));

      expect(mockLogEvent).toHaveBeenCalledWith({
        action: "invite_reused",
        details: { email: "existing@gmail.com", role: "tournament_admin", createdBy: "user-1" },
      });
    });

    it("shows error on failed email invite generation", async () => {
      mockCreateInvite.mockRejectedValue(new Error("Network error"));

      const user = userEvent.setup();
      render(<InviteModal user={mockUser} onClose={() => {}} isSuperAdmin={true} />);

      await user.type(screen.getByPlaceholderText("user@gmail.com"), "test@gmail.com");
      await user.click(screen.getByText("Generate Invite Link"));

      expect(screen.getByText(/failed to create invite/i)).toBeInTheDocument();
    });
  });

  describe("common behavior", () => {
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

      const overlay = screen.getByText("Create Invite Link").closest(".modal-overlay");
      await userEvent.setup().click(overlay);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("disables generate button while generating", async () => {
      mockCreateGenericInvite.mockImplementation(() => new Promise(() => {}));
      const future = new Date();
      future.setDate(future.getDate() + 1);
      const futureStr = future.toISOString().slice(0, 16);

      const user = userEvent.setup();
      render(<InviteModal user={mockUser} onClose={() => {}} />);

      const maxUsesInput = screen.getByLabelText("Max Uses");
      await user.clear(maxUsesInput);
      await user.type(maxUsesInput, "5");

      const expiresInput = screen.getByLabelText("Expires At");
      await user.type(expiresInput, futureStr);

      await user.click(screen.getByText("Generate Invite Link"));

      expect(screen.getByText("Generating...")).toBeInTheDocument();
      expect(screen.getByText("Generating...")).toBeDisabled();
    });
  });
});
