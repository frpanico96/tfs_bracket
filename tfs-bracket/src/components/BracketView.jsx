import { groupByRound } from "../utils/bracket";

export default function BracketView({ matches, onMatchClick, isAdmin }) {
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
              const isPlayed = match.isPlayed === true || match.winner != null;
              const isFuture = !match.player1 || !match.player2 || match.player1 === "TBD";
              const isClickable = isAdmin && !isPlayed && match.player2 !== "BYE";
              return (
                <div
                  key={match.id}
                  className={`match ${isPlayed ? "completed" : ""} ${isFuture && !isPlayed ? "future" : ""} ${isClickable ? "clickable" : ""}`}
                  onClick={() => isClickable && onMatchClick(match)}
                >
                  <div className="match-header">
                    <span className="match-win-condition">{match.winCondition?.toUpperCase() || "FT3"}</span>
                  </div>
                  <div className="match-row">
                    <span className={match.winner === 0 ? "winner" : ""}>
                      {match.player1 || "TBD"}
                    </span>
                    {isPlayed && match.player2 !== "BYE" && (
                      <span className={`score-badge ${match.winner === 0 ? "score-winner" : "score-loser"}`}>
                        {match.scoreP1}
                      </span>
                    )}
                  </div>
                  <div className="match-row">
                    <span className={match.winner === 1 ? "winner" : ""}>
                      {match.player2 || "TBD"}
                    </span>
                    {isPlayed && match.player2 !== "BYE" && (
                      <span className={`score-badge ${match.winner === 1 ? "score-winner" : "score-loser"}`}>
                        {match.scoreP2}
                      </span>
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
