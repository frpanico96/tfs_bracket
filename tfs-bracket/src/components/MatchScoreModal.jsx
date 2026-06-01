import { useState } from "react";
import BaseModal from "./BaseModal";
import PlayerColumn from "./PlayerColumn";
import { getMatchRoundName } from "../utils/bracket";

function getWinConditionTarget(condition) {
  if (!condition) return 3;
  return parseInt(condition.replace("ft", ""), 10);
}

function getScoreButtons(condition) {
  const target = getWinConditionTarget(condition);
  return Array.from({ length: target + 1 }, (_, i) => i);
}

export default function MatchScoreModal({ isOpen, onClose, match, onSave, bracketType, allMatches }) {
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [dq, setDq] = useState(null);
  const [saving, setSaving] = useState(false);

  if (!match) return null;

  const target = getWinConditionTarget(match.winCondition);
  const buttons = getScoreButtons(match.winCondition);

  const handleClose = () => {
    setP1Score(0);
    setP2Score(0);
    setDq(null);
    setSaving(false);
    onClose();
  };

  const isDqActive = dq === 0 || dq === 1;
  const isScoreValid = isDqActive || (p1Score !== p2Score && Math.max(p1Score, p2Score) === target && Math.max(p1Score, p2Score) > 0);

  const handleSave = async () => {
    if (!isScoreValid || saving) return;
    setSaving(true);
    if (isDqActive) {
      const winnerIndex = dq === 0 ? 1 : 0;
      await onSave(match, { p1Score: null, p2Score: null, winnerIndex, dq });
    } else {
      const winnerIndex = p1Score > p2Score ? 0 : 1;
      await onSave(match, { p1Score, p2Score, winnerIndex, dq: null });
    }
    await new Promise(r => setTimeout(r, 400));
    handleClose();
  };

  const roundName = getMatchRoundName(match, allMatches, bracketType);

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
              onDQ={() => setDq(dq === 0 ? null : 0)}
              isDQ={dq === 0}
              isDQOpponent={dq === 1}
              disabled={saving}
            />
            <div className="match-score-display">
              {isDqActive ? (
                <div className="match-score-dq">
                  {dq === 0 ? match.player1 : match.player2} DQ'd
                </div>
              ) : (
                <>
                  <div className={`match-score-value ${isScoreValid ? "score-valid" : ""}`}>
                    {p1Score} - {p2Score}
                  </div>
                  <div className="match-score-label">
                    {match.winCondition?.toUpperCase() || "FT3"}
                  </div>
                </>
              )}
            </div>
            <PlayerColumn
              name={match.player2}
              score={p2Score}
              scoreButtons={buttons}
              onSelectScore={setP2Score}
              onDQ={() => setDq(dq === 1 ? null : 1)}
              isDQ={dq === 1}
              isDQOpponent={dq === 0}
              disabled={saving}
            />
          </div>
          <div className="match-score-actions">
            <button className="btn-secondary" onClick={handleClose} disabled={saving}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleSave} disabled={!isScoreValid || saving}>
              {saving ? <span className="saving-throbber" /> : null}
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
          {!isScoreValid && !isDqActive && (
            <p className="score-validation-hint">
              Winner must reach {match.winCondition?.toUpperCase() || "FT3"}
            </p>
          )}
          {isDqActive && (
            <p className="dq-validation-hint">
              {dq === 0 ? match.player1 : match.player2} will be disqualified
            </p>
          )}
        </div>
        <div className="match-score-sidebar">
          <div className="match-score-sidebar-section">
            <h4>Match Info</h4>
            <p className="match-info-label">Round</p>
            <p className="match-info-value">{roundName}</p>
            <p className="match-info-label">Match</p>
            <p className="match-info-value">#{match.matchIndex + 1}</p>
            {bracketType === 'double' && match.bracket && match.bracket !== 'grandFinal' && (
              <>
                <p className="match-info-label">Bracket</p>
                <p className="match-info-value">
                  {match.bracket === 'winners' ? 'Winners' : 'Losers'}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </BaseModal>
  );
}
