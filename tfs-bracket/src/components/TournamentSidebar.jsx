import { useState } from "react";
import BaseModal from "./BaseModal";

const WIN_CONDITIONS = ["ft2", "ft3", "ft5", "ft7", "ft9"];

const MEDAL_EMOJI = ["🥇", "🥈", "🥉"];

function RankingsList({ rankings }) {
  if (!rankings || rankings.length === 0) {
    return (
      <div className="rankings-empty">
        <span className="rankings-empty-icon">🏆</span>
        <p>No rankings yet</p>
      </div>
    );
  }

  return (
    <div className="rankings-list">
      {rankings.map((entry) => (
        <div key={entry.rank} className="rankings-tier">
          <div className="rankings-tier-header">
            <span className="rankings-rank">
              {entry.rank <= 3 ? (
                <span className="rankings-medal">{MEDAL_EMOJI[entry.rank - 1]}</span>
              ) : (
                <span className="rankings-rank-num">#{entry.rank}</span>
              )}
            </span>
            <span className="rankings-label">{entry.label}</span>
          </div>
          <div className="rankings-players">
            {entry.players.map((player) => {
              const name = typeof player === "string" ? player : player.name;
              return (
                <span key={name} className="rankings-player">
                  {entry.rank === 1 ? (
                    <span className="rankings-crown">👑</span>
                  ) : null}
                  <span className="rankings-player-name">{name}</span>
                  <span className="rankings-player-score">{entry.points}</span>
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function TournamentSidebar({ isOpen, onToggle, currentCondition, onUpdateCondition, isDev, swapQuickMode, onSwapQuickModeToggle, isAdmin, rankings, rankingsLoading, rankingsInfo, tournamentComplete, onOpenRankScores }) {
  const [isConditionModalOpen, setIsConditionModalOpen] = useState(false);

  return (
    <>
      <aside className={`tournament-sidebar ${isOpen ? "open" : "collapsed"}`}>
        <button className="sidebar-toggle" onClick={onToggle}>
          {isOpen ? "→" : "←"}
        </button>
        {isOpen && (
          <div className="sidebar-content">

            {isAdmin && (
              <div className="sidebar-section">
                <h4>
                  <span className="sidebar-section-icon">⚙️</span>
                  Tournament Settings
                </h4>
                <div className="sidebar-current">
                  <span>Default Win Condition:</span>
                  <button
                    className="sidebar-current-value"
                    onClick={() => setIsConditionModalOpen(true)}
                    disabled={tournamentComplete}
                  >
                    {currentCondition.toUpperCase()}
                  </button>
                </div>
                <p className="sidebar-hint">
                  {tournamentComplete ? "Locked after tournament completion" : "Click to change the win condition for all matches"}
                </p>
                <div className="sidebar-current">
                  <span>Tournament Scores:</span>
                  <button
                    className="btn-secondary sidebar-scores-btn"
                    onClick={onOpenRankScores}
                    disabled={tournamentComplete}
                  >
                    Set Scores
                  </button>
                </div>
              </div>
            )}

            {isDev && isAdmin && (
              <div className="sidebar-section">
                <h4>
                  <span className="sidebar-section-icon">🔀</span>
                  Swap Mode
                </h4>
                <label className="sidebar-toggle-row">
                  <span>Quick Swap</span>
                  <div
                    className={`toggle-switch ${swapQuickMode ? "on" : ""}`}
                    onClick={() => onSwapQuickModeToggle(!swapQuickMode)}
                  >
                    <div className="toggle-switch-knob" />
                  </div>
                </label>
                <p className="sidebar-hint">
                  {swapQuickMode
                    ? "Click any player to swap — no button needed"
                    : "Use the Swap Players button in the bracket toolbar"}
                </p>
              </div>
            )}

            <div className="sidebar-section">
              <h4>
                <span className="sidebar-section-icon">🏆</span>
                Rankings
              </h4>
              {rankingsLoading ? (
                <div className="rankings-loading">
                  <span className="rankings-loading-spinner" />
                  <span>Calculating...</span>
                </div>
              ) : rankingsInfo ? (
                <div className="rankings-empty">
                  <span className="rankings-empty-icon">🏆</span>
                  <p>Tournament must be completed to calculate rankings</p>
                </div>
              ) : (
                <RankingsList rankings={rankings} />
              )}
            </div>

          </div>
        )}
      </aside>

      {isAdmin && (
        <BaseModal
          isOpen={isConditionModalOpen}
          onClose={() => setIsConditionModalOpen(false)}
          title="Select Win Condition"
        >
          <div className="modal-options">
            {WIN_CONDITIONS.map((condition) => (
              <button
                key={condition}
                className={`modal-option ${currentCondition === condition ? "selected" : ""}`}
                onClick={() => {
                  onUpdateCondition(condition);
                  setIsConditionModalOpen(false);
                }}
              >
                {condition.toUpperCase()}
                <span className="modal-option-desc">
                  First to {condition.replace("ft", "")} wins
                </span>
              </button>
            ))}
          </div>
        </BaseModal>
      )}
    </>
  );
}
