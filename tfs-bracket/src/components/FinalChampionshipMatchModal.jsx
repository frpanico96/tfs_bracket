import { useState } from "react";
import BaseModal from "./BaseModal";
import {
  SET_FT,
  initPickBan,
  applyPickBanStep,
  undoPickBanStep,
  getNextAction,
  getRemainingGames,
  getPlayOrder,
  isPickBanComplete,
  appendSet,
  validateSetScore,
  removeLastSet,
  getMatchProgress,
  getFcRoundName,
} from "../utils/finalChampionship";

const SCORE_BUTTONS = Array.from({ length: SET_FT + 1 }, (_, i) => i);

function stepLabel(step, names) {
  if (step.action === "decider") return `Decider: ${step.game.name}`;
  const who = names[step.player];
  return `${who} ${step.action === "ban" ? "banned" : "picked"} ${step.game.name}`;
}

// Admin-driven flow for one Final Championship match: pick/ban on behalf of both
// players, then score every set in play order until one side reaches the target.
function MatchFlow({ match, gamePool, onClose, onSaveProgress, onComplete, rng }) {
  const [pickBan, setPickBan] = useState(() => match.pickBan || initPickBan(match.winCondition, gamePool));
  const [sets, setSets] = useState(() => match.sets || []);
  const [scoreP1, setScoreP1] = useState(null);
  const [scoreP2, setScoreP2] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const names = [match.player1, match.player2];
  const current = { ...match, pickBan, sets };
  const progress = getMatchProgress(current);
  const next = getNextAction(pickBan);
  const complete = isPickBanComplete(pickBan);
  const games = getPlayOrder(pickBan);
  const remaining = getRemainingGames(pickBan);
  const label = match.winCondition.toUpperCase();

  const persist = async (patch) => {
    try {
      await onSaveProgress?.(match, patch);
    } catch {
      setError("Could not save progress. Check your connection and try again.");
    }
  };

  const handleGame = (game) => {
    setError("");
    const updated = applyPickBanStep(pickBan, game.id, rng);
    setPickBan(updated);
    persist({ pickBan: updated, sets });
  };

  const handleUndoPickBan = () => {
    const updated = undoPickBanStep(pickBan);
    setPickBan(updated);
    persist({ pickBan: updated, sets });
  };

  const handleSaveSet = async () => {
    if (scoreP1 == null || scoreP2 == null || saving) return;
    setError("");
    let nextSets;
    try {
      nextSets = appendSet(current, scoreP1, scoreP2);
    } catch (e) {
      setError(e.message);
      return;
    }
    setSaving(true);
    const after = getMatchProgress({ ...current, sets: nextSets });
    try {
      if (after.decided) {
        await onComplete(match, {
          p1Score: after.p1Sets,
          p2Score: after.p2Sets,
          winnerIndex: after.winnerIndex,
          dq: null,
          sets: nextSets,
          pickBan,
        });
        onClose();
        return;
      }
      setSets(nextSets);
      setScoreP1(null);
      setScoreP2(null);
      await persist({ pickBan, sets: nextSets });
    } catch {
      setError("Could not save the result. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleUndoSet = () => {
    const nextSets = removeLastSet(current);
    setSets(nextSets);
    setScoreP1(null);
    setScoreP2(null);
    persist({ pickBan, sets: nextSets });
  };

  const handleDq = async (index) => {
    if (saving) return;
    setSaving(true);
    try {
      await onComplete(match, { p1Score: null, p2Score: null, winnerIndex: index === 0 ? 1 : 0, dq: index, sets, pickBan });
      onClose();
    } catch {
      setError("Could not save the disqualification. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const currentGame = complete && !progress.decided ? games[progress.nextSetIndex] : null;
  const setReady = scoreP1 != null && scoreP2 != null;
  const setValid = setReady && validateSetScore(scoreP1, scoreP2);

  return (
    <div className="fc-modal">
      <div className="fc-scoreboard">
        <div className="fc-player">
          <span className="fc-player-name">{names[0]}</span>
          <span className="fc-sets-won">{progress.p1Sets}</span>
        </div>
        <div className="fc-format">
          <strong>{label}</strong>
          <span>sets · each to {SET_FT}</span>
        </div>
        <div className="fc-player">
          <span className="fc-sets-won">{progress.p2Sets}</span>
          <span className="fc-player-name">{names[1]}</span>
        </div>
      </div>

      <section className="fc-section">
        <h4>Pick &amp; Ban</h4>
        {!complete && next && (
          <>
            <p className="fc-prompt" aria-live="polite">
              <strong>{names[next.player]}</strong> must <strong>{next.action}</strong> a game
              <span className="fc-step-count"> (step {next.number} of {next.total})</span>
            </p>
            <div className="fc-game-grid">
              {remaining.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  className={`fc-game-btn fc-${next.action}`}
                  onClick={() => handleGame(g)}
                  disabled={saving}
                >
                  {g.name}
                </button>
              ))}
            </div>
          </>
        )}
        {pickBan.steps.length > 0 && (
          <ol className="fc-history">
            {pickBan.steps.map((s, i) => (
              <li key={`${s.game.id}-${i}`} className={`fc-step fc-step-${s.action}`}>
                {stepLabel(s, names)}
              </li>
            ))}
          </ol>
        )}
        {pickBan.steps.length > 0 && sets.length === 0 && (
          <button type="button" className="btn-secondary btn-sm" onClick={handleUndoPickBan} disabled={saving}>
            Undo last {complete ? "step & decider" : "step"}
          </button>
        )}
      </section>

      {complete && (
        <section className="fc-section">
          <h4>Sets</h4>
          <ol className="fc-sets">
            {games.map((g, i) => {
              const played = sets[i];
              const isCurrent = !progress.decided && i === progress.nextSetIndex;
              const skipped = progress.decided && !played;
              if (skipped) return null;
              return (
                <li key={`${g.id}-${i}`} className={`fc-set ${isCurrent ? "current" : ""} ${played ? "done" : ""}`}>
                  <div className="fc-set-title">
                    <span>Game {i + 1}</span>
                    <strong>{g.name}</strong>
                    {i === games.length - 1 && <span className="fc-tag">decider</span>}
                  </div>
                  {played && (
                    <div className="fc-set-result">
                      {played.scoreP1} – {played.scoreP2}
                      <span className="fc-set-winner">{names[played.winner]}</span>
                    </div>
                  )}
                  {isCurrent && (
                    <div className="fc-score-entry">
                      {[0, 1].map((side) => {
                        const value = side === 0 ? scoreP1 : scoreP2;
                        const setValue = side === 0 ? setScoreP1 : setScoreP2;
                        return (
                          <div key={side} className="fc-score-side">
                            <span className="fc-score-name">{names[side]}</span>
                            <div className="fc-score-buttons" role="group" aria-label={`${names[side]} rounds won`}>
                              {SCORE_BUTTONS.map((n) => (
                                <button
                                  key={n}
                                  type="button"
                                  className={`fc-score-btn ${value === n ? "selected" : ""}`}
                                  onClick={() => setValue(n)}
                                  aria-label={`${names[side]} ${n}`}
                                  aria-pressed={value === n}
                                  disabled={saving}
                                >
                                  {n}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
          {currentGame && (
            <div className="fc-set-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={handleSaveSet}
                disabled={!setValid || saving}
              >
                {saving ? "Saving..." : "Save set"}
              </button>
              {setReady && !setValid && (
                <span className="score-validation-hint">One player must reach {SET_FT} rounds</span>
              )}
            </div>
          )}
          {sets.length > 0 && (
            <button type="button" className="btn-secondary btn-sm" onClick={handleUndoSet} disabled={saving}>
              Undo last set
            </button>
          )}
        </section>
      )}

      {error && <p className="field-error" role="alert">{error}</p>}

      <div className="fc-footer">
        <div className="fc-dq">
          <span>Disqualify:</span>
          {[0, 1].map((i) => (
            <button key={i} type="button" className="btn-danger btn-sm" onClick={() => handleDq(i)} disabled={saving}>
              {names[i]}
            </button>
          ))}
        </div>
        <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
          Close
        </button>
      </div>
    </div>
  );
}

export default function FinalChampionshipMatchModal({ isOpen, onClose, match, gamePool, onSaveProgress, onComplete, rng }) {
  if (!match) return null;
  const roundName = getFcRoundName(match);
  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title={`${roundName} · Match #${match.matchIndex + 1}`}>
      {isOpen && (
        <MatchFlow
          key={match.id}
          match={match}
          gamePool={gamePool}
          onClose={onClose}
          onSaveProgress={onSaveProgress}
          onComplete={onComplete}
          rng={rng}
        />
      )}
    </BaseModal>
  );
}
