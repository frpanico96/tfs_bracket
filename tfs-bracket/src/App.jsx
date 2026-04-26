import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  signInWithGoogle,
  logOut,
  auth,
  db,
  tournamentsRef,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
} from "./firebase";
import "./App.css";

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
      <header className="header">
        <h1 onClick={() => setView("list")} style={{ cursor: "pointer" }}>
          TFS Bracket
        </h1>
        <div className="user-info">
          <img src={user.photoURL} alt="" className="avatar" />
          <span>{user.displayName}</span>
          <button className="btn-secondary" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="main">
        {view === "list" && (
          <TournamentList
            tournaments={tournaments}
            user={user}
            onSelect={(t) => {
              setSelectedTournament(t);
              setView("detail");
            }}
            onCreate={() => setView("create")}
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
            user={user}
            onBack={() => setView("list")}
            onUpdate={(t) => setSelectedTournament(t)}
          />
        )}
      </main>
    </div>
  );
}

function TournamentList({ tournaments, user, onSelect, onCreate }) {
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
            const canJoin =
              t.published &&
              t.participants.length < t.maxParticipants &&
              new Date(t.regEnd) > now;
            return (
              <div key={t.id} className="card" onClick={() => onSelect(t)}>
                <h3>{t.name}</h3>
                <p>
                  {t.participants.length}/{t.maxParticipants} players
                </p>
                <p>
                  {t.published ? "Published" : "Draft"} • Reg:{" "}
                  {new Date(t.regStart).toLocaleDateString()} -{" "}
                  {new Date(t.regEnd).toLocaleDateString()}
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

function CreateTournament({ user, onCancel, onCreated }) {
  const [name, setName] = useState("");
  const [maxParticipants, setMaxParticipants] = useState(8);
  const [regStart, setRegStart] = useState("");
  const [regEnd, setRegEnd] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !regStart || !regEnd) {
      alert("Please fill all fields");
      return;
    }
    try {
      const docRef = await addDoc(tournamentsRef, {
        name,
        maxParticipants: parseInt(maxParticipants),
        regStart: new Date(regStart),
        regEnd: new Date(regEnd),
        createdAt: serverTimestamp(),
        adminId: user.uid,
        adminName: user.displayName,
        published: false,
        participants: [],
        matches: [],
      });
      onCreated({ id: docRef.id, name, maxParticipants, regStart, regEnd });
    } catch (error) {
      console.error("Create failed:", error);
      alert("Failed to create tournament: " + error.message);
    }
  };

  return (
    <div className="create-tournament">
      <h2>Create Tournament</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Tournament Name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Tournament"
            required
          />
        </label>
        <label>
          Max Participants
          <select
            value={maxParticipants}
            onChange={(e) => setMaxParticipants(e.target.value)}
          >
            <option value={4}>4</option>
            <option value={8}>8</option>
            <option value={16}>16</option>
            <option value={32}>32</option>
          </select>
        </label>
        <label>
          Registration Start
          <input
            type="datetime-local"
            value={regStart}
            onChange={(e) => setRegStart(e.target.value)}
            required
          />
        </label>
        <label>
          Registration End
          <input
            type="datetime-local"
            value={regEnd}
            onChange={(e) => setRegEnd(e.target.value)}
            required
          />
        </label>
        <div className="buttons">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            Create
          </button>
        </div>
      </form>
    </div>
  );
}

