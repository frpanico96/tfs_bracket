import { useState, useEffect } from "react";
import { db, doc, updateDoc } from "../firebase";
import { generateBracket, advanceBracket, parseFirestoreDate } from "../utils/bracket";
import { logEvent } from "../utils/logger";
import BracketView from "./BracketView";
import TournamentSidebar from "./TournamentSidebar";
import MatchScoreModal from "./MatchScoreModal";

export default function TournamentDetail({ tournament, tournaments, user, onBack, onUpdate, onDelete }) {
  const liveTournament = tournaments?.find((t) => t.id === tournament.id) || tournament;
  const t = liveTournament;
  
  const isDev = import.meta.env.DEV;
  const isAdmin = user.uid === t.adminId;
  const now = new Date();
  const regStartDate = parseFirestoreDate(t.regStart);
  const regEndDate = parseFirestoreDate(t.regEnd);
  const regOpen =
    t.published &&
    regStartDate &&
    regEndDate &&
    regStartDate <= now &&
    regEndDate > now;
  const canJoin =
    regOpen &&
    !t.participants.some((p) => p.id === user.uid) &&
    t.participants.length < t.maxParticipants;

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const checkMobile = () => setSidebarOpen(window.innerWidth > 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleJoin = async () => {
    const ref = doc(db, "tournaments", t.id);
    const newParticipant = { id: user.uid, name: user.displayName, email: user.email };
    await updateDoc(ref, {
      participants: [...t.participants, newParticipant],
    });
    onUpdate({ ...t, participants: [...t.participants, newParticipant] });
    logEvent({ action: "join_tournament", details: { tournamentId: t.id, userId: user.uid, userName: user.displayName } });
  };

  const handlePublish = async () => {
    const ref = doc(db, "tournaments", t.id);
    await updateDoc(ref, { published: true });
    onUpdate({ ...t, published: true });
    logEvent({ action: "publish_tournament", details: { tournamentId: t.id, adminId: user.uid } });
  };

  const handleStartTournament = async () => {
    const matches = generateBracket(t.participants, t.maxParticipants);
    const ref = doc(db, "tournaments", t.id);
    await updateDoc(ref, { matches, started: true });
    onUpdate({ ...t, matches, started: true });
    logEvent({ action: "start_tournament", details: { tournamentId: t.id, adminId: user.uid, participantCount: t.participants.length } });
  };

  const handleMatchClick = (match) => {
    setSelectedMatch(match);
  };

  const handleSaveScore = async (match, { p1Score, p2Score, winnerIndex }) => {
    const matchIndex = t.matches.findIndex((m) => m.id === match.id);
    const winner = winnerIndex === 0 ? match.player1 : match.player2;
    const matches = advanceBracket(t.matches, matchIndex, winnerIndex, { p1Score, p2Score });
    const ref = doc(db, "tournaments", t.id);
    await updateDoc(ref, { matches });
    onUpdate({ ...t, matches });
    logEvent({ action: "record_match_score", details: { tournamentId: t.id, matchIndex, winner, round: match.round, score: `${p1Score}-${p2Score}` } });
  };

  const handleUpdateAllWinConditions = async (condition) => {
    const updatedMatches = t.matches.map((match) => ({
      ...match,
      winCondition: condition,
    }));
    const ref = doc(db, "tournaments", t.id);
    await updateDoc(ref, { matches: updatedMatches });
    onUpdate({ ...t, matches: updatedMatches });
    logEvent({ action: "update_all_win_conditions", details: { tournamentId: t.id, condition } });
  };

  const handleAddFakeUsers = async () => {
    const fakeNames = [
      "Player One", "Player Two", "Player Three", "Player Four",
      "Player Five", "Player Six", "Player Seven", "Player Eight",
    ];
    const currentCount = t.participants.length;
    const slotsAvailable = t.maxParticipants - currentCount;
    const toAdd = fakeNames.slice(0, slotsAvailable).map((name, i) => ({
      id: `fake-${currentCount + i}`,
      name,
      email: `${name.toLowerCase().replace(" ", "-")}@example.com`,
    }));
    const ref = doc(db, "tournaments", t.id);
    await updateDoc(ref, {
      participants: [...t.participants, ...toAdd],
    });
    onUpdate({ ...t, participants: [...t.participants, ...toAdd] });
    logEvent({ action: "add_fake_users", details: { tournamentId: t.id, count: toAdd.length } });
  };

  const handleResetBracket = async () => {
    if (!confirm("Are you sure you want to reset the bracket? All matches will be cleared.")) return;
    const freshMatches = generateBracket(t.participants, t.maxParticipants);
    const ref = doc(db, "tournaments", t.id);
    await updateDoc(ref, { matches: freshMatches });
    onUpdate({ ...t, matches: freshMatches });
    logEvent({ action: "reset_bracket", details: { tournamentId: t.id, adminId: user.uid } });
  };

  const handleDelete = async () => {
    logEvent({ action: "delete_tournament", details: { tournamentId: t.id, adminId: user.uid } });
    onDelete(t.id);
  };

  const getDefaultWinCondition = () => {
    if (!t.matches || t.matches.length === 0) return "ft3";
    return t.matches[0].winCondition || "ft3";
  };

  return (
    <div className={`tournament-detail ${sidebarOpen ? "with-sidebar" : ""}`}>
      <div className="detail-content">
        <div className="detail-header">
          <h2>{t.name}</h2>
          {isAdmin && !t.published && (
            <button className="btn-primary" onClick={handlePublish}>
              Publish
            </button>
          )}
        </div>

        <div className="detail-info">
          <p>
            <strong>Admin:</strong> {t.adminName}
          </p>
          <p>
            <strong>Registration:</strong>{" "}
            {regStartDate ? regStartDate.toLocaleString() : "TBD"} -{" "}
            {regEndDate ? regEndDate.toLocaleString() : "TBD"}
          </p>
          <p>
            <strong>Status:</strong>{" "}
            {t.started
              ? "In Progress"
              : t.published
              ? "Open"
              : "Draft"}
          </p>
        </div>

        {!t.started && (
          <>
            <div className="bracket-actions">
              <button className="btn-secondary" onClick={onBack}>
                ← Back
              </button>
            </div>
            <div className="participants-section">
            <h3>
              Participants ({t.participants.length}/{t.maxParticipants})
            </h3>
            <div className="participants-list-scroll">
            {t.participants.length === 0 ? (
              <p className="empty">No participants yet</p>
            ) : (
              <ul className="participants-list">
                {t.participants.map((p, i) => (
                  <li key={i}>
                    {i + 1}. {p.name}
                  </li>
                ))}
              </ul>
            )}
            </div>
            <div className="participants-actions">
            {canJoin && (
              <button className="btn-primary" onClick={handleJoin}>
                Join Tournament
              </button>
            )}
            {isDev && isAdmin && (
                <button className="btn-secondary" onClick={handleAddFakeUsers}>
                  + Add Fake Users
                </button>
              )}
              {isDev && isAdmin && (
                <button className="btn-secondary" onClick={() => {
                  const newMax = prompt("Set max participants:", t.maxParticipants);
                  if (newMax && !isNaN(newMax) && parseInt(newMax) >= 2) {
                    const ref = doc(db, "tournaments", t.id);
                    updateDoc(ref, { maxParticipants: parseInt(newMax) });
                    onUpdate({ ...t, maxParticipants: parseInt(newMax) });
                  }
                }}>
                  Change Max Players
                </button>
              )}
              {isAdmin && t.published && (
                <button className="btn-primary" onClick={handleStartTournament} disabled={t.participants.length < 2}>
                  Start Tournament ({t.participants.length}/{t.maxParticipants})
                </button>
              )}
              </div>
          </div>
          </>
        )}

        {t.started && t.matches && (
          <>
            <div className="bracket-actions">
              <button className="btn-secondary" onClick={onBack}>
                ← Back
              </button>
              {isAdmin && (
                <button className="btn-secondary" onClick={handleResetBracket}>
                  Reset Bracket
                </button>
              )}
              {isAdmin && (
                <button className="btn-danger" onClick={() => setShowDeleteConfirm(true)}>
                  Delete Tournament
                </button>
              )}
            </div>
            <BracketView
              matches={t.matches}
              onMatchClick={handleMatchClick}
              isAdmin={isAdmin}
            />
          </>
        )}
      </div>

      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Tournament</h3>
              <button className="modal-close" onClick={() => setShowDeleteConfirm(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete "{t.name}"? This action cannot be undone.</p>
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </button>
                <button className="btn-danger" onClick={handleDelete}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAdmin && (
        <TournamentSidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          currentCondition={getDefaultWinCondition()}
          onUpdateCondition={handleUpdateAllWinConditions}
        />
      )}

      <MatchScoreModal
        isOpen={!!selectedMatch}
        onClose={() => setSelectedMatch(null)}
        match={selectedMatch}
        onSave={handleSaveScore}
      />
    </div>
  );
}
