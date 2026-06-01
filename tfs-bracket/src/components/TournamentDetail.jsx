import { useState, useEffect, useMemo } from "react";
import { db, doc, updateDoc, getDoc, increment } from "../firebase";
import { generateBracket, generateDoubleEliminationBracket, advanceBracket, swapPlayers, parseFirestoreDate, computeRankings } from "../utils/bracket";
import { logEvent } from "../utils/logger";
import { getUserName } from "../utils/user";
import BracketView from "./BracketView";
import TournamentSidebar from "./TournamentSidebar";
import MatchScoreModal from "./MatchScoreModal";
import BaseModal from "./BaseModal";

const WIN_CONDITIONS = ["ft2", "ft3", "ft5", "ft7", "ft9"];

export default function TournamentDetail({ tournament, user, onBack, onUpdate, onDelete }) {
  const t = tournament;
  
  const isDev = import.meta.env.DEV;
  const isAdmin = user?.uid && t?.adminId && user.uid === t.adminId;
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
  const [matchWinConditionEdit, setMatchWinConditionEdit] = useState(null);
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [addParticipantName, setAddParticipantName] = useState("");
  const [addParticipantEmail, setAddParticipantEmail] = useState("");
  const [swapMode, setSwapMode] = useState(false);
  const [swapQuickMode, setSwapQuickMode] = useState(false);
  const [editParticipant, setEditParticipant] = useState(null);
  const [editParticipantName, setEditParticipantName] = useState("");
  const [editParticipantEmail, setEditParticipantEmail] = useState("");
  const [showRankScores, setShowRankScores] = useState(false);
  const [rankScoreValues, setRankScoreValues] = useState([]);

  const rawRankings = useMemo(
    () => t.matches ? computeRankings(t.matches, t.bracketType, t.rankScores, t.participants) : [],
    [t.matches, t.bracketType, t.rankScores, t.participants]
  );

  const [rankingsReady, setRankingsReady] = useState(false);

  useEffect(() => {
    if (rawRankings.length > 0) {
      const id = setTimeout(() => setRankingsReady(true), 600);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => setRankingsReady(false), 0);
    return () => clearTimeout(id);
  }, [rawRankings]);

  const rankings = rankingsReady ? rawRankings : [];
  const rankingsLoading = rawRankings.length > 0 && !rankingsReady;
  const rankingsInfo = t.started && rawRankings.length === 0 && t.matches?.some(m => m.isPlayed);

  const isTournamentComplete = t.matches?.length > 0 && t.matches.every((m) => m.winner != null);

  useEffect(() => {
    const checkMobile = () => setSidebarOpen(window.innerWidth > 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleJoin = async () => {
    if (!t.published) return;
    if (t.participants.some((p) => p.id === user.uid)) return;
    if (t.participants.length >= t.maxParticipants) return;
    const ref = doc(db, "tournaments", t.id);
    const name = getUserName(user);
    const newParticipant = { id: user.uid, name, email: user.email };
    await updateDoc(ref, {
      participants: [...t.participants, newParticipant],
    });
    onUpdate({ ...t, participants: [...t.participants, newParticipant] });
    logEvent({ action: "join_tournament", details: { tournamentId: t.id, userId: user.uid, userName: name } });
  };

  const handlePublish = async () => {
    if (!isAdmin) return;
    const ref = doc(db, "tournaments", t.id);
    await updateDoc(ref, { published: true });
    onUpdate({ ...t, published: true });
    logEvent({ action: "publish_tournament", details: { tournamentId: t.id, adminId: user.uid } });
  };

  const handleStartTournament = async () => {
    if (!isAdmin) return;
    const bracketGen = t.bracketType === "double" ? generateDoubleEliminationBracket : generateBracket;
    const wc = t.defaultWinCondition || "ft3";
    const matches = bracketGen(t.participants, t.maxParticipants, wc);
    const ref = doc(db, "tournaments", t.id);
    await updateDoc(ref, { matches, started: true });
    onUpdate({ ...t, matches, started: true });
    logEvent({ action: "start_tournament", details: { tournamentId: t.id, adminId: user.uid, participantCount: t.participants.length, bracketType: t.bracketType } });
  };

  const handleMatchClick = (match) => {
    setSelectedMatch(match);
  };

  const handleSaveScore = async (match, { p1Score, p2Score, winnerIndex, dq }) => {
    if (!isAdmin) return;
    const matchIndex = t.matches.findIndex((m) => m.id === match.id);

    let matches;
    if (dq != null) {
      matches = advanceBracket(t.matches, matchIndex, dq === 0 ? 1 : 0, null);
      matches[matchIndex].dq = dq;
      matches[matchIndex].scoreP1 = null;
      matches[matchIndex].scoreP2 = null;
      const dqd = dq === 0 ? match.player1 : match.player2;
      logEvent({ action: "record_match_score", details: { tournamentId: t.id, matchIndex, winner: dqd === match.player1 ? match.player2 : match.player1, round: match.round, dq: dqd } });
    } else {
      if (typeof p1Score !== "number" || typeof p2Score !== "number" || !Number.isFinite(p1Score) || !Number.isFinite(p2Score) || p1Score < 0 || p2Score < 0) return;
      if (winnerIndex !== 0 && winnerIndex !== 1) return;
      const winner = winnerIndex === 0 ? match.player1 : match.player2;
      matches = advanceBracket(t.matches, matchIndex, winnerIndex, { p1Score, p2Score });
      logEvent({ action: "record_match_score", details: { tournamentId: t.id, matchIndex, winner, round: match.round, score: `${p1Score}-${p2Score}` } });
    }

    const ref = doc(db, "tournaments", t.id);
    await updateDoc(ref, { matches });
    onUpdate({ ...t, matches });

    const updatedTournament = { ...t, matches };
    const allDone = updatedTournament.matches.every((m) => m.winner != null);
    if (allDone && !t.scoresAssigned) {
      const finalRanks = computeRankings(matches, t.bracketType, t.rankScores, t.participants);
      if (!t.rankScores) {
        console.warn("Awarding scores: no rankScores configured, all points will be 0");
      }
      let allSucceeded = true;
      for (const entry of finalRanks) {
        for (const player of entry.players) {
          if (!player.id || player.id.startsWith("manual-") || player.id.startsWith("fake-")) continue;
          if (entry.points === 0) continue;
          try {
            const userRef = doc(db, "users", player.id);
            const snap = await getDoc(userRef);
            if (snap.exists()) {
              await updateDoc(userRef, { score: increment(entry.points) });
            }
          } catch (e) {
            console.warn("Failed to award score to", player.id, player.name, e);
            allSucceeded = false;
          }
        }
      }
      if (allSucceeded) {
        await updateDoc(ref, { scoresAssigned: true });
        onUpdate({ ...updatedTournament, scoresAssigned: true });
      }
    }
  };

  const handleUpdateAllWinConditions = async (condition) => {
    if (!isAdmin) return;
    const ref = doc(db, "tournaments", t.id);
    if (t.matches && t.matches.length > 0) {
      const updatedMatches = t.matches.map((match) => ({
        ...match,
        winCondition: condition,
      }));
      await updateDoc(ref, { matches: updatedMatches, defaultWinCondition: condition });
      onUpdate({ ...t, matches: updatedMatches, defaultWinCondition: condition });
    } else {
      await updateDoc(ref, { defaultWinCondition: condition });
      onUpdate({ ...t, defaultWinCondition: condition });
    }
    logEvent({ action: "update_all_win_conditions", details: { tournamentId: t.id, condition } });
  };

  const handleUpdateMatchWinCondition = async (match, condition) => {
    if (!isAdmin) return;
    const matchIndex = t.matches.findIndex((m) => m.id === match.id);
    const updatedMatches = t.matches.map((m, i) =>
      i === matchIndex ? { ...m, winCondition: condition } : m
    );
    const ref = doc(db, "tournaments", t.id);
    await updateDoc(ref, { matches: updatedMatches });
    onUpdate({ ...t, matches: updatedMatches });
    logEvent({ action: "update_match_win_condition", details: { tournamentId: t.id, matchId: match.id, newCondition: condition, previousCondition: match.winCondition } });
  };

  const handleAddParticipant = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    const name = addParticipantName.trim();
    if (!name) return;
    const rawEmail = addParticipantEmail.trim();
    if (rawEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) return;
    const id = `manual-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const email = rawEmail || `${name.toLowerCase().replace(/\s+/g, '.')}@manual.local`;
    const newParticipant = { id, name, email };
    const ref = doc(db, "tournaments", t.id);
    await updateDoc(ref, {
      participants: [...t.participants, newParticipant],
    });
    onUpdate({ ...t, participants: [...t.participants, newParticipant] });
    logEvent({ action: "add_manual_participant", details: { tournamentId: t.id, participantName: name, participantId: id } });
    setAddParticipantName("");
    setAddParticipantEmail("");
    setShowAddParticipant(false);
  };

  const handleAddFakeUsers = async () => {
    if (!isAdmin) return;
    const numWords = [
      "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight",
      "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen",
      "Sixteen", "Seventeen", "Eighteen", "Nineteen", "Twenty",
    ];
    const currentCount = t.participants.length;
    const slotsAvailable = t.maxParticipants - currentCount;
    const toAdd = Array.from({ length: slotsAvailable }, (_, i) => {
      const num = currentCount + i + 1;
      const word = numWords[num - 1] || String(num);
      return {
        id: `fake-${currentCount + i}`,
        name: `Player ${word}`,
        email: `player${num}@example.com`,
      };
    });
    const ref = doc(db, "tournaments", t.id);
    await updateDoc(ref, {
      participants: [...t.participants, ...toAdd],
    });
    onUpdate({ ...t, participants: [...t.participants, ...toAdd] });
    logEvent({ action: "add_fake_users", details: { tournamentId: t.id, count: toAdd.length } });
  };

  const handleResetBracket = async () => {
    if (!isAdmin) return;
    if (!confirm("Are you sure you want to reset the bracket? All matches will be cleared.")) return;
    const bracketGen = t.bracketType === "double" ? generateDoubleEliminationBracket : generateBracket;
    const wc = t.defaultWinCondition || "ft3";
    const freshMatches = bracketGen(t.participants, t.maxParticipants, wc);
    const ref = doc(db, "tournaments", t.id);
    await updateDoc(ref, { matches: freshMatches });
    onUpdate({ ...t, matches: freshMatches });
    logEvent({ action: "reset_bracket", details: { tournamentId: t.id, adminId: user.uid } });
  };

  const anyMatchPlayed = t.matches?.length > 0 && t.matches.some((m) => m.isPlayed);
  const canSwapPlayers = isAdmin && t.matches?.length > 0 && !anyMatchPlayed && (swapQuickMode || swapMode);

  const handleSwapPlayers = async (matchId1, slot1, matchId2, slot2) => {
    if (!isAdmin) return;
    const matches = swapPlayers(t.matches, matchId1, slot1, matchId2, slot2);
    if (matches === t.matches) return;
    const ref = doc(db, "tournaments", t.id);
    await updateDoc(ref, { matches });
    onUpdate({ ...t, matches });
    logEvent({ action: "swap_players", details: { tournamentId: t.id, matchId1, slot1, matchId2, slot2 } });
    setSwapMode(false);
  };

  const handleEnterSwapMode = () => {
    if (!isAdmin) return;
    if (t.matches.some((m) => m.isPlayed)) return;
    setSwapMode(true);
  };

  const handleExitSwapMode = () => {
    setSwapMode(false);
  };

  const handleEditParticipant = (participant) => {
    setEditParticipant(participant);
    setEditParticipantName(participant.name);
    setEditParticipantEmail(participant.email || "");
  };

  const handleSaveEditParticipant = async (e) => {
    e.preventDefault();
    if (!isAdmin || !editParticipant) return;
    const name = editParticipantName.trim();
    if (!name) return;
    const updatedParticipants = t.participants.map((p) =>
      p.id === editParticipant.id ? { ...p, name, email: editParticipantEmail.trim() || p.email } : p
    );
    const ref = doc(db, "tournaments", t.id);
    await updateDoc(ref, { participants: updatedParticipants });
    onUpdate({ ...t, participants: updatedParticipants });
    logEvent({ action: "edit_participant", details: { tournamentId: t.id, participantId: editParticipant.id, previousName: editParticipant.name, newName: name } });
    setEditParticipant(null);
    setEditParticipantName("");
    setEditParticipantEmail("");
  };

  const handleRemoveParticipant = async (participant) => {
    if (!isAdmin) return;
    if (!confirm(`Remove "${participant.name}" from the tournament?`)) return;
    const updatedParticipants = t.participants.filter((p) => p.id !== participant.id);
    const ref = doc(db, "tournaments", t.id);
    await updateDoc(ref, { participants: updatedParticipants });
    onUpdate({ ...t, participants: updatedParticipants });
    logEvent({ action: "remove_participant", details: { tournamentId: t.id, participantId: participant.id, participantName: participant.name } });
  };

  const handleOpenRankScores = () => {
    const existing = t.rankScores || [];
    const scores = Array.from({ length: t.maxParticipants }, (_, i) => (existing[i] != null ? existing[i] : 0));
    setRankScoreValues(scores);
    setShowRankScores(true);
  };

  const handleSaveRankScores = async () => {
    if (!isAdmin) return;
    const scores = rankScoreValues.map((v) => {
      const n = parseInt(v, 10);
      return isNaN(n) ? 0 : n;
    });
    const ref = doc(db, "tournaments", t.id);
    await updateDoc(ref, { rankScores: scores });
    onUpdate({ ...t, rankScores: scores });
    logEvent({ action: "set_rank_scores", details: { tournamentId: t.id, scores } });
    setShowRankScores(false);
  };

  const handleDelete = async () => {
    if (!isAdmin) return;
    logEvent({ action: "delete_tournament", details: { tournamentId: t.id, adminId: user.uid } });
    onDelete(t.id);
  };

  const getDefaultWinCondition = () => {
    if (t.defaultWinCondition) return t.defaultWinCondition;
    if (t.matches && t.matches.length > 0) return t.matches[0].winCondition || "ft3";
    return "ft3";
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
                  <li key={p.id} className="participant-item">
                    <span className="participant-name">
                      <span className="participant-num">{i + 1}.</span> {p.name}
                    </span>
                    {isAdmin && (
                      <span className="participant-actions">
                        <button className="btn-icon" onClick={() => handleEditParticipant(p)} title="Edit">✎</button>
                        <button className="btn-icon btn-icon-danger" onClick={() => handleRemoveParticipant(p)} title="Remove">✕</button>
                      </span>
                    )}
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
            {isAdmin && !t.started && (
              <button className="btn-secondary" onClick={() => setShowAddParticipant(true)}>
                + Add Participant
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
              {isAdmin && (
                <button className="btn-secondary" onClick={handleOpenRankScores}>
                  Set Scores
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
              {isAdmin && !swapMode && !anyMatchPlayed && !swapQuickMode && (
                <button className="btn-secondary" onClick={handleEnterSwapMode}>
                  ⇄ Swap Players
                </button>
              )}
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
            {swapMode && (
              <div className="swap-banner">
                <span>Click two players to swap them</span>
                <button className="btn-secondary btn-swap-cancel" onClick={handleExitSwapMode}>
                  Cancel
                </button>
              </div>
            )}
            <BracketView
              matches={t.matches}
              onMatchClick={handleMatchClick}
              isAdmin={isAdmin}
              bracketType={t.bracketType}
              onMatchWinConditionClick={(match) => setMatchWinConditionEdit(match)}
              canSwap={canSwapPlayers}
              onSwapPlayers={handleSwapPlayers}
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

      <TournamentSidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        currentCondition={getDefaultWinCondition()}
        onUpdateCondition={handleUpdateAllWinConditions}
        isDev={isDev}
        swapQuickMode={swapQuickMode}
        onSwapQuickModeToggle={setSwapQuickMode}
        isAdmin={isAdmin}
        rankings={rankings}
        rankingsLoading={rankingsLoading}
        rankingsInfo={rankingsInfo}
        tournamentComplete={isTournamentComplete}
        onOpenRankScores={handleOpenRankScores}
      />

      <MatchScoreModal
        isOpen={!!selectedMatch}
        onClose={() => setSelectedMatch(null)}
        match={selectedMatch}
        onSave={handleSaveScore}
        bracketType={t.bracketType}
        allMatches={t.matches}
      />

      <BaseModal
        isOpen={!!matchWinConditionEdit}
        onClose={() => setMatchWinConditionEdit(null)}
        title="Match Win Condition"
      >
        <div className="modal-options">
          {WIN_CONDITIONS.map((condition) => (
            <button
              key={condition}
              className={`modal-option ${matchWinConditionEdit?.winCondition === condition ? "selected" : ""}`}
              onClick={() => {
                if (matchWinConditionEdit) {
                  handleUpdateMatchWinCondition(matchWinConditionEdit, condition);
                  setMatchWinConditionEdit(null);
                }
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

      <BaseModal
        isOpen={showAddParticipant}
        onClose={() => { setShowAddParticipant(false); setAddParticipantName(""); setAddParticipantEmail(""); }}
        title="Add Participant"
      >
        <form onSubmit={handleAddParticipant}>
          <label className="modal-field">
            <span>Name</span>
            <input
              type="text"
              value={addParticipantName}
              onChange={(e) => setAddParticipantName(e.target.value)}
              placeholder="Player name"
              autoFocus
              required
            />
          </label>
          <label className="modal-field">
            <span>Email (optional)</span>
            <input
              type="email"
              value={addParticipantEmail}
              onChange={(e) => setAddParticipantEmail(e.target.value)}
              placeholder="player@example.com"
            />
          </label>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={() => { setShowAddParticipant(false); setAddParticipantName(""); setAddParticipantEmail(""); }}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={!addParticipantName.trim()}>
              Add
            </button>
          </div>
        </form>
      </BaseModal>

      <BaseModal
        isOpen={!!editParticipant}
        onClose={() => { setEditParticipant(null); setEditParticipantName(""); setEditParticipantEmail(""); }}
        title="Edit Participant"
      >
        <form onSubmit={handleSaveEditParticipant}>
          <label className="modal-field">
            <span>Name</span>
            <input
              type="text"
              value={editParticipantName}
              onChange={(e) => setEditParticipantName(e.target.value)}
              placeholder="Player name"
              autoFocus
              required
            />
          </label>
          <label className="modal-field">
            <span>Email</span>
            <input
              type="email"
              value={editParticipantEmail}
              onChange={(e) => setEditParticipantEmail(e.target.value)}
              placeholder="player@example.com"
            />
          </label>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={() => { setEditParticipant(null); setEditParticipantName(""); setEditParticipantEmail(""); }}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={!editParticipantName.trim()}>
              Save
            </button>
          </div>
        </form>
      </BaseModal>

      <BaseModal
        isOpen={showRankScores}
        onClose={() => setShowRankScores(false)}
        title="Score Settings"
      >
        <p className="modal-desc">Set points awarded for each finishing position.</p>
        <div className="rank-scores-list">
          {rankScoreValues.map((val, i) => (
            <label key={i} className="rank-score-field">
              <span className="rank-score-label">{i + 1}{i === 0 ? "st" : i === 1 ? "nd" : i === 2 ? "rd" : "th"} Place</span>
              <input
                type="number"
                min="0"
                value={val}
                onChange={(e) => {
                  const next = [...rankScoreValues];
                  next[i] = e.target.value;
                  setRankScoreValues(next);
                }}
                className="rank-score-input"
              />
            </label>
          ))}
        </div>
        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={() => setShowRankScores(false)}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={handleSaveRankScores}>
            Save Scores
          </button>
        </div>
      </BaseModal>
    </div>
  );
}
