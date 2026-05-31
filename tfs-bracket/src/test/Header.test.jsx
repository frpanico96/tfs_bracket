import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Header from "../components/Header";

const mockUser = {
  displayName: "Test User",
  photoURL: "https://example.com/photo.jpg",
  uid: "user-1",
};

describe("Header", () => {
  it("renders the app title", () => {
    render(<Header user={mockUser} onLogout={() => {}} onLogoClick={() => {}} />);
    expect(screen.getByRole("heading", { name: /TFS Bracket/ })).toBeInTheDocument();
  });

  it("renders user display name", () => {
    render(<Header user={mockUser} onLogout={() => {}} onLogoClick={() => {}} />);
    expect(screen.getByText("Test User")).toBeInTheDocument();
  });

  it("renders user avatar", () => {
    render(<Header user={mockUser} onLogout={() => {}} onLogoClick={() => {}} />);
    const img = screen.getByAltText("");
    expect(img).toHaveAttribute("src", "https://example.com/photo.jpg");
  });

  it("calls onLogout when logout button is clicked", async () => {
    const onLogout = vi.fn();
    const user = userEvent.setup();
    render(<Header user={mockUser} onLogout={onLogout} onLogoClick={() => {}} />);
    await user.click(screen.getByText("Logout"));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it("calls onLogoClick when title is clicked", async () => {
    const onLogoClick = vi.fn();
    const user = userEvent.setup();
    render(<Header user={mockUser} onLogout={() => {}} onLogoClick={onLogoClick} />);
    await user.click(screen.getByRole("heading", { name: /TFS Bracket/ }));
    expect(onLogoClick).toHaveBeenCalledTimes(1);
  });

  it("renders role badge when role is provided", () => {
    render(<Header user={mockUser} role="admin" onLogout={() => {}} onLogoClick={() => {}} />);
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("does not render role badge when role is not provided", () => {
    render(<Header user={mockUser} onLogout={() => {}} onLogoClick={() => {}} />);
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
    expect(screen.queryByText("Player")).not.toBeInTheDocument();
  });

  it("formats tournament_admin role display", () => {
    render(<Header user={mockUser} role="tournament_admin" onLogout={() => {}} onLogoClick={() => {}} />);
    expect(screen.getByText("Tournament Admin")).toBeInTheDocument();
  });

  it("shows Invite button when isSuperAdmin is true", () => {
    render(<Header user={mockUser} isSuperAdmin={true} onLogout={() => {}} onLogoClick={() => {}} />);
    expect(screen.getByText("+ Invite")).toBeInTheDocument();
  });

  it("hides Invite button when isSuperAdmin is false", () => {
    render(<Header user={mockUser} isSuperAdmin={false} onLogout={() => {}} onLogoClick={() => {}} />);
    expect(screen.queryByText("+ Invite")).not.toBeInTheDocument();
  });

  it("hides Invite button when isSuperAdmin is not provided", () => {
    render(<Header user={mockUser} onLogout={() => {}} onLogoClick={() => {}} />);
    expect(screen.queryByText("+ Invite")).not.toBeInTheDocument();
  });

  it("calls onInvite when Invite button is clicked", async () => {
    const onInvite = vi.fn();
    const user = userEvent.setup();
    render(<Header user={mockUser} isSuperAdmin={true} onLogout={() => {}} onLogoClick={() => {}} onInvite={onInvite} />);
    await user.click(screen.getByText("+ Invite"));
    expect(onInvite).toHaveBeenCalledTimes(1);
  });

  it("renders version badges", () => {
    const { container } = render(<Header user={mockUser} onLogout={() => {}} onLogoClick={() => {}} />);
    expect(container.querySelectorAll(".version-badge").length).toBeGreaterThan(0);
  });
});
