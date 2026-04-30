function getInitials(name) {
  if (!name) return "?";
  const parts = name.split(" ");
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function PlayerColumn({ name, score, scoreButtons, onSelectScore }) {
  if (!name || name === "TBD") {
    return (
      <div className="player-column">
        <div className="player-profile">
          <div className="player-avatar tbd">?</div>
          <span className="player-name">TBD</span>
        </div>
      </div>
    );
  }

  return (
    <div className="player-column">
      <div className="player-profile">
        <div className="player-avatar">{getInitials(name)}</div>
        <span className="player-name">{name}</span>
      </div>
      <div className="player-score-buttons">
        {scoreButtons.map((btn) => (
          <button
            key={btn}
            className={`score-btn ${score === btn ? "selected" : ""}`}
            onClick={() => onSelectScore(btn)}
          >
            {btn}
          </button>
        ))}
      </div>
    </div>
  );
}
