import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PlayerColumn from "../components/PlayerColumn";

describe("PlayerColumn", () => {
  it("renders player name and initials", () => {
    render(
      <PlayerColumn name="John Doe" score={0} scoreButtons={[0, 1, 2, 3]} onSelectScore={() => {}} />
    );
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("renders TBD for null name", () => {
    render(
      <PlayerColumn name={null} score={0} scoreButtons={[0, 1, 2, 3]} onSelectScore={() => {}} />
    );
    expect(screen.getByText("TBD")).toBeInTheDocument();
  });

  it("renders TBD for TBD name", () => {
    render(
      <PlayerColumn name="TBD" score={0} scoreButtons={[0, 1, 2, 3]} onSelectScore={() => {}} />
    );
    expect(screen.getByText("TBD")).toBeInTheDocument();
  });

  it("renders score buttons", () => {
    render(
      <PlayerColumn name="Alice" score={0} scoreButtons={[0, 1, 2, 3]} onSelectScore={() => {}} />
    );
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("highlights selected score", () => {
    render(
      <PlayerColumn name="Alice" score={2} scoreButtons={[0, 1, 2, 3]} onSelectScore={() => {}} />
    );
    const btn2 = screen.getByText("2");
    expect(btn2.classList.contains("selected")).toBe(true);
  });

  it("calls onSelectScore when button is clicked", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <PlayerColumn name="Bob" score={0} scoreButtons={[0, 1, 2]} onSelectScore={onSelect} />
    );
    await user.click(screen.getByText("2"));
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it("extracts initials for single-word name", () => {
    render(
      <PlayerColumn name="Mario" score={0} scoreButtons={[0, 1, 2, 3]} onSelectScore={() => {}} />
    );
    expect(screen.getByText("M")).toBeInTheDocument();
  });

  it("handles empty name", () => {
    render(
      <PlayerColumn name="" score={0} scoreButtons={[0, 1, 2, 3]} onSelectScore={() => {}} />
    );
    expect(screen.getByText("?")).toBeInTheDocument();
  });
});
