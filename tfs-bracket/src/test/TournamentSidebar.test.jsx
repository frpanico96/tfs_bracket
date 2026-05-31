import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TournamentSidebar from "../components/TournamentSidebar";

describe("TournamentSidebar", () => {
  it("renders current win condition", () => {
    render(
      <TournamentSidebar isOpen={true} onToggle={() => {}} currentCondition="ft5" onUpdateCondition={() => {}} isAdmin={true} />
    );
    expect(screen.getByText("FT5")).toBeInTheDocument();
  });

  it("calls onToggle when toggle button is clicked", async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    render(
      <TournamentSidebar isOpen={true} onToggle={onToggle} currentCondition="ft3" onUpdateCondition={() => {}} isAdmin={true} />
    );
    await user.click(screen.getByText("→"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("opens win condition modal when current value is clicked", async () => {
    const user = userEvent.setup();
    render(
      <TournamentSidebar isOpen={true} onToggle={() => {}} currentCondition="ft3" onUpdateCondition={() => {}} isAdmin={true} />
    );
    await user.click(screen.getByText("FT3"));
    expect(screen.getByText("Select Win Condition")).toBeInTheDocument();
  });

  it("calls onUpdateCondition when a new condition is selected", async () => {
    const onUpdate = vi.fn();
    const user = userEvent.setup();
    render(
      <TournamentSidebar isOpen={true} onToggle={() => {}} currentCondition="ft3" onUpdateCondition={onUpdate} isAdmin={true} />
    );
    await user.click(screen.getByText("FT3"));
    await user.click(screen.getByText("FT5"));
    expect(onUpdate).toHaveBeenCalledWith("ft5");
  });

  it("highlights the current condition in the modal", async () => {
    const user = userEvent.setup();
    render(
      <TournamentSidebar isOpen={true} onToggle={() => {}} currentCondition="ft7" onUpdateCondition={() => {}} isAdmin={true} />
    );
    await user.click(screen.getByText("FT7"));
    const options = screen.getAllByText("FT7");
    const modalOption = options.find((el) => el.closest(".modal-option"));
    expect(modalOption.classList.contains("selected")).toBe(true);
  });
});
