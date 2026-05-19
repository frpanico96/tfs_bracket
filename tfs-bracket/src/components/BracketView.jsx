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

function getWbRoundName(roundMatches, roundIndex, totalRounds) {
  if (roundIndex === 0 && roundMatches.length < 4) return "Preliminary";
  const count = roundMatches.length;
  if (roundIndex === totalRounds - 1) return "Winners Final";
  if (count === 2) return "Semifinals";
  if (count === 4) return "Quarterfinals";
  if (count === 8) return "Round of 16";
  return `WB Round ${roundMatches[0]?.round ?? 0}`;
}

function getLbRoundName(roundMatches, roundIndex, totalRounds) {
  if (roundIndex === totalRounds - 1) return "Losers Final";
  return `Losers Round ${roundMatches[0]?.round ?? 0}`;
}

function MatchCard({ match, onMatchClick, isAdmin }) {
  if (match.player1 === "BYE" && match.player2 === "BYE") return null;
  const isPlayed = match.isPlayed === true || match.winner != null;
  const p1Filled = match.player1 && match.player1 !== "TBD";
  const p2Filled = match.player2 && match.player2 !== "TBD";
  const hasBye = match.player1 === "BYE" || match.player2 === "BYE";
  const isFuture = !p1Filled || !p2Filled;
  const isClickable = isAdmin && !isPlayed && p1Filled && p2Filled && !hasBye;

  const showWinCond = !hasBye && p1Filled && p2Filled;

  return (
    <div
      className={`match ${isPlayed ? "completed" : ""} ${isFuture && !isPlayed ? "future" : ""} ${hasBye && isPlayed ? "bye-match" : ""} ${isClickable ? "clickable" : ""}`}
      onClick={() => isClickable && onMatchClick(match)}
    >
      {showWinCond && (
        <div className="match-header">
          <span className="match-win-condition">{match.winCondition?.toUpperCase() || "FT3"}</span>
        </div>
      )}
      <div className="match-row">
        <span className={match.winner === 0 ? "winner" : ""}>
          {match.player1 || "TBD"}
        </span>
        {isPlayed && !hasBye && (
          <span className={`score-badge ${match.winner === 0 ? "score-winner" : "score-loser"}`}>
            {match.scoreP1}
          </span>
        )}
      </div>
      <div className="match-row">
        <span className={match.winner === 1 ? "winner" : ""}>
          {match.player2 || "TBD"}
        </span>
        {isPlayed && !hasBye && (
          <span className={`score-badge ${match.winner === 1 ? "score-winner" : "score-loser"}`}>
            {match.scoreP2}
          </span>
        )}
      </div>
    </div>
  );
}

