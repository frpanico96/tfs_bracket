import { useState, useMemo } from "react";
import { parseFirestoreDate } from "../utils/bracket";
import BaseModal from "./BaseModal";

function isComplete(t) {
  if (!t.started || !t.matches || t.matches.length === 0) return false;
  return t.matches.every((m) => m.winner != null);
}

const TWITCH_GLYPH = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
  </svg>
);

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
        <p className="empty"><span aria-hidden="true" className="empty-icon">🏟️</span><span>{isGlobalAdmin ? "No tournaments yet. Create one!" : "No tournaments yet."}</span></p>
      ) : (
        <div className="cards">
          {sorted.map((t) => {
            const completed = isComplete(t);
            const regStart = parseFirestoreDate(t.regStart);
            const regEnd = parseFirestoreDate(t.regEnd);
            const regStarted = regStart && regStart <= now;
            const canJoin =
              !completed && t.published &&
              t.participants.length < t.maxParticipants &&
              regStarted && regEnd && regEnd > now;
            const isAdmin = user && user.uid === t.adminId;
            const desc = t.description || "";
            const truncatedDesc = desc.length > 100 ? desc.slice(0, 100) + "…" : desc;
            return (
              <div key={t.id} className={`card ${t.imageUrl || t.game?.image ? "card-has-image" : ""} ${completed ? "card-completed" : ""}`} onClick={() => onSelect(t)}>
                {(t.imageUrl || t.game?.image) && (
                  <div className="card-img-wrapper">
                    <img src={t.imageUrl || t.game.image} alt="" className="card-img" />
                  </div>
                )}
                <div className="card-body">
                  <div className="card-title-row">
                    <h3>{t.name}</h3>
                    {t.twitchUrl && (
                      <a
                        href={t.twitchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="card-twitch-link"
                        onClick={(e) => e.stopPropagation()}
                        title="Watch on Twitch"
                      >
                        {TWITCH_GLYPH}
                      </a>
                    )}
                  </div>
                  {t.game?.name && (
                    <span className="card-game-badge">
                      {t.game.image && <img src={t.game.image} alt="" className="card-game-icon" />}
                      {t.game.name}
                    </span>
                  )}
                  {truncatedDesc && (
                    <p className="card-desc">{truncatedDesc}</p>
                  )}
                  <p>
                    {t.participants.length}/{t.maxParticipants} players
                  </p>
                  <p>
                    {completed ? "Completed" : t.published ? "Published" : "Draft"}
                  </p>
                  <p>
                    Registration starts:{" "}
                    {regStart ? regStart.toLocaleString() : "N/A"}
                  </p>
                  <p>
                    Registration ends:{" "}
                    {regEnd ? regEnd.toLocaleString() : "N/A"}
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