import { useState } from "react";
import { parseFirestoreDate } from "../utils/bracket";

export default function TournamentList({ tournaments, user, onSelect, onCreate, onDelete }) {
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const now = new Date();

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
        <button className="btn-primary" onClick={onCreate}>
          + Create Tournament
        </button>
      </div>
      {tournaments.length === 0 ? (
        <p className="empty">No tournaments yet. Create one!</p>
      ) : (
        <div className="cards">
          {tournaments.map((t) => {
            const regEnd = parseFirestoreDate(t.regEnd);
            const canJoin =
              t.published &&
              t.participants.length < t.maxParticipants &&
              regEnd && regEnd > now;
            const isAdmin = user && user.uid === t.adminId;
            return (
              <div key={t.id} className="card" onClick={() => onSelect(t)}>
                <h3>{t.name}</h3>
                <p>
                  {t.participants.length}/{t.maxParticipants} players
                </p>
                <p>
                  {t.published ? "Published" : "Draft"} • Reg:{" "}
                  {regEnd ? regEnd.toLocaleDateString() : "N/A"}
                </p>
                {canJoin && (
                  <span className="badge-green">Join Open</span>
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

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Tournament</h3>
              <button className="modal-close" onClick={() => setDeleteConfirm(null)}>×</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete "{deleteConfirm.name}"? This action cannot be undone.</p>
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>
                  Cancel
                </button>
                <button className="btn-danger" onClick={handleConfirmDelete}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}