import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  signInWithGoogle,
  logOut,
  auth,
  db,
  tournamentsRef,
  query,
  orderBy,
  onSnapshot,
  doc,
  deleteDoc,
} from "./firebase";
import "./App.css";
import Header from "./components/Header";
import TournamentList from "./components/TournamentList";
import CreateTournament from "./components/CreateTournament";
import TournamentDetail from "./components/TournamentDetail";

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("list");
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(tournamentsRef, orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTournaments(data);
    });
    return () => unsubscribe();
  }, []);

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
    const ref = doc(db, "tournaments", tournamentId);
    await deleteDoc(ref);
    setView("list");
    setSelectedTournament(null);
  };

  if (!user) {
    return (
      <div className="login-container">
        <div className="login-box">
          <h1>TFS Bracket</h1>
          <p>Create and manage tournament brackets</p>
          <button className="btn-primary" onClick={handleLogin}>
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Header user={user} onLogout={handleLogout} onLogoClick={() => setView("list")} />

      <main className={`main ${view === "detail" ? "main-full" : ""}`}>
        {view === "list" && (
          <TournamentList
            tournaments={tournaments}
            user={user}
            onSelect={(t) => {
              setSelectedTournament(t);
              setView("detail");
            }}
            onCreate={() => setView("create")}
            onDelete={handleDeleteTournament}
          />
        )}
        {view === "create" && (
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
            tournaments={tournaments}
            user={user}
            onBack={() => setView("list")}
            onUpdate={(t) => setSelectedTournament(t)}
            onDelete={handleDeleteTournament}
          />
        )}
      </main>
    </div>
  );
}

export default App;