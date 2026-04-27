import { parseFirestoreDate } from "../utils/bracket";

export default function TournamentList({ tournaments, onSelect, onCreate }) {
  const now = new Date();

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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}