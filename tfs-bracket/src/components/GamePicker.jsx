import { useState, useEffect, useRef } from "react";
import { fetchFightingGames, searchGames } from "../utils/games";

export default function GamePicker({ value, onChange }) {
  const [games, setGames] = useState([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const ref = useRef(null);

  useEffect(() => {
    fetchFightingGames().then((list) => {
      setGames(list);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const results = searchGames(games, query);
  const selected = value || null;

  return (
    <div className="game-picker" ref={ref}>
      <div
        className={`game-picker-trigger ${open ? "game-picker-open" : ""}`}
        onClick={() => { if (!loading) setOpen(!open); }}
      >
        {selected ? (
          <span className="game-picker-selected">
            {selected.image && (
              <img src={selected.image} alt="" className="game-picker-thumb" />
            )}
            {selected.name}
          </span>
        ) : (
          <span className="game-picker-placeholder">
            {loading ? "Loading games..." : "Select a game"}
          </span>
        )}
        <span className="game-picker-arrow">{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div className="game-picker-dropdown">
          <input
            type="text"
            className="game-picker-search"
            placeholder="Search games..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <div className="game-picker-list">
            {results.length === 0 ? (
              <div className="game-picker-empty">No games found</div>
            ) : (
              results.map((g) => (
                <div
                  key={g.id}
                  className={`game-picker-item ${value?.id === g.id ? "game-picker-item-selected" : ""}`}
                  onClick={() => { onChange(g); setOpen(false); setQuery(""); }}
                >
                  {g.image && (
                    <img src={g.image} alt="" className="game-picker-item-img" />
                  )}
                  <span>{g.name}</span>
                  {value?.id === g.id && <span className="game-picker-check">✓</span>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
