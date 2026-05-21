import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Header from "./Header";

const mockUser = {
  displayName: "Test User",
  photoURL: "https://example.com/photo.jpg",
  uid: "user-1",
};

describe("Header", () => {
  it("renders the app title", () => {
    render(<Header user={mockUser} onLogout={() => {}} onLogoClick={() => {}} />);
    expect(screen.getByText("TFS Bracket")).toBeInTheDocument();
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
    await user.click(screen.getByText("TFS Bracket"));
    expect(onLogoClick).toHaveBeenCalledTimes(1);
  });
});
