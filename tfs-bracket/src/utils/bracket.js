export function generateBracket(participants, max) {
  const shuffled = [...participants].sort(() => Math.random() - 0.5);
  const players = shuffled.slice(0, max);
  const matches = [];

  const totalRounds = Math.ceil(Math.log2(max));
  const actualMax = Math.pow(2, totalRounds);

  for (let r = 1; r <= totalRounds; r++) {
    const matchCount = actualMax / Math.pow(2, r);
    
    for (let i = 0; i < matchCount; i++) {
      if (r === 1) {
        const p1 = players[i * 2];
        const p2 = players[i * 2 + 1];
        
        if (p2) {
          matches.push({
            id: `r${r}-m${i}`,
            round: r,
            matchIndex: i,
            player1: p1.name,
            player2: p2.name,
            winner: null,
            isPlayed: false,
            prevMatch1: null,
            prevMatch2: null,
          });
        } else {
          matches.push({
            id: `r${r}-m${i}`,
            round: r,
            matchIndex: i,
            player1: p1.name,
            player2: "BYE",
            winner: 0,
            isPlayed: true,
            prevMatch1: null,
            prevMatch2: null,
          });
        }
      } else {
        const prevMatchIndex = i * 2;
        matches.push({
          id: `r${r}-m${i}`,
          round: r,
          matchIndex: i,
          player1: "TBD",
          player2: "TBD",
          winner: null,
          isPlayed: false,
          prevMatch1: `r${r - 1}-m${prevMatchIndex}`,
          prevMatch2: `r${r - 1}-m${prevMatchIndex + 1}`,
        });
      }
    }
  }

  return matches;
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

export function advanceBracket(matches, matchIndex, winnerIndex) {
  const updatedMatches = matches.map(m => ({ ...m }));
  const match = updatedMatches[matchIndex];
  const currentRound = match.round;

  match.winner = winnerIndex;
  match.isPlayed = true;
  const winner = winnerIndex === 0 ? match.player1 : match.player2;

  updatedMatches.forEach(m => {
    if (m.round === currentRound + 1) {
      if (m.prevMatch1 === match.id) {
        m.player1 = winner;
      }
      if (m.prevMatch2 === match.id) {
        m.player2 = winner;
      }
    }
  });

  return updatedMatches;
}

export function resetBracket(participants, max) {
  return generateBracket(participants, max);
}