function TournamentDetail({ tournament, user, onBack, onUpdate }) {
  const isDev = import.meta.env.DEV;
  const isAdmin = user.uid === tournament.adminId;
  const now = new Date();
  const regOpen =
    tournament.published &&
    new Date(tournament.regStart) <= now &&
    new Date(tournament.regEnd) > now;
  const canJoin =
    regOpen &&
    !tournament.participants.some((p) => p.id === user.uid) &&
    tournament.participants.length < tournament.maxParticipants;

  const handleJoin = async () => {
    const ref = doc(db, "tournaments", tournament.id);
    await updateDoc(ref, {
      participants: [
        ...tournament.participants,
        { id: user.uid, name: user.displayName, email: user.email },
      ],
    });
    onUpdate({
      ...tournament,
      participants: [
        ...tournament.participants,
        { id: user.uid, name: user.displayName, email: user.email },
      ],
    });
  };

  const handlePublish = async () => {
    const ref = doc(db, "tournaments", tournament.id);
    await updateDoc(ref, { published: true });
    onUpdate({ ...tournament, published: true });
  };

  const handleStartTournament = async () => {
    const matches = generateBracket(tournament.participants, tournament.maxParticipants);
    const ref = doc(db, "tournaments", tournament.id);
    await updateDoc(ref, { matches, started: true });
    onUpdate({ ...tournament, matches, started: true });
  };

  const handleUpdateMatch = async (matchIndex, winnerIndex) => {
    const matches = [...tournament.matches];
    matches[matchIndex].winner = winnerIndex;
    const ref = doc(db, "tournaments", tournament.id);
    await updateDoc(ref, { matches });
    onUpdate({ ...tournament, matches });
  };

  const handleAddFakeUsers = async () => {
    const fakeNames = [
      "Player One", "Player Two", "Player Three", "Player Four",
      "Player Five", "Player Six", "Player Seven", "Player Eight",
    ];
    const currentCount = tournament.participants.length;
    const slotsAvailable = tournament.maxParticipants - currentCount;
    const toAdd = fakeNames.slice(0, slotsAvailable).map((name, i) => ({
      id: `fake-${currentCount + i}`,
      name,
      email: `${name.toLowerCase().replace(" ", "-")}@example.com`,
    }));
    const ref = doc(db, "tournaments", tournament.id);
    await updateDoc(ref, {
      participants: [...tournament.participants, ...toAdd],
    });
    onUpdate({ ...tournament, participants: [...tournament.participants, ...toAdd] });
  };

  return (
    <div className="tournament-detail">
      <button className="btn-back" onClick={onBack}>
        ← Back
      </button>
      <div className="detail-header">
        <h2>{tournament.name}</h2>
        {isAdmin && !tournament.published && (
          <button className="btn-primary" onClick={handlePublish}>
            Publish
          </button>
        )}
      </div>

      <div className="detail-info">
        <p>
          <strong>Admin:</strong> {tournament.adminName}
        </p>
        <p>
          <strong>Registration:</strong> {new Date(tournament.regStart).toLocaleString()} -{" "}
          {new Date(tournament.regEnd).toLocaleString()}
        </p>
        <p>
          <strong>Status:</strong>{" "}
          {tournament.started
            ? "In Progress"
            : tournament.published
            ? "Open"
            : "Draft"}
        </p>
      </div>

      {!tournament.started && (
        <div className="participants-section">
          <h3>
            Participants ({tournament.participants.length}/{tournament.maxParticipants})
          </h3>
          {tournament.participants.length === 0 ? (
            <p className="empty">No participants yet</p>
          ) : (
            <ul className="participants-list">
              {tournament.participants.map((p, i) => (
                <li key={i}>
                  {i + 1}. {p.name}
                </li>
              ))}
            </ul>
          )}
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
            {isAdmin &&
              tournament.published &&
              tournament.participants.length >= 2 &&
              !tournament.started && (
                <button className="btn-primary" onClick={handleStartTournament}>
                  Start Tournament
                </button>
              )}
        </div>
      )}

      {tournament.started && tournament.matches && (
        <BracketView
          matches={tournament.matches}
          onUpdateMatch={handleUpdateMatch}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}

function BracketView({ matches, onUpdateMatch, isAdmin }) {
  if (!matches || matches.length === 0) {
    return <p className="empty">No matches yet</p>;
  }

  const rounds = groupByRound(matches);

  return (
    <div className="bracket">
      <h3>Bracket</h3>
      <div className="bracket-rounds">
        {rounds.map((roundMatches, roundIndex) => (
          <div key={roundIndex} className="round">
            <h4>Round {roundIndex + 1}</h4>
            {roundMatches.map((match, i) => {
              const matchIndex = matches.indexOf(match);
              return (
                <div
                  key={i}
                  className={`match ${match.winner !== null ? "completed" : ""}`}
                >
                  <div className="match-row">
                    <span
                      className={
                        match.winner === 0 ? "winner" : ""
                      }
                    >
                      {match.player1 || "TBD"}
                    </span>
                    {isAdmin && match.winner === null && (
                      <button
                        className="btn-small"
                        onClick={() => onUpdateMatch(matchIndex, 0)}
                      >
                        Win
                      </button>
                    )}
                  </div>
                  <div className="match-row">
                    <span
                      className={
                        match.winner === 1 ? "winner" : ""
                      }
                    >
                      {match.player2 || "TBD"}
                    </span>
                    {isAdmin && match.winner === null && (
                      <button
                        className="btn-small"
                        onClick={() => onUpdateMatch(matchIndex, 1)}
                      >
                        Win
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function generateBracket(participants, max) {
  const shuffled = [...participants].sort(() => Math.random() - 0.5);
  const players = shuffled.slice(0, max);
  const matches = [];

  for (let i = 0; i < players.length; i += 2) {
    if (players[i + 1]) {
      matches.push({
        round: 1,
        player1: players[i].name,
        player2: players[i + 1].name,
        winner: null,
      });
    } else {
      matches.push({
        round: 1,
        player1: players[i].name,
        player2: "BYE",
        winner: 0,
      });
    }
  }
  return matches;
}

function groupByRound(matches) {
  const rounds = [];
  matches.forEach((m) => {
    if (!rounds[m.round - 1]) rounds[m.round - 1] = [];
    rounds[m.round - 1].push(m);
  });
  return rounds;
}

export default App;