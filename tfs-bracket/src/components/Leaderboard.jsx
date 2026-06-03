import { useState, useEffect } from "react";
import { db, usersRef, query, where, onSnapshot } from "../firebase";

export default function Leaderboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(usersRef, where("score", ">", 0));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .sort((a, b) => (b.score || 0) - (a.score || 0));
      setUsers(data);
      setLoading(false);
    }, () => {
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="leaderboard">
      <h2>Leaderboard</h2>
      {loading ? (
        <p className="empty">Loading...</p>
      ) : users.length === 0 ? (
        <p className="empty">No scores recorded yet. Complete a tournament to earn points!</p>
      ) : (
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={u.id} className={i < 3 ? `leaderboard-top leaderboard-top-${i + 1}` : ""}>
                <td className="leaderboard-rank">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</td>
                <td className="leaderboard-name">{u.display_name || u.name || u.email || u.id}</td>
                <td className="leaderboard-score">{u.score || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}