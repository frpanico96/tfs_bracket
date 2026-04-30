import { useState } from "react";
import BaseModal from "./BaseModal";
import PlayerColumn from "./PlayerColumn";

function getWinConditionTarget(condition) {
  if (!condition) return 3;
  return parseInt(condition.replace("ft", ""), 10);
}

function getScoreButtons(condition) {
  const target = getWinConditionTarget(condition);
  return Array.from({ length: target + 1 }, (_, i) => i);
}

export default function MatchScoreModal({ isOpen, onClose, match, onSave }) {
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);

  if (!match) return null;

  const target = getWinConditionTarget(match.winCondition);
  const buttons = getScoreButtons(match.winCondition);

  const handleClose = () => {
    setP1Score(0);
    setP2Score(0);
    onClose();
  };

  const isScoreValid = p1Score !== p2Score && Math.max(p1Score, p2Score) === target && Math.max(p1Score, p2Score) > 0;

  const handleSave = () => {
    if (!isScoreValid) return;
    const winnerIndex = p1Score > p2Score ? 0 : 1;
    onSave(match, { p1Score, p2Score, winnerIndex });
    handleClose();
  };

  return (
    <BaseModal isOpen={isOpen} onClose={handleClose} title="Record Score">
      <div className="match-score-modal">
        <div className="match-score-content">
          <div className="match-score-columns">
            <PlayerColumn
              name={match.player1}
              score={p1Score}
              scoreButtons={buttons}
              onSelectScore={setP1Score}
            />
            <div className="match-score-display">
              <div className={`match-score-value ${isScoreValid ? "score-valid" : ""}`}>
                {p1Score} - {p2Score}
              </div>
              <div className="match-score-label">
                {match.winCondition?.toUpperCase() || "FT3"}
              </div>
            </div>
            <PlayerColumn
              name={match.player2}
              score={p2Score}
              scoreButtons={buttons}
              onSelectScore={setP2Score}
            />
          </div>
          <div className="match-score-actions">
            <button className="btn-secondary" onClick={handleClose}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleSave} disabled={!isScoreValid}>
              Save
            </button>
          </div>
          {!isScoreValid && (
            <p className="score-validation-hint">
              Winner must reach {match.winCondition?.toUpperCase() || "FT3"}
            </p>
          )}
        </div>
        <div className="match-score-sidebar">
          <div className="match-score-sidebar-section">
            <h4>Match Info</h4>
            <p className="match-info-label">Round</p>
            <p className="match-info-value">Round {match.round + 1}</p>
            <p className="match-info-label">Match</p>
            <p className="match-info-value">#{match.matchIndex + 1}</p>
          </div>
        </div>
      </div>
    </BaseModal>
  );
}
