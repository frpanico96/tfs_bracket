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
  const [view, setView] = useState("list");
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteToken] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("invite") || null;
  });
  const [showReleaseNotes, setShowReleaseNotes] = useState(false);
  const version = import.meta.env.VITE_DEV_VERSION || "beta-v0.2";
  const { role, isGlobalAdmin, isSuperAdmin, loading, inviteResult, isAuthorized } = useUserRole(user, inviteToken);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

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