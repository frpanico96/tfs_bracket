import { useState } from "react";
import BaseModal from "./BaseModal";

const WIN_CONDITIONS = ["ft2", "ft3", "ft5", "ft7", "ft9"];

export default function TournamentSidebar({ isOpen, onToggle, currentCondition, onUpdateCondition }) {
  const [isConditionModalOpen, setIsConditionModalOpen] = useState(false);

  return (
    <>
      <aside className={`tournament-sidebar ${isOpen ? "open" : "collapsed"}`}>
        <button className="sidebar-toggle" onClick={onToggle}>
          {isOpen ? "→" : "←"}
        </button>
        {isOpen && (
          <div className="sidebar-content">
            <div className="sidebar-section">
              <h4>Win Conditions</h4>
              <div className="sidebar-current">
                <span>Default:</span>
                <button
                  className="sidebar-current-value"
                  onClick={() => setIsConditionModalOpen(true)}
                >
                  {currentCondition.toUpperCase()}
                </button>
              </div>
              <p className="sidebar-hint">
                Click to change the win condition for all matches
              </p>
            </div>
          </div>
        )}
      </aside>

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
    </>
  );
}
