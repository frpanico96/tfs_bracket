export function generateBracket(participants, max) {
  const shuffled = [...participants].sort(() => Math.random() - 0.5);
  const numPlayers = Math.min(shuffled.length, max);
  const players = shuffled.slice(0, numPlayers);
  const matches = [];

  const bracketSize = Math.pow(2, Math.ceil(Math.log2(numPlayers)));
  const totalRounds = Math.log2(bracketSize);
  const base = Math.pow(2, Math.floor(Math.log2(numPlayers)));
  const prelimMatches = numPlayers - base;
  const hasPrelims = prelimMatches > 0;

  if (hasPrelims) {
    for (let i = 0; i < prelimMatches; i++) {
      matches.push({
        id: `r1-m${i}`,
        round: 1,
        matchIndex: i,
        player1: players[i * 2].name,
        player2: players[i * 2 + 1].name,
        winner: null,
        isPlayed: false,
        prevMatch1: null,
        prevMatch2: null,
        winCondition: "ft3",
      });
    }
  }

  const firstRealRound = hasPrelims ? 2 : 1;
  const byePlayers = players.slice(2 * prelimMatches);
  const matchCountFirst = bracketSize / Math.pow(2, firstRealRound);

  const firstSlots = [];
  const secondSlots = [];
  const prelimPerFirst = Math.min(matchCountFirst, prelimMatches);

  for (let i = 0; i < matchCountFirst; i++) {
    firstSlots.push(i < prelimPerFirst ? "prelim" : "bye");
  }

  let prelimUsed = prelimPerFirst;
  for (let i = 0; i < matchCountFirst; i++) {
    if (prelimUsed < prelimMatches) {
      secondSlots.push("prelim");
      prelimUsed++;
    } else {
      secondSlots.push("bye");
    }
  }

  const allSlots = [];
  for (let j = 0; j < matchCountFirst; j++) {
    allSlots.push(firstSlots[j], secondSlots[j]);
  }

  for (let r = firstRealRound; r <= totalRounds; r++) {
    const matchCount = bracketSize / Math.pow(2, r);
    for (let i = 0; i < matchCount; i++) {
      let p1 = "TBD";
      let p2 = "TBD";
      let prev1 = null;
      let prev2 = null;
      let isBye = false;

      if (r === firstRealRound) {
        const slot1 = firstSlots[i];
        if (slot1 === "prelim") {
          const prelimIdx = allSlots.slice(0, 2 * i).filter(s => s === "prelim").length;
          prev1 = `r1-m${prelimIdx}`;
        } else {
          const byeIdx = allSlots.slice(0, 2 * i).filter(s => s === "bye").length;
          p1 = byePlayers[byeIdx]?.name || "BYE";
          if (!byePlayers[byeIdx]) isBye = true;
        }

        const slot2 = secondSlots[i];
        if (slot2 === "prelim") {
          const prelimIdx = allSlots.slice(0, 2 * i + 1).filter(s => s === "prelim").length;
          prev2 = `r1-m${prelimIdx}`;
        } else {
          const byeIdx = allSlots.slice(0, 2 * i + 1).filter(s => s === "bye").length;
          p2 = byePlayers[byeIdx]?.name || "BYE";
          if (!byePlayers[byeIdx]) isBye = true;
        }

        if (p1 === "BYE" && p2 !== "TBD") { p1 = p2; p2 = "BYE"; isBye = true; }
        if (p1 === "TBD" && p2 === "BYE") { p1 = "BYE"; }
      } else {
        const prevMatchIndex = i * 2;
        prev1 = `r${r - 1}-m${prevMatchIndex}`;
        prev2 = `r${r - 1}-m${prevMatchIndex + 1}`;
      }

      matches.push({
        id: `r${r}-m${i}`,
        round: r,
        matchIndex: i,
        player1: p1,
        player2: p2,
        winner: isBye ? 0 : null,
        isPlayed: isBye,
        prevMatch1: prev1,
        prevMatch2: prev2,
        winCondition: "ft3",
      });
    }
  }

  propagateByeWinners(matches);

  return matches;
}

function propagateByeWinners(matches) {
  for (const match of matches) {
    if (match.isPlayed && match.winner !== null && match.winner !== undefined) {
      let winner = match.winner === 0 ? match.player1 : match.player2;
      let currentRound = match.round;
      let matchId = match.id;

      while (true) {
        const nextMatch = matches.find(m =>
          m.round === currentRound + 1 &&
          (m.prevMatch1 === matchId || m.prevMatch2 === matchId)
        );

        if (!nextMatch) break;

        if (nextMatch.prevMatch1 === matchId) {
          nextMatch.player1 = winner;
        } else {
          nextMatch.player2 = winner;
        }

        const hasTbd = nextMatch.player1 === "TBD" || nextMatch.player2 === "TBD";
        if (!hasTbd) {
          if (nextMatch.player1 !== "BYE" && nextMatch.player2 !== "BYE") break;

          nextMatch.winner = nextMatch.player2 === "BYE" ? 0 : 1;
          nextMatch.isPlayed = true;
          winner = nextMatch.winner === 0 ? nextMatch.player1 : nextMatch.player2;
          matchId = nextMatch.id;
          currentRound = nextMatch.round;
        } else {
          break;
        }
      }
    }
  }
}

export function groupByRound(matches) {
  const rounds = [];
  matches.forEach((m) => {
    if (!rounds[m.round - 1]) rounds[m.round - 1] = [];
    rounds[m.round - 1].push(m);
  });
  return rounds;
}

export function parseFirestoreDate(dateValue) {
  if (!dateValue) return null;
  if (dateValue.toDate && typeof dateValue.toDate === "function") {
    return dateValue.toDate();
  }
  if (dateValue instanceof Date) {
    return dateValue;
  }
  return new Date(dateValue);
}

export function advanceBracket(matches, matchIndex, winnerIndex, scores) {
  const updatedMatches = matches.map(m => ({ ...m }));
  const match = updatedMatches[matchIndex];
  const currentRound = match.round;

  match.winner = winnerIndex;
  match.isPlayed = true;
  if (scores) {
    match.scoreP1 = scores.p1Score;
    match.scoreP2 = scores.p2Score;
  }
  let winner = winnerIndex === 0 ? match.player1 : match.player2;
  let matchId = match.id;
  let round = currentRound;

  while (true) {
    const nextMatch = updatedMatches.find(m =>
      m.round === round + 1 &&
      (m.prevMatch1 === matchId || m.prevMatch2 === matchId)
    );

    if (!nextMatch) break;

    if (nextMatch.prevMatch1 === matchId) {
      nextMatch.player1 = winner;
    } else {
      nextMatch.player2 = winner;
    }

    const hasTbd = nextMatch.player1 === "TBD" || nextMatch.player2 === "TBD";
    if (!hasTbd) {
      if (nextMatch.player1 !== "BYE" && nextMatch.player2 !== "BYE") break;

      nextMatch.winner = nextMatch.player2 === "BYE" ? 0 : 1;
      nextMatch.isPlayed = true;
      winner = nextMatch.winner === 0 ? nextMatch.player1 : nextMatch.player2;
      matchId = nextMatch.id;
      round = nextMatch.round;
    } else {
      break;
    }
  }

  return updatedMatches;
}

export function resetBracket(participants, max) {
  return generateBracket(participants, max);
}