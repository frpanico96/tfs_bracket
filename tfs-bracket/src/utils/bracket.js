export function generateBracket(participants, max, winCondition) {
  return generateSingleEliminationBracket(participants, max, winCondition);
}

function generateSingleEliminationBracket(participants, max, winCondition) {
  const wc = winCondition || "ft3";
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
        winCondition: wc,
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
        winCondition: wc,
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

export function generateDoubleEliminationBracket(participants, max, winCondition) {
  const wc = winCondition || "ft3";
  const shuffled = [...participants].sort(() => Math.random() - 0.5);
  const numPlayers = Math.min(shuffled.length, max);
  const players = shuffled.slice(0, numPlayers);
  const matches = [];

  const bracketSize = Math.pow(2, Math.ceil(Math.log2(numPlayers)));
  const totalRounds = Math.log2(bracketSize);
  const base = Math.pow(2, Math.floor(Math.log2(numPlayers)));
  const prelimCount = numPlayers - base;
  const hasPrelims = prelimCount > 0;
  const firstRealWbRound = hasPrelims ? 2 : 1;

  // PHASE 1: Generate all Winners Bracket matches
  if (hasPrelims) {
    for (let i = 0; i < prelimCount; i++) {
      matches.push({
        id: `wb-r1-m${i}`,
        bracket: 'winners',
        round: 1,
        matchIndex: i,
        player1: players[i * 2].name,
        player2: players[i * 2 + 1].name,
        winner: null,
        isPlayed: false,
        prevMatch1: null,
        prevMatch2: null,
        loserGoesTo: null,
        winCondition: wc,
        scoreP1: 0,
        scoreP2: 0,
      });
    }
  }

  const byePlayers = players.slice(2 * prelimCount);
  const matchCountFirst = bracketSize / Math.pow(2, firstRealWbRound);
  const prelimPerMatch = Math.min(matchCountFirst, prelimCount);

  const firstSlots = [];
  const secondSlots = [];
  for (let i = 0; i < matchCountFirst; i++) {
    firstSlots.push(i < prelimPerMatch ? "prelim" : "bye");
  }
  let prelimUsed = prelimPerMatch;
  for (let i = 0; i < matchCountFirst; i++) {
    if (prelimUsed < prelimCount) {
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

  for (let r = firstRealWbRound; r <= totalRounds; r++) {
    const matchCount = bracketSize / Math.pow(2, r);
    for (let i = 0; i < matchCount; i++) {
      let p1 = "TBD";
      let p2 = "TBD";
      let prev1 = null;
      let prev2 = null;
      let isBye = false;

      if (r === firstRealWbRound) {
        const slot1 = firstSlots[i];
        if (slot1 === "prelim") {
          const prelimIdx = allSlots.slice(0, 2 * i).filter(s => s === "prelim").length;
          prev1 = `wb-r1-m${prelimIdx}`;
        } else {
          const byeIdx = allSlots.slice(0, 2 * i).filter(s => s === "bye").length;
          p1 = byePlayers[byeIdx]?.name || "BYE";
          if (!byePlayers[byeIdx]) isBye = true;
        }

        const slot2 = secondSlots[i];
        if (slot2 === "prelim") {
          const prelimIdx = allSlots.slice(0, 2 * i + 1).filter(s => s === "prelim").length;
          prev2 = `wb-r1-m${prelimIdx}`;
        } else {
          const byeIdx = allSlots.slice(0, 2 * i + 1).filter(s => s === "bye").length;
          p2 = byePlayers[byeIdx]?.name || "BYE";
          if (!byePlayers[byeIdx]) isBye = true;
        }

        if (p1 === "BYE" && p2 !== "TBD") { p1 = p2; p2 = "BYE"; isBye = true; }
        if (p1 === "TBD" && p2 === "BYE") { p1 = "BYE"; }
      } else {
        prev1 = `wb-r${r - 1}-m${i * 2}`;
        prev2 = `wb-r${r - 1}-m${i * 2 + 1}`;
      }

      matches.push({
        id: `wb-r${r}-m${i}`,
        bracket: 'winners',
        round: r,
        matchIndex: i,
        player1: p1,
        player2: p2,
        winner: isBye ? 0 : null,
        isPlayed: isBye,
        prevMatch1: prev1,
        prevMatch2: prev2,
        loserGoesTo: null,
        winCondition: wc,
        scoreP1: 0,
        scoreP2: 0,
      });
    }
  }

  // PHASE 2: Collect WB matches grouped by round (sorted)
  const wbByRound = {};
  for (const m of matches) {
    if (m.bracket === 'winners') {
      if (!wbByRound[m.round]) wbByRound[m.round] = [];
      wbByRound[m.round].push(m);
    }
  }
  const wbRounds = Object.keys(wbByRound).map(Number).sort((a, b) => a - b);

  // PHASE 3: Generate LB matches — structure-based
  let prevLbIds = [];
  let lbRoundNum = 1;
  let orphanedLbIds = [];

  function addLbMatch(prev1, prev2, wb1, wb2) {
    const mi = matches.filter(m => m.bracket === 'losers' && m.round === lbRoundNum).length;
    const m = {
      id: `lb-r${lbRoundNum}-m${mi}`,
      bracket: 'losers',
      round: lbRoundNum,
      matchIndex: mi,
      player1: "TBD",
      player2: "TBD",
      winner: null,
      isPlayed: false,
      prevMatch1: prev1,
      prevMatch2: prev2,
      prevMatchLoser1: wb1,
      prevMatchLoser2: wb2,
      winCondition: wc,
      scoreP1: 0,
      scoreP2: 0,
    };
    matches.push(m);
    return m;
  }

  function isByeMatch(m) {
    return m.isPlayed && (m.player1 === "BYE" || m.player2 === "BYE");
  }

  for (let ri = 0; ri < wbRounds.length; ri++) {
    const roundNum = wbRounds[ri];
    const wbMatchesThis = wbByRound[roundNum];
    const isFirst = ri === 0;
    const isLast = ri === wbRounds.length - 1;

    if (isFirst) {
      // First WB round: all matches have 2 real players (no BYEs in this round)
      // Pair-up round: WB losers from this round play each other
      for (let i = 0; i < Math.floor(wbMatchesThis.length / 2) * 2; i += 2) {
        const m = addLbMatch(null, null, wbMatchesThis[i].id, wbMatchesThis[i + 1].id);
        wbMatchesThis[i].loserGoesTo = m.id;
        wbMatchesThis[i + 1].loserGoesTo = m.id;
        prevLbIds.push(m.id);
      }
      // Odd count: the extra WB loser gets a BYE in LB
      if (wbMatchesThis.length % 2 !== 0) {
        const last = wbMatchesThis[wbMatchesThis.length - 1];
        const m = addLbMatch(null, null, null, last.id);
        last.loserGoesTo = m.id;
        m.player1 = "BYE";
        prevLbIds.push(m.id);
      }
      lbRoundNum++;
    } else {
      // Cross round: prev LB winners vs WB losers from this round
      const crossIds = [];
      let wbIdx = 0;
      let prevIdx = 0;

      while (prevIdx < prevLbIds.length && wbIdx < wbMatchesThis.length) {
        const wbM = wbMatchesThis[wbIdx];
        const hasRealLoser = wbM && !isByeMatch(wbM);
        if (hasRealLoser) {
          const m = addLbMatch(prevLbIds[prevIdx], null, null, wbM.id);
          wbM.loserGoesTo = m.id;
          crossIds.push(m.id);
          prevIdx++;
        } else {
          // BYE WB match: LB winner advances without playing
          orphanedLbIds.push(prevLbIds[prevIdx]);
          prevIdx++;
        }
        wbIdx++;
      }
      // Remaining LB winners (more LB winners than WB losers) wait for pair-up
      while (prevIdx < prevLbIds.length) {
        orphanedLbIds.push(prevLbIds[prevIdx]);
        prevIdx++;
      }
      // Remaining WB losers (more WB losers than LB winners) — get a BYE in LB
      while (wbIdx < wbMatchesThis.length) {
        const wbM = wbMatchesThis[wbIdx];
        if (wbM && !isByeMatch(wbM)) {
          const m = addLbMatch(null, null, null, wbM.id);
          wbM.loserGoesTo = m.id;
          m.player1 = "BYE";
          crossIds.push(m.id);
        }
        wbIdx++;
      }

      prevLbIds = crossIds;
      lbRoundNum++;

      // Pair-up round (skip after the last WB round)
      if (!isLast) {
        const allForPair = [...orphanedLbIds, ...prevLbIds];
        orphanedLbIds = [];
        const pairIds = [];
        for (let i = 0; i < Math.floor(allForPair.length / 2) * 2; i += 2) {
          const m = addLbMatch(allForPair[i], allForPair[i + 1], null, null);
          pairIds.push(m.id);
        }
        // Odd count: one LB winner gets a BYE to next round
        if (allForPair.length % 2 !== 0) {
          orphanedLbIds.push(allForPair[allForPair.length - 1]);
        }
        prevLbIds = pairIds;
        lbRoundNum++;
      }
    }
  }

  // Carry orphaned LB winners as the LB champion(s)
  if (orphanedLbIds.length > 0) {
    prevLbIds = [...prevLbIds, ...orphanedLbIds];
  }

  // Grand Final
  const lastWbMatch = wbByRound[wbRounds[wbRounds.length - 1]][0];
  const lbChampId = prevLbIds[0];

  matches.push({
    id: 'gf-m0',
    bracket: 'grandFinal',
    round: totalRounds + 1,
    matchIndex: 0,
    player1: "TBD",
    player2: "TBD",
    winner: null,
    isPlayed: false,
    prevMatch1: lastWbMatch.id,
    prevMatch2: lbChampId,
    prevMatchLoser1: null,
    prevMatchLoser2: null,
    winCondition: wc,
    scoreP1: 0,
    scoreP2: 0,
    isGrandFinalReset: false,
  });

  matches.push({
    id: 'gf-m1',
    bracket: 'grandFinal',
    round: totalRounds + 1,
    matchIndex: 1,
    player1: "TBD",
    player2: "TBD",
    winner: null,
    isPlayed: false,
    prevMatch1: null,
    prevMatch2: null,
    prevMatchLoser1: null,
    prevMatchLoser2: null,
    winCondition: wc,
    scoreP1: 0,
    scoreP2: 0,
    isGrandFinalReset: true,
  });

  propagateInitialByes(matches);
  return matches;
}

function propagateInitialByes(matches) {
  const wbMatches = matches.filter(m => m.bracket === 'winners');

  for (const match of wbMatches) {
    if (match.isPlayed && match.winner !== null) {
      let currentId = match.id;
      let currentWinner = match.winner === 0 ? match.player1 : match.player2;

      if (match.loserGoesTo) {
        const loser = match.winner === 0 ? match.player2 : match.player1;
        if (loser !== "BYE") {
          const lbMatch = matches.find(m => m.id === match.loserGoesTo);
          if (lbMatch) {
            if (lbMatch.prevMatch1 != null || lbMatch.prevMatch2 != null) {
              lbMatch.player2 = loser;
            } else {
              if (lbMatch.player1 === "TBD" || !lbMatch.player1) {
                lbMatch.player1 = loser;
              } else if (lbMatch.player2 === "TBD" || !lbMatch.player2) {
                lbMatch.player2 = loser;
              }
            }
            propagateLbBye(matches, lbMatch, null);
          }
        }
      }

      while (true) {
        const next = matches.find(m =>
          m.bracket === 'winners' &&
          (m.prevMatch1 === currentId || m.prevMatch2 === currentId)
        );
        if (!next) break;
        if (next.prevMatch1 === currentId) next.player1 = currentWinner;
        else next.player2 = currentWinner;

        const p1ok = next.player1 && next.player1 !== "TBD";
        const p2ok = next.player2 && next.player2 !== "TBD";
        if (!p1ok || !p2ok) break;

        const b1 = next.player1 === "BYE";
        const b2 = next.player2 === "BYE";
        if (!b1 && !b2) break;

        next.winner = b2 ? 0 : 1;
        next.isPlayed = true;
        currentWinner = next.winner === 0 ? next.player1 : next.player2;
        currentId = next.id;

        const nextLoser = next.winner === 0 ? next.player2 : next.player1;
        if (next.loserGoesTo && nextLoser !== "BYE") {
          const lbMatch2 = matches.find(m => m.id === next.loserGoesTo);
          if (lbMatch2) {
            if (lbMatch2.prevMatch1 != null || lbMatch2.prevMatch2 != null) {
              lbMatch2.player2 = nextLoser;
            } else {
              if (lbMatch2.player1 === "TBD" || !lbMatch2.player1) {
                lbMatch2.player1 = nextLoser;
              } else if (lbMatch2.player2 === "TBD" || !lbMatch2.player2) {
                lbMatch2.player2 = nextLoser;
              }
            }
            propagateLbBye(matches, lbMatch2, null);
          }
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

function propagateLbBye(matchesArray, lbMatch, skipMatchId) {
  const byeOn0 = lbMatch.player1 === "BYE";
  const byeOn1 = lbMatch.player2 === "BYE";
  if (!byeOn0 && !byeOn1) return;
  const p0 = lbMatch.player1;
  const p1 = lbMatch.player2;
  if (!p0 || !p1 || p0 === "TBD" || p1 === "TBD") return;

  lbMatch.winner = byeOn0 ? 1 : 0;
  lbMatch.isPlayed = true;
  let lbId = lbMatch.id;
  let lbWinner = lbMatch.winner === 0 ? p0 : p1;

  while (true) {
    const nextLb = matchesArray.find(m =>
      m.id !== (skipMatchId || lbId) &&
      (m.prevMatch1 === lbId || m.prevMatch2 === lbId) &&
      (m.bracket === 'losers' || (m.bracket === 'grandFinal' && !m.isGrandFinalReset))
    );
    if (!nextLb) break;
    if (nextLb.prevMatch1 === lbId) nextLb.player1 = lbWinner;
    else if (nextLb.prevMatch2 === lbId) nextLb.player2 = lbWinner;

    const f1 = nextLb.player1 && nextLb.player1 !== "TBD";
    const f2 = nextLb.player2 && nextLb.player2 !== "TBD";
    if (!f1 || !f2) break;

    const bb1 = nextLb.player1 === "BYE";
    const bb2 = nextLb.player2 === "BYE";
    if (!bb1 && !bb2) break;

    nextLb.winner = bb2 ? 0 : 1;
    nextLb.isPlayed = true;
    lbWinner = nextLb.winner === 0 ? nextLb.player1 : nextLb.player2;
    lbId = nextLb.id;
  }
}

export function advanceBracket(matches, matchIndex, winnerIndex, scores) {
  const updatedMatches = matches.map(m => ({ ...m }));
  const match = updatedMatches[matchIndex];

  match.winner = winnerIndex;
  match.isPlayed = true;
  if (scores) {
    match.scoreP1 = scores.p1Score;
    match.scoreP2 = scores.p2Score;
  }

  let winner = winnerIndex === 0 ? match.player1 : match.player2;
  const loser = winnerIndex === 0 ? match.player2 : match.player1;

  if (match.bracket === 'winners' && match.loserGoesTo && loser !== "BYE") {
    const loserMatch = updatedMatches.find(m => m.id === match.loserGoesTo);
    if (loserMatch) {
      if (loserMatch.prevMatch1 != null || loserMatch.prevMatch2 != null) {
        loserMatch.player2 = loser;
      } else {
        if (loserMatch.player1 === "TBD" || !loserMatch.player1) {
          loserMatch.player1 = loser;
        } else if (loserMatch.player2 === "TBD" || !loserMatch.player2) {
          loserMatch.player2 = loser;
        }
      }
      propagateLbBye(updatedMatches, loserMatch, match.id);
    }
  }

  if (match.bracket === 'grandFinal' && match.id === 'gf-m0') {
    if (winnerIndex === 1) {
      const resetMatch = updatedMatches.find(m => m.id === 'gf-m1');
      if (resetMatch) {
        resetMatch.player1 = match.player1;
        resetMatch.player2 = match.player2;
        resetMatch.winner = null;
        resetMatch.isPlayed = false;
        resetMatch.scoreP1 = 0;
        resetMatch.scoreP2 = 0;
      }
    }
    return updatedMatches;
  }

  if (match.bracket === 'grandFinal' && match.id === 'gf-m1') {
    return updatedMatches;
  }

  let currentMatchId = match.id;
  let currentBracket = match.bracket;

  while (true) {
    let nextMatch;

    if (currentBracket === 'losers') {
      nextMatch = updatedMatches.find(m =>
        m.id !== match.id &&
        (m.prevMatch1 === currentMatchId || m.prevMatch2 === currentMatchId) &&
        (m.bracket === 'losers' || (m.bracket === 'grandFinal' && !m.isGrandFinalReset))
      );
    } else {
      nextMatch = updatedMatches.find(m =>
        (!m.bracket || m.bracket === 'winners' || (m.bracket === 'grandFinal' && !m.isGrandFinalReset)) &&
        (m.prevMatch1 === currentMatchId || m.prevMatch2 === currentMatchId)
      );
    }

    if (!nextMatch) break;

    if (nextMatch.prevMatch1 === currentMatchId) {
      nextMatch.player1 = winner;
    } else if (nextMatch.prevMatch2 === currentMatchId) {
      nextMatch.player2 = winner;
    }

    const p1Filled = nextMatch.player1 && nextMatch.player1 !== "TBD";
    const p2Filled = nextMatch.player2 && nextMatch.player2 !== "TBD";

    if (p1Filled && p2Filled) {
      const bye1 = nextMatch.player1 === "BYE";
      const bye2 = nextMatch.player2 === "BYE";
      if (!bye1 && !bye2) break;

      nextMatch.winner = bye2 ? 0 : 1;
      nextMatch.isPlayed = true;
      winner = nextMatch.winner === 0 ? nextMatch.player1 : nextMatch.player2;
      currentMatchId = nextMatch.id;
      currentBracket = nextMatch.bracket;
    } else {
      break;
    }
  }

  return updatedMatches;
}

export function resetBracket(participants, max, type = 'single', winCondition) {
  if (type === 'double') return generateDoubleEliminationBracket(participants, max, winCondition);
  return generateBracket(participants, max, winCondition);
}

export function isDoubleBracket(matches) {
  return matches && matches.length > 0 && matches[0].bracket === 'winners';
}

export function swapPlayers(matches, matchId1, slot1, matchId2, slot2) {
  const updated = matches.map(m => ({ ...m }));
  const m1 = updated.find(m => m.id === matchId1);
  const m2 = updated.find(m => m.id === matchId2);
  if (!m1 || !m2) return matches;

  const playerKey1 = slot1 === 0 ? "player1" : "player2";
  const playerKey2 = slot2 === 0 ? "player1" : "player2";

  const p1 = m1[playerKey1];
  const p2 = m2[playerKey2];

  if (!p1 || !p2 || p1 === "TBD" || p2 === "TBD" || p1 === "BYE" || p2 === "BYE") return matches;

  m1[playerKey1] = p2;
  m2[playerKey2] = p1;

  return updated;
}

export function getMatchRoundName(match, allMatches, bracketType) {
  if (!allMatches || allMatches.length === 0) {
    return `Round ${match.round}`;
  }

  if (bracketType === 'double') {
    if (match.bracket === 'grandFinal') {
      return match.id === 'gf-m1' ? 'Grand Final Reset' : 'Grand Final';
    }
    const sameBracket = allMatches.filter(m => m.bracket === match.bracket);
    const rounds = [...new Set(sameBracket.map(m => m.round))].sort((a, b) => a - b);
    const roundIndex = rounds.indexOf(match.round);
    const totalRounds = rounds.length;
    const count = sameBracket.filter(m => m.round === match.round).length;

    if (match.bracket === 'winners') {
      if (roundIndex === 0 && count < 4) return "Preliminary";
      if (roundIndex === totalRounds - 1) return "Winners Final";
      if (count === 2) return "Semifinals";
      if (count === 4) return "Quarterfinals";
      if (count === 8) return "Round of 16";
      return `WB Round ${match.round}`;
    } else {
      if (roundIndex === totalRounds - 1) return "Losers Final";
      return `Losers Round ${match.round}`;
    }
  }

  const rounds = [...new Set(allMatches.map(m => m.round))].sort((a, b) => a - b);
  const roundIndex = rounds.indexOf(match.round);
  const totalRounds = rounds.length;
  const isLastRound = roundIndex === totalRounds - 1;
  const isFirstRound = roundIndex === 0;
  const hasPrelims = rounds.length > 1 &&
    allMatches.filter(m => m.round === rounds[0]).length <
    allMatches.filter(m => m.round === rounds[1]).length;
  const count = allMatches.filter(m => m.round === match.round).length;

  if (isFirstRound && hasPrelims) return "Preliminary";
  if (isLastRound) return "Finals";
  if (count === 2) return "Semifinals";
  if (count === 4) return "Quarterfinals";
  if (count === 8) return "Round of 16";
  return `Round ${match.round}`;
}

function getOrdinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function realPlayer(p) {
  return p && p !== "TBD" && p !== "BYE";
}

function addRankingEntry(result, rank, label, players, points) {
  if (!players || players.length === 0) return;
  const endRank = rank + players.length - 1;
  result.push({
    rank,
    displayRank: players.length === 1 ? `${rank}${getOrdinal(rank)}` : `${rank}${getOrdinal(rank)}-${endRank}${getOrdinal(endRank)}`,
    label,
    players,
    points,
  });
}

function computeSingleElimRankings(allMatches, rankScores) {
  const rounds = groupByRound(allMatches);
  if (rounds.length === 0) return [];

  const finalRound = rounds[rounds.length - 1];
  const finalMatch = finalRound?.[0];
  if (!finalMatch || finalMatch.winner == null) return [];

  const champ = finalMatch.winner === 0 ? finalMatch.player1 : finalMatch.player2;
  const runnerUp = finalMatch.winner === 0 ? finalMatch.player2 : finalMatch.player1;
  const result = [];

  const pts = (rank) => (rankScores && rankScores[rank - 1] != null ? rankScores[rank - 1] : 0);

  if (realPlayer(champ)) addRankingEntry(result, 1, "Champion", [champ], pts(1));
  if (realPlayer(runnerUp)) addRankingEntry(result, 2, "Runner-up", [runnerUp], pts(2));

  const rankMap = [
    { roundFromEnd: 2, rank: 3, label: "Semifinalists", pts: () => pts(3) },
    { roundFromEnd: 3, rank: 5, label: "Quarterfinalists", pts: () => pts(5) },
    { roundFromEnd: 4, rank: 9, label: "Round of 16", pts: () => pts(9) },
    { roundFromEnd: 5, rank: 17, label: "Round of 32", pts: () => pts(17) },
  ];

  for (const tmpl of rankMap) {
    const idx = rounds.length - tmpl.roundFromEnd;
    if (idx < 0) break;
    const losers = [];
    for (const m of rounds[idx]) {
      if (m.winner == null || m.player1 === "BYE" || m.player2 === "BYE") continue;
      const loser = m.winner === 0 ? m.player2 : m.player1;
      if (realPlayer(loser)) losers.push(loser);
    }
    if (losers.length > 0) {
      addRankingEntry(result, tmpl.rank, losers.length === 2 && tmpl.label === "Semifinalists" ? "Semifinalists" : tmpl.label, losers, tmpl.pts());
    }
  }

  return result;
}

function computeDoubleElimRankings(allMatches, rankScores) {
  const gfM0 = allMatches.find(m => m.id === 'gf-m0');
  const gfM1 = allMatches.find(m => m.id === 'gf-m1');

  let lastGf;
  if (gfM1 && gfM1.winner != null) lastGf = gfM1;
  else if (gfM0 && gfM0.winner != null) lastGf = gfM0;
  else return [];

  const champ = lastGf.winner === 0 ? lastGf.player1 : lastGf.player2;
  const runnerUp = lastGf.winner === 0 ? lastGf.player2 : lastGf.player1;
  const result = [];

  const pts = (rank) => (rankScores && rankScores[rank - 1] != null ? rankScores[rank - 1] : 0);

  if (realPlayer(champ)) addRankingEntry(result, 1, "Champion", [champ], pts(1));
  if (realPlayer(runnerUp)) addRankingEntry(result, 2, "Runner-up", [runnerUp], pts(2));

  const wbMatches = allMatches.filter(m => m.bracket === 'winners');
  const lbMatches = allMatches.filter(m => m.bracket === 'losers');
  const wbRounds = groupByRound(wbMatches);
  const lbRounds = groupByRound(lbMatches);

  const wbFinal = wbRounds[wbRounds.length - 1]?.[0];
  const lbFinal = lbRounds[lbRounds.length - 1]?.[0];

  let wbFinalLoser = null;
  if (wbFinal && wbFinal.winner != null) {
    wbFinalLoser = wbFinal.winner === 0 ? wbFinal.player2 : wbFinal.player1;
    if (!realPlayer(wbFinalLoser)) wbFinalLoser = null;
  }

  const wbFinalLoserInGf = wbFinalLoser && gfM0 &&
    (gfM0.player1 === wbFinalLoser || gfM0.player2 === wbFinalLoser);

  let third = null;
  if (wbFinalLoser && !wbFinalLoserInGf) {
    third = wbFinalLoser;
  } else if (lbFinal && lbFinal.winner != null) {
    third = lbFinal.winner === 0 ? lbFinal.player2 : lbFinal.player1;
    if (!realPlayer(third)) third = null;
  }

  if (third && third !== champ && third !== runnerUp) {
    addRankingEntry(result, 3, "Third Place", [third], pts(3));
  }

  let fourth = null;
  if (third === wbFinalLoser) {
    if (lbFinal && lbFinal.winner != null) {
      fourth = lbFinal.winner === 0 ? lbFinal.player2 : lbFinal.player1;
      if (!realPlayer(fourth)) fourth = null;
    }
  } else {
    fourth = wbFinalLoser;
  }

  if (fourth && fourth !== champ && fourth !== runnerUp && fourth !== third) {
    addRankingEntry(result, 4, "Fourth Place", [fourth], pts(4));
  }

  const ranked = new Set([champ, runnerUp, third, fourth].filter(Boolean));

  const allPlayers = new Set();
  for (const m of allMatches) {
    for (const p of [m.player1, m.player2]) {
      if (realPlayer(p)) allPlayers.add(p);
    }
  }

  const remaining = [];
  for (const player of allPlayers) {
    if (ranked.has(player)) continue;
    let lastLoss = null;
    for (const m of allMatches) {
      if (m.winner == null) continue;
      const loser = m.winner === 0 ? m.player2 : m.player1;
      if (loser === player && (!lastLoss || m.round > lastLoss.round)) {
        lastLoss = m;
      }
    }
    if (lastLoss) remaining.push({ player, loss: lastLoss });
  }

  const bracketOrder = { grandFinal: 0, winners: 1, losers: 2 };
  remaining.sort((a, b) => {
    const rd = (b.loss.round || 0) - (a.loss.round || 0);
    if (rd !== 0) return rd;
    return (bracketOrder[a.loss.bracket] ?? 1) - (bracketOrder[b.loss.bracket] ?? 1);
  });

  let pos = result.length > 0 ? result[result.length - 1].rank + result[result.length - 1].players.length : 1;
  let i = 0;
  while (i < remaining.length) {
    const group = [remaining[i]];
    const ref = group[0].loss;
    while (i + 1 < remaining.length) {
      const nxt = remaining[i + 1];
      if (nxt.loss.round === ref.round && nxt.loss.bracket === ref.bracket) {
        group.push(nxt);
        i++;
      } else {
        break;
      }
    }
    const players = group.map(p => p.player);
    const label = players.length === 1 ? ` ${pos}${getOrdinal(pos)} Place` : ` ${pos}${getOrdinal(pos)}-${pos + players.length - 1}${getOrdinal(pos + players.length - 1)}`;
    addRankingEntry(result, pos, label, players, pts(pos));
    pos += players.length;
    i++;
  }

  return result;
}

export function computeRankings(matches, bracketType, rankScores, participants) {
  if (!matches || matches.length === 0) return [];

  const hasPlayedMatches = matches.some(m => m.winner != null && m.isPlayed);
  if (!hasPlayedMatches) return [];

  const nameToId = {};
  if (participants) {
    for (const p of participants) {
      nameToId[p.name] = p.id;
    }
  }

  let rankings;
  if (bracketType === 'double') {
    rankings = computeDoubleElimRankings(matches, rankScores);
  } else {
    rankings = computeSingleElimRankings(matches, rankScores);
  }

  if (participants) {
    for (const entry of rankings) {
      entry.players = entry.players.map(name => ({ name, id: nameToId[name] || null }));
    }
  }

  return rankings;
}
