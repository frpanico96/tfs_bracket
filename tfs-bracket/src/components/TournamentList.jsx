import { useState, useMemo } from "react";
import { parseFirestoreDate } from "../utils/bracket";
import BaseModal from "./BaseModal";

function isComplete(t) {
  if (!t.started || !t.matches || t.matches.length === 0) return false;
  return t.matches.every((m) => m.winner != null);
}

export default function TournamentList({ tournaments, loading, user, isGlobalAdmin, onSelect, onCreate, onDelete }) {
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const now = new Date();

  const sorted = useMemo(() => {
    return [...tournaments].sort((a, b) => {
      const aDone = isComplete(a);
      const bDone = isComplete(b);
      if (aDone && !bDone) return 1;
      if (!aDone && bDone) return -1;
      return 0;
    });
  }, [tournaments]);

  const handleDeleteClick = (e, tournament) => {
    e.stopPropagation();
    setDeleteConfirm(tournament);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirm) {
      onDelete(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="tournament-list">
      <div className="list-header">
        <h2>Tournaments</h2>
        {isGlobalAdmin && (
          <button className="btn-primary" onClick={onCreate}>
            + Create Tournament
          </button>
        )}
      </div>
      {loading ? (
        <div className="cards">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="card skeleton-card">
              <div className="skeleton" style={{ height: 18 }} />
              <div className="skeleton" style={{ height: 14, width: "60%" }} />
            </div>
          ))}
        </div>
      ) : tournaments.length === 0 ? (
        <p className="empty">{isGlobalAdmin ? "No tournaments yet. Create one!" : "No tournaments yet."}</p>
      ) : (
        <div className="cards">
          {sorted.map((t) => {
            const completed = isComplete(t);
            const regEnd = parseFirestoreDate(t.regEnd);
            const canJoin =
              !completed && t.published &&
              t.participants.length < t.maxParticipants &&
              regEnd && regEnd > now;
            const isAdmin = user && user.uid === t.adminId;
            return (
              <div key={t.id} className={`card ${completed ? "card-completed" : ""}`} onClick={() => onSelect(t)}>
                <h3>{t.name}</h3>
                <p>
                  {t.participants.length}/{t.maxParticipants} players
                </p>
                <p>
                  {completed ? "Completed" : t.published ? "Published" : "Draft"} • Reg:{" "}
                  {regEnd ? regEnd.toLocaleDateString() : "N/A"}
                </p>
                {canJoin && (
                  <span className="badge-green">Join Open</span>
                )}
                {completed && (
                  <span className="badge-completed">Completed</span>
                )}
                {isAdmin && (
                  <button className="btn-delete" onClick={(e) => handleDeleteClick(e, t)}>
                    Delete
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <BaseModal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Tournament">
        <p>Are you sure you want to delete "{deleteConfirm?.name}"? This action cannot be undone.</p>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
          <button className="btn-danger" onClick={handleConfirmDelete}>Delete</button>
        </div>
      </BaseModal>
    </div>
  );
}