import { useState, useEffect } from "react";
import { db, doc, getDoc, bracketTokensRef } from "../firebase";
import BracketView from "./BracketView";

export default function PublicBracketView({ token }) {
  const [tournament, setTournament] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const tokenDoc = await getDoc(doc(bracketTokensRef, token));
        if (!tokenDoc.exists()) {
          if (!cancelled) { setError("This bracket link is invalid or has expired."); setStatus("error"); }
          return;
        }
        const data = tokenDoc.data();
        const expiresAt = data.expiresAt?.toMillis ? new Date(data.expiresAt.toMillis()) : new Date(data.expiresAt);
        if (Date.now() > expiresAt.getTime()) {
          if (!cancelled) { setError("This bracket link has expired."); setStatus("error"); }
          return;
        }
        const snap = await getDoc(doc(db, "tournaments", data.tournamentId));
        if (!snap.exists() || !snap.data().published) {
          if (!cancelled) { setError("Bracket not found or not yet published."); setStatus("error"); }
          return;
        }
        const t = { id: snap.id, ...snap.data() };
        setTournament(t);
        if (!cancelled) setStatus("loaded");
      } catch {
        if (!cancelled) { setError("Could not load the bracket."); setStatus("error"); }
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  if (status === "loading") {
    return (
      <div className="login-container">
        <div className="login-box">
          <h1>TFS Bracket</h1>
          <div className="loading-spinner" />
          <p className="loading-text">Loading bracket...</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="login-container">
        <div className="login-box">
          <h1>TFS Bracket</h1>
          <p className="public-reg-error">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="public-bracket-page">
      <div className="public-bracket-header">
        <h1>{tournament.name}</h1>
        <p className="public-bracket-meta">
          Admin: {tournament.adminName}
          {tournament.game?.name && ` \u00B7 ${tournament.game.name}`}
        </p>
      </div>
      <div className="public-bracket-content">
        <BracketView
          matches={tournament.matches || []}
          onMatchClick={() => {}}
          isAdmin={false}
          bracketType={tournament.bracketType}
          onMatchWinConditionClick={() => {}}
          canSwap={false}
          onSwapPlayers={() => {}}
        />
      </div>
    </div>
  );
}