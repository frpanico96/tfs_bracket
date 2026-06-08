import { useState, useEffect, useRef } from "react";
import { searchGames } from "../utils/games";

export default function GamePicker({ value, onChange }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      debounceRef.current = setTimeout(() => {
        setResults([]);
        setSearching(false);
      }, 0);
      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
      };
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const games = await searchGames(query.trim());
      setResults(games);
      setSearching(false);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleSelect = (game) => {
    onChange(game);
    setOpen(false);
    setQuery("");
    setResults([]);
  };

  const selected = value || null;

  return (
    <div className="game-picker" ref={ref}>
      <div
        className={`game-picker-trigger ${open ? "game-picker-open" : ""}`}
        onClick={() => setOpen(!open)}
      >
        {selected ? (
          <span className="game-picker-selected">
            {selected.image && (
              <img src={selected.image} alt="" className="game-picker-thumb" />
            )}
            {selected.name}
          </span>
        ) : (
          <span className="game-picker-placeholder">Select a game</span>
        )}
        <span className="game-picker-arrow">{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div className="game-picker-dropdown">
          <input
            type="text"
            className="game-picker-search"
            placeholder="Type to search games..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <div className="game-picker-list">
            {searching ? (
              <div className="game-picker-empty">Searching...</div>
            ) : !query.trim() ? (
              <div className="game-picker-empty">Start typing to search games</div>
            ) : results.length === 0 ? (
              <div className="game-picker-empty">No games found</div>
            ) : (
              results.map((g) => (
                <div
                  key={g.id}
                  className={`game-picker-item ${value?.id === g.id ? "game-picker-item-selected" : ""}`}
                  onClick={() => handleSelect(g)}
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
