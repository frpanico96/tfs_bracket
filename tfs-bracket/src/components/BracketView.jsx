import { useState } from "react";
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

function MatchCard({ match, onMatchClick, isAdmin, onMatchWinConditionClick, canSwap, swapSelected, onPlayerClick }) {
  if (match.player1 === "BYE" && match.player2 === "BYE") return null;
  const isPlayed = match.isPlayed === true || match.winner != null;
  const p1Filled = match.player1 && match.player1 !== "TBD";
  const p2Filled = match.player2 && match.player2 !== "TBD";
  const hasBye = match.player1 === "BYE" || match.player2 === "BYE";
  const isFuture = !p1Filled || !p2Filled;
  const isClickable = isAdmin && !isPlayed && p1Filled && p2Filled && !hasBye;

  const showWinCond = !hasBye && p1Filled && p2Filled;

  const isSelected1 = swapSelected?.matchId === match.id && swapSelected?.slot === 0;
  const isSelected2 = swapSelected?.matchId === match.id && swapSelected?.slot === 1;

  return (
    <div
      className={`match ${isPlayed ? "completed" : ""} ${isFuture && !isPlayed ? "future" : ""} ${hasBye && isPlayed ? "bye-match" : ""} ${isClickable ? "clickable" : ""}`}
      onClick={() => isClickable && onMatchClick(match)}
    >
      {showWinCond && (
        <div className="match-header">
          <span
            className={`match-win-condition${isAdmin ? " clickable-cond" : ""}`}
            onClick={(e) => { e.stopPropagation(); if (isAdmin) onMatchWinConditionClick?.(match); }}
          >
            {match.winCondition?.toUpperCase() || "FT3"}
          </span>
        </div>
      )}
      <div className="match-row">
        <span
          className={`${match.winner === 0 ? "winner" : ""} ${canSwap ? "swap-player" : ""} ${isSelected1 ? "swap-selected" : ""}`}
          onClick={(e) => { e.stopPropagation(); if (canSwap) onPlayerClick(match.id, 0); }}
        >
          {match.player1 || "TBD"}
        </span>
        {isPlayed && !hasBye && match.dq !== 1 && (
          <span className={`score-badge ${match.winner === 0 ? "score-winner" : "score-loser"} ${match.dq === 0 ? "dq-badge" : ""}`}>
            {match.dq === 0 ? "DQ" : match.scoreP1}
          </span>
        )}
      </div>
      <div className="match-row">
        <span
          className={`${match.winner === 1 ? "winner" : ""} ${canSwap ? "swap-player" : ""} ${isSelected2 ? "swap-selected" : ""}`}
          onClick={(e) => { e.stopPropagation(); if (canSwap) onPlayerClick(match.id, 1); }}
        >
          {match.player2 || "TBD"}
        </span>
        {isPlayed && !hasBye && match.dq !== 0 && (
          <span className={`score-badge ${match.winner === 1 ? "score-winner" : "score-loser"} ${match.dq === 1 ? "dq-badge" : ""}`}>
            {match.dq === 1 ? "DQ" : match.scoreP2}
          </span>
        )}
      </div>
    </div>
  );
}