function GrandFinalMatch({ match, onMatchClick, isAdmin, label }) {
  const isPlayed = match.isPlayed === true || match.winner != null;
  const p1Filled = match.player1 && match.player1 !== "TBD";
  const p2Filled = match.player2 && match.player2 !== "TBD";
  const isClickable = isAdmin && !isPlayed && p1Filled && p2Filled;

  if (!p1Filled && !p2Filled && !isPlayed) {
    return (
      <div className="round">
        <h4>{label}</h4>
        <div className="round-matches">
          <div className="match future">
            <div className="match-row"><span>Awaiting finalists...</span></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="round">
      <h4>{label}</h4>
      <div className="round-matches">
        <div
          className={`match grand-final ${isPlayed ? "completed" : ""} ${isClickable ? "clickable" : ""}`}
          onClick={() => isClickable && onMatchClick(match)}
        >
          <div className="match-header">
            <span className="match-win-condition">{match.winCondition?.toUpperCase() || "FT3"}</span>
          </div>
          <div className="match-row">
            <span className={`${match.winner === 0 ? "winner" : ""} gf-winner-label`}>
              {match.player1 || "TBD"}
            </span>
            {isPlayed && (
              <span className={`score-badge ${match.winner === 0 ? "score-winner" : "score-loser"}`}>
                {match.scoreP1}
              </span>
            )}
          </div>
          <div className="match-row">
            <span className={`${match.winner === 1 ? "winner" : ""} gf-loser-label`}>
              {match.player2 || "TBD"}
            </span>
            {isPlayed && (
              <span className={`score-badge ${match.winner === 1 ? "score-winner" : "score-loser"}`}>
                {match.scoreP2}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BracketView({ matches, onMatchClick, isAdmin, bracketType }) {
  const isDouble = bracketType === "double";

  if (!matches || matches.length === 0) {
    return <p className="empty">No matches yet</p>;
  }

  if (!isDouble) {
    return <SingleBracketView matches={matches} onMatchClick={onMatchClick} isAdmin={isAdmin} />;
  }

  return <DoubleBracketView matches={matches} onMatchClick={onMatchClick} isAdmin={isAdmin} />;
}

function SingleBracketView({ matches, onMatchClick, isAdmin }) {
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
              {roundMatches.map((match) => (
                <MatchCard key={match.id} match={match} onMatchClick={onMatchClick} isAdmin={isAdmin} />
              ))}
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

function DoubleBracketView({ matches, onMatchClick, isAdmin }) {
  const wbMatches = matches.filter(m => m.bracket === 'winners');
  const lbMatches = matches.filter(m => m.bracket === 'losers');
  const gfMatches = matches.filter(m => m.bracket === 'grandFinal');

  const wbRounds = groupByRound(wbMatches);
  const lbRounds = groupByRound(lbMatches);

  const gfM0 = gfMatches.find(m => m.id === 'gf-m0');
  const gfM1 = gfMatches.find(m => m.id === 'gf-m1');
  const gfM1Active = gfM1 && gfM1.player1 !== "TBD" && gfM1.player2 !== "TBD";

  const getChampion = () => {
    if (gfM1Active && gfM1.winner != null) {
      return gfM1.winner === 0 ? gfM1.player1 : gfM1.player2;
    }
    if (gfM0 && gfM0.winner != null && gfM0.winner === 0) {
      return gfM0.player1;
    }
    if (gfM0 && gfM0.winner != null && gfM0.winner === 1 && gfM1 && gfM1.winner == null) {
      return null;
    }
    return null;
  };

  const champion = getChampion();

  return (
    <div className="bracket double-elimination">
      <h3>Bracket</h3>
      <div className="de-bracket-layout">
        <div className="de-section">
          <h4 className="de-section-title">Winners Bracket</h4>
          <div className="bracket-rounds">
            {wbRounds.map((roundMatches, roundIndex) => (
              <div key={`wb-${roundIndex}`} className="round">
                <h4>{getWbRoundName(roundMatches, roundIndex, wbRounds.length)}</h4>
                <div className="round-matches">
                  {roundMatches.map((match) => (
                    <MatchCard key={match.id} match={match} onMatchClick={onMatchClick} isAdmin={isAdmin} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="de-section">
          <h4 className="de-section-title">Losers Bracket</h4>
          <div className="bracket-rounds">
            {lbRounds.map((roundMatches, roundIndex) => (
              <div key={`lb-${roundIndex}`} className="round">
                <h4>{getLbRoundName(roundMatches, roundIndex, lbRounds.length)}</h4>
                <div className="round-matches">
                  {roundMatches.map((match) => (
                    <MatchCard key={match.id} match={match} onMatchClick={onMatchClick} isAdmin={isAdmin} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="de-section">
          <h4 className="de-section-title">Grand Final</h4>
          <div className="bracket-rounds gf-rounds">
            <GrandFinalMatch match={gfM0} onMatchClick={onMatchClick} isAdmin={isAdmin} label="Grand Final" />
            {(gfM1Active || gfM1?.winner != null) && (
              <GrandFinalMatch match={gfM1} onMatchClick={onMatchClick} isAdmin={isAdmin} label="Grand Final Reset" />
            )}
          </div>
        </div>
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
