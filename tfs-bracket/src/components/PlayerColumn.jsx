function getInitials(name) {
  if (!name) return "?";
  const parts = name.split(" ");
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function PlayerColumn({ name, score, scoreButtons, onSelectScore, onDQ, isDQ, isDQOpponent, disabled }) {
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

  const isAnyDq = isDQ || isDQOpponent;

  return (
    <div className={`player-column ${isDQ ? "dq" : ""}`}>
      <div className="player-profile">
        <div className="player-avatar">{getInitials(name)}</div>
        <span className="player-name">{name}</span>
      </div>
      <div className="player-score-buttons">
        {onDQ && (
          <button
            className={`score-btn dq-btn ${isDQ ? "selected" : ""}`}
            onClick={() => onDQ()}
            disabled={disabled}
          >
            DQ
          </button>
        )}
        {scoreButtons.map((btn) => (
          <button
            key={btn}
            className={`score-btn ${score === btn ? "selected" : ""} ${isAnyDq || disabled ? "disabled" : ""}`}
            onClick={() => !isAnyDq && !disabled && onSelectScore(btn)}
            disabled={isAnyDq || disabled}
          >
            {btn}
          </button>
        ))}
      </div>
    </div>
  );
}
