import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  signInWithGoogle,
  signInWithDiscord,
  logOut,
  auth,
  db,
  tournamentsRef,
  query,
  where,
  onSnapshot,
  doc,
  deleteDoc,
  getDoc,
} from "./firebase";
import "./App.css";
import Header from "./components/Header";
import TournamentList from "./components/TournamentList";
import CreateTournament from "./components/CreateTournament";
import TournamentDetail from "./components/TournamentDetail";
import Leaderboard from "./components/Leaderboard";
import InviteModal from "./components/InviteModal";
import ReleaseNotes from "./components/ReleaseNotes";
import VersionBadges from "./components/VersionBadges";
import RestrictedAccess from "./components/RestrictedAccess";
import useUserRole from "./hooks/useUserRole";

function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [view, setView] = useState(() => localStorage.getItem("tfs_view") || "list");
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteToken] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("invite") || null;
  });
  const [showReleaseNotes, setShowReleaseNotes] = useState(false);
  const [pendingTournamentId, setPendingTournamentId] = useState(() => {
    const v = localStorage.getItem("tfs_view");
    if (v === "detail") return localStorage.getItem("tfs_tournamentId") || null;
    return null;
  });
  const version = import.meta.env.VITE_DEV_VERSION || "beta-v0.2";
  const { role, isGlobalAdmin, isSuperAdmin, loading, inviteResult, isAuthorized } = useUserRole(user, inviteToken);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    localStorage.setItem("tfs_view", view);
    if (view === "detail" && selectedTournament) {
      localStorage.setItem("tfs_tournamentId", selectedTournament.id);
    } else {
      localStorage.removeItem("tfs_tournamentId");
    }
  }, [view, selectedTournament, user]);

  useEffect(() => {
    if (pendingTournamentId && tournaments.length > 0) {
      const match = tournaments.find((t) => t.id === pendingTournamentId);
      if (match) {
        setSelectedTournament(match);
        setPendingTournamentId(null);
      } else {
        setView("list");
        setSelectedTournament(null);
        setPendingTournamentId(null);
        localStorage.removeItem("tfs_view");
        localStorage.removeItem("tfs_tournamentId");
      }
    }
  }, [tournaments, pendingTournamentId]);

  useEffect(() => {
    if (loading || view === "leaderboard") return;

    const constraints = isGlobalAdmin
      ? []
      : [where("published", "==", true)];

    const q = query(tournamentsRef, ...constraints);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      data.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() ?? 0;
        const bTime = b.createdAt?.toMillis?.() ?? 0;
        return bTime - aTime;
      });
      setTournaments(data);
    });
    return () => unsubscribe();
  }, [loading, isGlobalAdmin, view]);

  useEffect(() => {
    if (view === "create" && !isGlobalAdmin) {
      setView("list");
    }
  }, [view, isGlobalAdmin]);

  useEffect(() => {
    if (!inviteResult) return;
    const url = new URL(window.location);
    if (url.searchParams.has("invite")) {
      url.searchParams.delete("invite");
      window.history.replaceState({}, "", url);
    }
  }, [inviteResult]);

  const handleLogin = (provider) => async () => {
    try {
      if (provider === "discord") {
        await signInWithDiscord();
      } else {
        await signInWithGoogle();
      }
    } catch (e) {
      alert("Login failed: " + e.message);
    }
  };

  const handleLogout = async () => {
    await logOut();
    setView("list");
    setSelectedTournament(null);
    localStorage.removeItem("tfs_view");
    localStorage.removeItem("tfs_tournamentId");
  };

  const handleDeleteTournament = async (tournamentId) => {
    if (!user) return;
    const ref = doc(db, "tournaments", tournamentId);
    const snap = await getDoc(ref);
    if (!snap.exists() || snap.data().adminId !== user.uid) return;
    await deleteDoc(ref);
    setView("list");
    setSelectedTournament(null);
  };

  if (!authReady) {
    return (
      <div className="login-container">
        <div className="login-box">
          <h1>TFS Bracket</h1>
          <div className="loading-spinner" />
          <p className="loading-text">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <div className="login-container">
          <div className="login-box">
            <h1>TFS Bracket <VersionBadges onVersionClick={() => setShowReleaseNotes(true)} /></h1>
            <p>Create and manage tournament brackets</p>
            <div className="login-buttons">
              <button className="btn-primary login-btn-google" onClick={handleLogin("google")}>
                Sign in with Google
              </button>
              <button className="btn-primary login-btn-discord" onClick={handleLogin("discord")}>
                Sign in with Discord
              </button>
            </div>
          </div>
        </div>
        <ReleaseNotes
          isOpen={showReleaseNotes}
          onClose={() => setShowReleaseNotes(false)}
          currentVersion={version}
        />
      </>
    );
  }

  if (loading) {
    return (
      <div className="app">
         <Header user={user} onLogout={handleLogout} onLogoClick={() => setView("list")} onVersionClick={() => setShowReleaseNotes(true)} />
        <main className="main">
          <p className="empty">Loading...</p>
        </main>
      </div>
    );
  }

  if (isAuthorized === false) {
    return <RestrictedAccess user={user} onLogout={handleLogout} />;
  }

  return (
    <div className="app">
      <Header
        user={user}
        role={role}
        isSuperAdmin={isSuperAdmin}
        isGlobalAdmin={isGlobalAdmin}
        onLogout={handleLogout}
        onLogoClick={() => setView("list")}
        onInvite={() => setShowInviteModal(true)}
        onNavigate={setView}
        onVersionClick={() => setShowReleaseNotes(true)}
      />

      <main className={`main ${view === "detail" ? "main-full" : ""}`}>
        {inviteResult && (
          <div className={`invite-banner invite-${inviteResult.success ? "success" : "error"}`}>
            {inviteResult.success
              ? `Invite accepted! You are now registered as ${inviteResult.role.replace("_", " ")}.`
              : inviteResult.reason === "invalid"
              ? "This invite link is invalid, expired, or has reached its maximum uses."
              : inviteResult.reason === "error"
              ? "Failed to process invite. Check the console or try again."
              : "This invite was sent to a different email address."}
          </div>
        )}
        <div className="view-container">
          {view === "list" && (
            <TournamentList
              tournaments={tournaments}
              user={user}
              isGlobalAdmin={isGlobalAdmin}
              onSelect={(t) => {
                setSelectedTournament(t);
                setView("detail");
              }}
              onCreate={() => setView("create")}
              onDelete={handleDeleteTournament}
            />
          )}
          {view === "create" && isGlobalAdmin && (
            <CreateTournament
              user={user}
              onCancel={() => setView("list")}
              onCreated={(t) => {
                setSelectedTournament(t);
                setView("detail");
              }}
            />
          )}
          {view === "detail" && selectedTournament && (
            <TournamentDetail
              tournament={selectedTournament}
              user={user}
              onBack={() => setView("list")}
              onUpdate={(t) => setSelectedTournament(t)}
              onDelete={handleDeleteTournament}
            />
          )}
          {view === "leaderboard" && (
            <Leaderboard />
          )}
        </div>
      </main>

      {showInviteModal && (
        <InviteModal
          user={user}
          isSuperAdmin={isSuperAdmin}
          onClose={() => setShowInviteModal(false)}
        />
      )}
      <ReleaseNotes
        isOpen={showReleaseNotes}
        onClose={() => setShowReleaseNotes(false)}
        currentVersion={version}
      />
    </div>
  );
}

export default App;