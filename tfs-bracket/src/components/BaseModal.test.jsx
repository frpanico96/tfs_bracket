import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BaseModal from "./BaseModal";

describe("BaseModal", () => {
  it("renders nothing when isOpen is false", () => {
    const { container } = render(
      <BaseModal isOpen={false} onClose={() => {}} title="Test">
        <p>Content</p>
      </BaseModal>
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders title and children when open", () => {
    render(
      <BaseModal isOpen={true} onClose={() => {}} title="Test Modal">
        <p>Modal Content</p>
      </BaseModal>
    );
    expect(screen.getByText("Test Modal")).toBeInTheDocument();
    expect(screen.getByText("Modal Content")).toBeInTheDocument();
  });

  it("calls onClose when overlay is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <BaseModal isOpen={true} onClose={onClose} title="Test">
        <p>Content</p>
      </BaseModal>
    );
    await user.click(container.querySelector(".modal-overlay"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose when modal content is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <BaseModal isOpen={true} onClose={onClose} title="Test">
        <p>Content</p>
      </BaseModal>
    );
    await user.click(screen.getByText("Content"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onClose when close button is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <BaseModal isOpen={true} onClose={onClose} title="Test">
        <p>Content</p>
      </BaseModal>
    );
    await user.click(screen.getByText("×"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
