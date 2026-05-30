import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  signInWithGoogle,
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
import InviteModal from "./components/InviteModal";
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
  const { role, isGlobalAdmin, isSuperAdmin, loading, inviteResult, isAuthorized } = useUserRole(user, inviteToken);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) return;

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
  }, [loading, isGlobalAdmin]);

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
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
    const version = import.meta.env.VITE_APP_VERSION || "beta-v0.1";
    return (
      <div className="login-container">
        <div className="login-box">
          <h1>TFS Bracket <span className="version-badge">{version}</span></h1>
          <p>Create and manage tournament brackets</p>
          <button className="btn-primary" onClick={handleLogin}>
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="app">
        <Header user={user} onLogout={handleLogout} onLogoClick={() => setView("list")} />
        <main className="main">
          <p className="empty">Loading...</p>
        </main>
      </div>
    );
  }

  if (isAuthorized === false) {
    return (
      <div className="app">
        <Header user={user} onLogout={handleLogout} onLogoClick={() => setView("list")} />
        <main className="main">
          <div className="access-denied">
            <h2>Access Restricted</h2>
            <p>This application is currently in private testing.</p>
            <p>You need an invitation link to access it.</p>
          </div>
        </main>
      </div>
    );
  }

  // Non-admin trying to access create view: redirect to list
  if (view === "create" && !isGlobalAdmin) {
    setView("list");
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
      />

      <main className={`main ${view === "detail" ? "main-full" : ""}`}>
        {inviteResult && (
          <div className={`invite-banner invite-${inviteResult.success ? "success" : "error"}`}>
            {inviteResult.success
              ? `Invite accepted! You are now registered as ${inviteResult.role.replace("_", " ")}.`
              : inviteResult.reason === "invalid"
              ? "This invite link is invalid or has already been used."
              : inviteResult.reason === "error"
              ? "Failed to process invite. Check the console or try again."
              : "This invite was sent to a different email address."}
          </div>
        )}
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
      </main>

      {showInviteModal && (
        <InviteModal
          user={user}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </div>
  );
}

export default App;