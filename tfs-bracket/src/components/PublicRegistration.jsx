import { useState, useEffect } from "react";
import { db, doc, getDoc, addDoc, serverTimestamp, registrationTokensRef, registrationEntriesRef } from "../firebase";

export default function PublicRegistration({ token }) {
  const [name, setName] = useState("");
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [tournamentId, setTournamentId] = useState(null);
  const [tournamentName, setTournamentName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const tokenDoc = await getDoc(doc(registrationTokensRef, token));
        if (!tokenDoc.exists()) {
          if (!cancelled) { setError("Invalid registration link."); setStatus("error"); }
          return;
        }
        const tid = tokenDoc.data().tournamentId;
        setTournamentId(tid);
        const tournDoc = await getDoc(doc(db, "tournaments", tid));
        if (!tournDoc.exists() || !tournDoc.data().published) {
          if (!cancelled) { setError("This tournament is not available for registration."); setStatus("error"); }
          return;
        }
        const t = tournDoc.data();
        setTournamentName(t.name);
        const now = new Date();
        const regStart = t.regStart?.toMillis ? new Date(t.regStart.toMillis()) : new Date(t.regStart);
        const regEnd = t.regEnd?.toMillis ? new Date(t.regEnd.toMillis()) : new Date(t.regEnd);
        if (now < regStart) {
          if (!cancelled) { setError("Registration for this tournament has not started yet."); setStatus("error"); }
          return;
        }
        if (now >= regEnd) {
          if (!cancelled) { setError("Registration for this tournament has closed."); setStatus("error"); }
          return;
        }
        if (t.participants.length >= t.maxParticipants) {
          if (!cancelled) { setError("This tournament is full."); setStatus("error"); }
          return;
        }
        if (!cancelled) setStatus("form");
      } catch {
        if (!cancelled) { setError("Could not load registration. Please try again."); setStatus("error"); }
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      await addDoc(registrationEntriesRef, {
        name: trimmed,
        tournamentId,
        token,
        createdAt: serverTimestamp(),
      });
      setStatus("done");
    } catch {
      setError("Registration failed. Please try again.");
      setStatus("error");
      setSubmitting(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="login-container">
        <div className="login-box">
          <h1>TFS Bracket</h1>
          <div className="loading-spinner" />
          <p className="loading-text">Loading registration...</p>
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

  if (status === "done") {
    return (
      <div className="login-container">
        <div className="login-box">
          <h1>TFS Bracket</h1>
          <div className="public-reg-success">
            <span className="public-reg-check" aria-hidden="true">✓</span>
            <p>You're registered for <strong>{tournamentName}</strong>!</p>
            <p>Your registration is pending approval by the tournament admin.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>TFS Bracket</h1>
        <h2 className="public-reg-tournament-name">{tournamentName}</h2>
        <p className="public-reg-desc">Enter your name to register for this tournament.</p>
        <form onSubmit={handleSubmit} className="public-reg-form">
          <label className="public-reg-label">
            <span>Your Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              maxLength={30}
              required
              autoFocus
              disabled={submitting}
            />
          </label>
          <button type="submit" className="btn-primary" disabled={!name.trim() || submitting}>
            {submitting ? "Registering..." : "Register"}
          </button>
        </form>
      </div>
    </div>
  );
}
