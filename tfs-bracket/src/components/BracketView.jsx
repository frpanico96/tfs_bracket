import { groupByRound } from "../utils/bracket";

export default function BracketView({ matches, onUpdateMatch, isAdmin }) {
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
            {roundMatches.map((match) => {
              const matchIndex = matches.findIndex(m => m.id === match.id);
              const isPlayed = match.isPlayed === true || match.winner != null;
              const isFuture = !match.player1 || !match.player2 || match.player1 === "TBD";
              return (
                <div
                  key={match.id}
                  className={`match ${isPlayed ? "completed" : ""} ${isFuture && !isPlayed ? "future" : ""}`}
                >
                  <div className="match-row">
                    <span className={match.winner === 0 ? "winner" : ""}>
                      {match.player1 || "TBD"}
                    </span>
                    {isAdmin && !isPlayed && match.player2 !== "BYE" && (
                      <button
                        className="btn-small"
                        onClick={() => onUpdateMatch(matchIndex, 0)}
                      >
                        Win
                      </button>
                    )}
                  </div>
                  <div className="match-row">
                    <span className={match.winner === 1 ? "winner" : ""}>
                      {match.player2 || "TBD"}
                    </span>
                    {isAdmin && !isPlayed && match.player2 !== "BYE" && (
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