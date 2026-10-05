import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../utils/games", () => ({
  searchGames: vi.fn(async () => [
    { id: 1, name: "Street Fighter 6", image: "sf6.png" },
    { id: 2, name: "Tekken 8", image: null },
  ]),
}));

import GamePoolPicker from "../components/GamePoolPicker";

function Harness({ onChange }) {
  const [pool, setPool] = useState([]);
  return <GamePoolPicker value={pool} onChange={(p) => { setPool(p); onChange?.(p); }} />;
}

async function search(user, text) {
  await user.click(screen.getByText("Select a game"));
  await user.type(screen.getByPlaceholderText("Type to search games..."), text);
}

describe("GamePoolPicker", () => {
  it("shows the minimum pool size", () => {
    render(<Harness />);
    expect(screen.getByText("0 games selected (minimum 11)")).toBeInTheDocument();
  });

  it("adds every picked game to the pool and keeps the picker usable", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness onChange={onChange} />);

    await search(user, "fi");
    await user.click(await screen.findByText("Street Fighter 6"));
    expect(onChange).toHaveBeenLastCalledWith([{ id: 1, name: "Street Fighter 6", image: "sf6.png" }]);

    await search(user, "te");
    await user.click(await screen.findByText("Tekken 8"));
    expect(onChange).toHaveBeenLastCalledWith([
      { id: 1, name: "Street Fighter 6", image: "sf6.png" },
      { id: 2, name: "Tekken 8", image: null },
    ]);
    expect(screen.getByText("2 games selected (minimum 11)")).toBeInTheDocument();
  });

  it("does not add the same game twice", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await search(user, "fi");
    await user.click(await screen.findByText("Street Fighter 6"));
    await search(user, "fi");
    await user.click(await screen.findByText("Street Fighter 6", { selector: ".game-picker-item span" }));
    expect(screen.getByText("1 game selected (minimum 11)")).toBeInTheDocument();
  });

  it("removes a game from the pool", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await search(user, "fi");
    await user.click(await screen.findByText("Street Fighter 6"));
    await user.click(screen.getByRole("button", { name: "Remove Street Fighter 6" }));
    expect(screen.getByText("0 games selected (minimum 11)")).toBeInTheDocument();
  });
});
