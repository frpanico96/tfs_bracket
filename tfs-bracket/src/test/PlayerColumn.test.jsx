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

  it("renders DQ button when onDQ is provided", () => {
    render(
      <PlayerColumn name="Alice" score={0} scoreButtons={[0, 1, 2, 3]} onSelectScore={() => {}} onDQ={() => {}} />
    );
    expect(screen.getByText("DQ")).toBeInTheDocument();
  });

  it("does not render DQ button when onDQ is not provided", () => {
    render(
      <PlayerColumn name="Alice" score={0} scoreButtons={[0, 1, 2, 3]} onSelectScore={() => {}} />
    );
    expect(screen.queryByText("DQ")).not.toBeInTheDocument();
  });

  it("DQ button appears first among buttons", () => {
    render(
      <PlayerColumn name="Alice" score={0} scoreButtons={[0, 1, 2, 3]} onSelectScore={() => {}} onDQ={() => {}} />
    );
    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toHaveTextContent("DQ");
  });

  it("marks DQ button selected when isDQ is true", () => {
    render(
      <PlayerColumn name="Alice" score={0} scoreButtons={[0, 1, 2, 3]} onSelectScore={() => {}} onDQ={() => {}} isDQ={true} />
    );
    const dqBtn = screen.getByText("DQ");
    expect(dqBtn.classList.contains("selected")).toBe(true);
  });

  it("calls onDQ when DQ button is clicked", async () => {
    const onDQ = vi.fn();
    const user = userEvent.setup();
    render(
      <PlayerColumn name="Alice" score={0} scoreButtons={[0, 1, 2, 3]} onSelectScore={() => {}} onDQ={onDQ} />
    );
    await user.click(screen.getByText("DQ"));
    expect(onDQ).toHaveBeenCalledTimes(1);
  });

  it("disables numeric score buttons when isDQ is true", () => {
    render(
      <PlayerColumn name="Alice" score={0} scoreButtons={[0, 1, 2, 3]} onSelectScore={() => {}} onDQ={() => {}} isDQ={true} />
    );
    const numericBtns = screen.getAllByRole("button").filter(b => b.textContent !== "DQ");
    numericBtns.forEach(btn => {
      expect(btn).toBeDisabled();
    });
  });

  it("disables numeric score buttons when isDQOpponent is true", () => {
    render(
      <PlayerColumn name="Alice" score={0} scoreButtons={[0, 1, 2, 3]} onSelectScore={() => {}} onDQ={() => {}} isDQOpponent={true} />
    );
    const numericBtns = screen.getAllByRole("button").filter(b => b.textContent !== "DQ");
    numericBtns.forEach(btn => {
      expect(btn).toBeDisabled();
    });
  });

  it("does not call onSelectScore when DQ is active", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <PlayerColumn name="Alice" score={0} scoreButtons={[0, 1, 2, 3]} onSelectScore={onSelect} onDQ={() => {}} isDQ={true} />
    );
    await user.click(screen.getByText("2"));
    expect(onSelect).not.toHaveBeenCalled();
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