function GrandFinalMatch({ match, onMatchClick, isAdmin, label, onMatchWinConditionClick, canSwap, swapSelected, onPlayerClick }) {
  const isPlayed = match.isPlayed === true || match.winner != null;
  const p1Filled = match.player1 && match.player1 !== "TBD";
  const p2Filled = match.player2 && match.player2 !== "TBD";
  const isClickable = isAdmin && !isPlayed && p1Filled && p2Filled;
  const isSelected1 = swapSelected?.matchId === match.id && swapSelected?.slot === 0;
  const isSelected2 = swapSelected?.matchId === match.id && swapSelected?.slot === 1;

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
            <span
              className={`match-win-condition${isAdmin ? " clickable-cond" : ""}`}
              onClick={(e) => { e.stopPropagation(); if (isAdmin) onMatchWinConditionClick?.(match); }}
            >
              {match.winCondition?.toUpperCase() || "FT3"}
            </span>
          </div>
          <div className="match-row">
            <span className={`${match.winner === 0 ? "winner" : ""} gf-winner-label ${canSwap ? "swap-player" : ""} ${isSelected1 ? "swap-selected" : ""}`}
              onClick={(e) => { e.stopPropagation(); if (canSwap) onPlayerClick(match.id, 0); }}
            >
              {match.player1 || "TBD"}
            </span>
            {isPlayed && match.dq !== 1 && (
              <span className={`score-badge ${match.winner === 0 ? "score-winner" : "score-loser"} ${match.dq === 0 ? "dq-badge" : ""}`}>
                {match.dq === 0 ? "DQ" : match.scoreP1}
              </span>
            )}
          </div>
          <div className="match-row">
            <span className={`${match.winner === 1 ? "winner" : ""} gf-loser-label ${canSwap ? "swap-player" : ""} ${isSelected2 ? "swap-selected" : ""}`}
              onClick={(e) => { e.stopPropagation(); if (canSwap) onPlayerClick(match.id, 1); }}
            >
              {match.player2 || "TBD"}
            </span>
            {isPlayed && match.dq !== 0 && (
              <span className={`score-badge ${match.winner === 1 ? "score-winner" : "score-loser"} ${match.dq === 1 ? "dq-badge" : ""}`}>
                {match.dq === 1 ? "DQ" : match.scoreP2}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BracketView({ matches, onMatchClick, isAdmin, bracketType, onMatchWinConditionClick, canSwap, onSwapPlayers }) {
  const isDouble = bracketType === "double";
  const [swapSelected, setSwapSelected] = useState(null);

  const handlePlayerClick = (matchId, slot) => {
    if (!swapSelected) {
      const match = matches.find(m => m.id === matchId);
      const player = slot === 0 ? match?.player1 : match?.player2;
      if (!player || player === "TBD" || player === "BYE") return;
      setSwapSelected({ matchId, slot });
    } else {
      if (swapSelected.matchId === matchId && swapSelected.slot === slot) {
        setSwapSelected(null);
        return;
      }
      const match2 = matches.find(m => m.id === matchId);
      const player2 = slot === 0 ? match2?.player1 : match2?.player2;
      if (!player2 || player2 === "TBD" || player2 === "BYE") {
        setSwapSelected(null);
        return;
      }
      onSwapPlayers(swapSelected.matchId, swapSelected.slot, matchId, slot);
      setSwapSelected(null);
    }
  };

  if (!matches || matches.length === 0) {
    return <p className="empty"><span aria-hidden="true" className="empty-icon">🏟️</span><span>No matches yet</span></p>;
  }

  if (!isDouble) {
    return (
      <SingleBracketView
        matches={matches}
        onMatchClick={onMatchClick}
        isAdmin={isAdmin}
        onMatchWinConditionClick={onMatchWinConditionClick}
        canSwap={canSwap}
        swapSelected={swapSelected}
        onPlayerClick={handlePlayerClick}
      />
    );
  }

  return (
    <DoubleBracketView
      matches={matches}
      onMatchClick={onMatchClick}
      isAdmin={isAdmin}
      onMatchWinConditionClick={onMatchWinConditionClick}
      canSwap={canSwap}
      swapSelected={swapSelected}
      onPlayerClick={handlePlayerClick}
    />
  );
}

function SingleBracketView({ matches, onMatchClick, isAdmin, onMatchWinConditionClick, canSwap, swapSelected, onPlayerClick }) {
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
                <MatchCard key={match.id} match={match} onMatchClick={onMatchClick} isAdmin={isAdmin} onMatchWinConditionClick={onMatchWinConditionClick} canSwap={canSwap} swapSelected={swapSelected} onPlayerClick={onPlayerClick} />
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

function DoubleBracketView({ matches, onMatchClick, isAdmin, onMatchWinConditionClick, canSwap, swapSelected, onPlayerClick }) {
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
                    <MatchCard key={match.id} match={match} onMatchClick={onMatchClick} isAdmin={isAdmin} onMatchWinConditionClick={onMatchWinConditionClick} canSwap={canSwap} swapSelected={swapSelected} onPlayerClick={onPlayerClick} />
                  ))}
                </div>
              </div>
            ))}
            <GrandFinalMatch match={gfM0} onMatchClick={onMatchClick} isAdmin={isAdmin} label="Grand Final" onMatchWinConditionClick={onMatchWinConditionClick} canSwap={canSwap} swapSelected={swapSelected} onPlayerClick={onPlayerClick} />
            {(gfM1Active || gfM1?.winner != null) && (
              <GrandFinalMatch match={gfM1} onMatchClick={onMatchClick} isAdmin={isAdmin} label="Grand Final Reset" onMatchWinConditionClick={onMatchWinConditionClick} canSwap={canSwap} swapSelected={swapSelected} onPlayerClick={onPlayerClick} />
            )}
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
                    <MatchCard key={match.id} match={match} onMatchClick={onMatchClick} isAdmin={isAdmin} onMatchWinConditionClick={onMatchWinConditionClick} canSwap={canSwap} swapSelected={swapSelected} onPlayerClick={onPlayerClick} />
                  ))}
                </div>
              </div>
            ))}
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
