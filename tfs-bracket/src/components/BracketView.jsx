import { groupByRound } from "../utils/bracket";

function getRoundName(roundMatches, isLastRound, isFirstRound, hasPrelims) {
  if (isFirstRound && hasPrelims) return "Preliminary";

  const count = roundMatches.length;
  if (isLastRound) return "Finals";
  if (count === 2) return "Semifinals";
  if (count === 4) return "Quarterfinals";
  if (count === 8) return "Round of 16";
  return `Round ${roundMatches[0]?.round ?? 0}`;
}

export default function BracketView({ matches, onMatchClick, isAdmin }) {
  if (!matches || matches.length === 0) {
    return <p className="empty">No matches yet</p>;
  }

  const rounds = groupByRound(matches);
  const hasPrelims = rounds.length > 0 && rounds[0].length < rounds[1]?.length;

  const lastRound = rounds[rounds.length - 1];
  const championMatch = lastRound?.find(m => m.isPlayed && m.winner != null);
  const champion = championMatch && championMatch.player1 !== "BYE" && championMatch.player2 !== "BYE"
    ? (championMatch.winner === 0 ? championMatch.player1 : championMatch.player2)
    : null;

  return (
    <div className="bracket">
      <h3>Bracket</h3>
      <div className="bracket-rounds">
        {rounds.map((roundMatches, roundIndex) => (
          <div key={roundIndex} className="round">
            <h4>{getRoundName(roundMatches, roundIndex === rounds.length - 1, roundIndex === 0, hasPrelims)}</h4>
            <div className="round-matches">
            {roundMatches.map((match) => {
              if (match.player1 === "BYE" && match.player2 === "BYE") return null;
              const isPlayed = match.isPlayed === true || match.winner != null;
              const isFuture = !match.player1 || !match.player2 || match.player1 === "TBD";
              const hasBye = match.player2 === "BYE";
              const isClickable = isAdmin && !isPlayed && !hasBye;
              return (
                <div
                  key={match.id}
                  className={`match ${isPlayed ? "completed" : ""} ${isFuture && !isPlayed ? "future" : ""} ${hasBye && isPlayed ? "bye-match" : ""} ${isClickable ? "clickable" : ""}`}
                  onClick={() => isClickable && onMatchClick(match)}
                >
                  <div className="match-header">
                    {!hasBye && (
                      <span className="match-win-condition">{match.winCondition?.toUpperCase() || "FT3"}</span>
                    )}
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
          </div>
        ))}
      </div>
      {champion && (
        <div className="champion-display">
          <h3>Champion</h3>
          <div className="champion-name">{champion}</div>
        </div>
      )}
    </div>
  );
}
