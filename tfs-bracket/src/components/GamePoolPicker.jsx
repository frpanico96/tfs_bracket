import GamePicker from "./GamePicker";
import { MIN_POOL_SIZE } from "../utils/finalChampionship";

// Multi-select wrapper around the regular single-game GamePicker: every game
// chosen in the picker is appended to the pool and shown as a removable chip.
export default function GamePoolPicker({ value, onChange }) {
  const pool = value || [];

  const handleAdd = (game) => {
    if (!game || pool.some((g) => g.id === game.id)) return;
    onChange([...pool, { id: game.id, name: game.name, image: game.image || null }]);
  };

  const handleRemove = (id) => onChange(pool.filter((g) => g.id !== id));

  return (
    <div className="game-pool">
      <GamePicker value={null} onChange={handleAdd} />
      <p className={`game-pool-count ${pool.length >= MIN_POOL_SIZE ? "ok" : ""}`}>
        {pool.length} game{pool.length === 1 ? "" : "s"} selected (minimum {MIN_POOL_SIZE})
      </p>
      {pool.length > 0 && (
        <ul className="game-pool-list">
          {pool.map((g) => (
            <li key={g.id} className="game-pool-chip">
              {g.image && <img src={g.image} alt="" className="game-pool-thumb" />}
              <span onClick={() => handleRemove(g.id)}>
                {g.name}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
