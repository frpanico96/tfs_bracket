// ── Constants ───────────────────────────────────────────────

export const TOURNAMENT_TYPE_FC = "final_championship";
export const TIERS = ["regular", "winner", "champion"];
export const TIER_LABELS = { regular: "Regular", winner: "Winner", champion: "Champion" };
// Rounds a player must win to take a single set (one game title).
export const SET_FT = 3;
// Largest pick/ban template (FT5) needs 10 manual steps + 1 decider.
export const MIN_POOL_SIZE = 11;

// Phase of the bracket -> match format (first to N sets).
export const PHASE_FORMAT = { general: "ft2", semi: "ft3", final: "ft5" };

// [action, acting player index (0 = player1, 1 = player2)]. The decider is automatic.
const SEQUENCES = {
  ft2: [
    ["ban", 0], ["ban", 1], ["pick", 0], ["pick", 1], ["ban", 0], ["ban", 1],
  ],
  ft3: [
    ["ban", 0], ["ban", 1], ["pick", 0], ["pick", 1], ["ban", 0], ["ban", 1],
    ["pick", 0], ["pick", 1],
  ],
  ft5: [
    ["pick", 0], ["pick", 1], ["ban", 0], ["ban", 1], ["pick", 0], ["pick", 1],
    ["pick", 0], ["pick", 1], ["pick", 0], ["pick", 1],
  ],
};

export function isFinalChampionship(tournament) {
  return tournament?.tournamentType === TOURNAMENT_TYPE_FC;
}

export function getTier(participant) {
  return TIERS.includes(participant?.tier) ? participant.tier : "regular";
}

export function getSetTarget(winCondition) {
  const n = parseInt(String(winCondition || "ft2").replace("ft", ""), 10);
  return Number.isFinite(n) && n > 0 ? n : 2;
}

// ── Pick / ban engine ───────────────────────────────────────

export function getSequence(winCondition) {
  const seq = SEQUENCES[winCondition];
  if (!seq) throw new Error(`No pick/ban template for ${winCondition}`);
  return seq;
}

export function minPoolSize(winCondition) {
  return getSequence(winCondition).length + 1;
}

export function initPickBan(winCondition, gamePool) {
  const seq = getSequence(winCondition);
  const pool = [];
  const seen = new Set();
  for (const g of gamePool || []) {
    if (!g || g.id == null || seen.has(g.id)) continue;
    seen.add(g.id);
    pool.push({ id: g.id, name: g.name });
  }
  if (pool.length < seq.length + 1) {
    throw new Error(`Game pool needs at least ${seq.length + 1} games for ${winCondition.toUpperCase()}`);
  }
  return { template: winCondition, pool, steps: [] };
}

export function getRemainingGames(pickBan) {
  const used = new Set(pickBan.steps.map((s) => s.game.id));
  return pickBan.pool.filter((g) => !used.has(g.id));
}

export function isPickBanComplete(pickBan) {
  const last = pickBan?.steps?.[pickBan.steps.length - 1];
  return !!last && last.action === "decider";
}

// Next manual action, or null when the sequence is finished (decider already drawn).
export function getNextAction(pickBan) {
  if (isPickBanComplete(pickBan)) return null;
  const seq = getSequence(pickBan.template);
  const [action, player] = seq[pickBan.steps.length];
  return { action, player, number: pickBan.steps.length + 1, total: seq.length };
}

export function applyPickBanStep(pickBan, gameId, rng = Math.random) {
  const next = getNextAction(pickBan);
  if (!next) throw new Error("Pick/ban is already complete");
  const remaining = getRemainingGames(pickBan);
  const game = remaining.find((g) => g.id === gameId);
  if (!game) throw new Error("Game is not available in the pool");

  const steps = [...pickBan.steps, { action: next.action, player: next.player, game }];
  const seq = getSequence(pickBan.template);

  if (steps.length === seq.length) {
    const left = pickBan.pool.filter((g) => !steps.some((s) => s.game.id === g.id));
    const idx = Math.min(left.length - 1, Math.floor(rng() * left.length));
    steps.push({ action: "decider", player: null, game: left[idx] });
  }
  return { ...pickBan, steps };
}

// Removes the last manual step (and the decider if it was already drawn).
export function undoPickBanStep(pickBan) {
  const steps = [...pickBan.steps];
  if (steps.length && steps[steps.length - 1].action === "decider") steps.pop();
  steps.pop();
  return { ...pickBan, steps };
}

// Games in the order they are played: picks as they were made, then the decider.
export function getPlayOrder(pickBan) {
  if (!pickBan) return [];
  const picks = pickBan.steps.filter((s) => s.action === "pick").map((s) => s.game);
  const decider = pickBan.steps.find((s) => s.action === "decider");
  return decider ? [...picks, decider.game] : picks;
}

// ── Sets ────────────────────────────────────────────────────

export function validateSetScore(scoreP1, scoreP2) {
  const ok = (n) => Number.isInteger(n) && n >= 0 && n <= SET_FT;
  if (!ok(scoreP1) || !ok(scoreP2)) return false;
  return (scoreP1 === SET_FT) !== (scoreP2 === SET_FT);
}

export function getSetsWon(sets) {
  let p1 = 0;
  let p2 = 0;
  for (const s of sets || []) {
    if (s.winner === 0) p1++;
    else if (s.winner === 1) p2++;
  }
  return [p1, p2];
}

// Progress of a match given its stored sets.
export function getMatchProgress(match) {
  const target = getSetTarget(match.winCondition);
  const [p1Sets, p2Sets] = getSetsWon(match.sets);
  const decided = p1Sets >= target || p2Sets >= target;
  return {
    target,
    p1Sets,
    p2Sets,
    decided,
    winnerIndex: decided ? (p1Sets >= target ? 0 : 1) : null,
    nextSetIndex: (match.sets || []).length,
  };
}

// Returns the new sets array. Throws on invalid input.
export function appendSet(match, scoreP1, scoreP2) {
  if (!validateSetScore(scoreP1, scoreP2)) {
    throw new Error(`A set is won by reaching ${SET_FT} rounds`);
  }
  const games = getPlayOrder(match.pickBan);
  const sets = match.sets || [];
  if (getMatchProgress(match).decided) throw new Error("Match is already decided");
  const game = games[sets.length];
  if (!game) throw new Error("No game left to play for this set");
  return [...sets, { game, scoreP1, scoreP2, winner: scoreP1 > scoreP2 ? 0 : 1 }];
}

export function removeLastSet(match) {
  return (match.sets || []).slice(0, -1);
}

// ── Phases ──────────────────────────────────────────────────

// Annotates every match with phase + format and empty pick/ban/set state.
export function assignPhases(matches) {
  const phaseByRound = {};
  for (const bracket of ["winners", "losers"]) {
    const rounds = [...new Set(matches.filter((m) => m.bracket === bracket).map((m) => m.round))]
      .sort((a, b) => a - b);
    rounds.forEach((r, i) => {
      const fromEnd = rounds.length - 1 - i;
      phaseByRound[`${bracket}-${r}`] = fromEnd === 0 ? "final" : fromEnd === 1 ? "semi" : "general";
    });
  }
  return matches.map((m) => {
    const phase = m.bracket === "grandFinal" ? "final" : phaseByRound[`${m.bracket}-${m.round}`];
    return { ...m, phase, winCondition: PHASE_FORMAT[phase], setFt: SET_FT, sets: [], pickBan: null };
  });
}

export function getFcRoundName(match) {
  if (match.bracket === "grandFinal") {
    return match.isGrandFinalReset ? "Grand Final Reset" : "Grand Final";
  }
  const prefix = match.bracket === "winners" ? "Winners" : "Losers";
  if (match.phase === "final") return `${prefix} Final`;
  if (match.phase === "semi") return `${prefix} Semifinal`;
  return `${prefix} Round ${match.round}`;
}

// ── Losers bracket + grand final ────────────────────────────

// Builds the losers bracket for an arbitrary winners-bracket shape. Survivors are
// first consolidated down to the number of incoming winners-bracket losers, then
// each drop-in round crosses survivors with those losers. Odd leftovers skip a
// round through a direct link instead of a BYE placeholder, so every player
// always ends the tournament with exactly two losses (or is the champion).
function buildLosersAndGrandFinal(wbMatches, wc) {
  const matches = [...wbMatches];
  const wbById = Object.fromEntries(wbMatches.map((m) => [m.id, m]));
  const wbRounds = [...new Set(wbMatches.map((m) => m.round))].sort((a, b) => a - b);
  let lbRound = 0;
  let survivors = [];

  const createMatch = (a, b, round, index) => {
    // An undecided LB winner always goes first: advanceBracket routes it to
    // player1 and drops incoming winners-bracket losers into player2.
    const [x, y] = a.kind !== "m" && b.kind === "m" ? [b, a] : [a, b];
    const match = {
      id: `lb-r${round}-m${index}`,
      bracket: "losers",
      round,
      matchIndex: index,
      player1: "TBD",
      player2: "TBD",
      winner: null,
      isPlayed: false,
      prevMatch1: x.kind === "m" ? x.id : null,
      prevMatch2: y.kind === "m" ? y.id : null,
      prevMatchLoser1: x.kind === "l" ? x.id : null,
      prevMatchLoser2: y.kind === "l" ? y.id : null,
      winCondition: wc,
      scoreP1: 0,
      scoreP2: 0,
    };
    for (const it of [x, y]) {
      if (it.kind === "l") wbById[it.id].loserGoesTo = match.id;
    }
    matches.push(match);
    return { kind: "m", id: match.id };
  };

  const buildRound = (pairs) => {
    if (pairs.length === 0) return [];
    lbRound++;
    return pairs.map((pair, i) => createMatch(pair[0], pair[1], lbRound, i));
  };

  for (const r of wbRounds) {
    const losers = wbMatches.filter((m) => m.round === r).map((m) => ({ kind: "l", id: m.id }));

    // 1. Consolidate survivors down to the number of incoming losers.
    while (survivors.length > losers.length) {
      const count = Math.min(Math.floor(survivors.length / 2), survivors.length - losers.length);
      const rest = survivors.slice(count * 2);
      const pairs = [];
      for (let i = 0; i < count; i++) pairs.push([survivors[i * 2], survivors[i * 2 + 1]]);
      survivors = [...rest, ...buildRound(pairs)];
    }

    // 2. Drop-in: survivors face incoming losers (mirrored to delay rematches);
    //    surplus losers meet each other, an odd one waits for the next round.
    const incoming = [...losers].reverse();
    const pairs = survivors.map((s, i) => [s, incoming[i]]);
    const surplus = incoming.slice(survivors.length);
    while (surplus.length >= 2) pairs.push([surplus.shift(), surplus.shift()]);
    survivors = [...buildRound(pairs), ...surplus];
  }

  const lbChampion = survivors[0];
  const lastWb = wbMatches.filter((m) => m.round === wbRounds[wbRounds.length - 1])[0];
  const gfRound = wbRounds[wbRounds.length - 1] + 1;
  const gfBase = {
    bracket: "grandFinal",
    round: gfRound,
    player1: "TBD",
    player2: "TBD",
    winner: null,
    isPlayed: false,
    prevMatchLoser1: null,
    winCondition: wc,
    scoreP1: 0,
    scoreP2: 0,
  };

  // Only possible with a single winners-bracket match: its loser is the LB champion.
  if (lbChampion.kind === "l") wbById[lbChampion.id].loserGoesTo = "gf-m0";

  matches.push({
    ...gfBase,
    id: "gf-m0",
    matchIndex: 0,
    prevMatch1: lastWb.id,
    prevMatch2: lbChampion.kind === "m" ? lbChampion.id : null,
    prevMatchLoser2: lbChampion.kind === "l" ? lbChampion.id : null,
    isGrandFinalReset: false,
  });
  matches.push({
    ...gfBase,
    id: "gf-m1",
    matchIndex: 1,
    prevMatch1: null,
    prevMatch2: null,
    prevMatchLoser2: null,
    isGrandFinalReset: true,
  });
  return matches;
}

// ── Bracket generation ──────────────────────────────────────

function shuffle(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Chooses who skips this round when the field is odd: a still-undecided match
// winner who has had the fewest byes, so already-privileged known entrants keep
// their advantage without receiving another one.
function takeDeferred(items) {
  const matchItems = items.filter((it) => it.kind === "m");
  const candidates = matchItems.length > 0 ? matchItems : items;
  const minByes = Math.min(...candidates.map((it) => it.byes));
  const chosen = [...candidates].reverse().find((it) => it.byes === minByes);
  return items.splice(items.indexOf(chosen), 1)[0];
}

function pairItems(pool, rng) {
  const items = [...pool];
  let deferred = null;
  if (items.length % 2 === 1) {
    deferred = takeDeferred(items);
    deferred = { ...deferred, byes: deferred.byes + 1 };
  }
  const directs = items.filter((it) => it.kind === "p");
  const matches = items.filter((it) => it.kind === "m");
  const pairs = [];
  // Known entrants face undecided winners first, so entrants of the same tier
  // do not meet each other early.
  while (directs.length && matches.length) {
    const pair = [directs.shift(), matches.shift()];
    pairs.push(rng() < 0.5 ? pair : [pair[1], pair[0]]);
  }
  const rest = directs.length ? directs : matches;
  while (rest.length >= 2) pairs.push([rest.shift(), rest.shift()]);
  return { pairs, deferred };
}

const LAST_ENTRY_ROUND = 3;

// Final Championship: double elimination where Winners enter one round and
// Champions two rounds after the regular participants. Odd fields are balanced by
// letting one undecided winner skip a round, so no BYE placeholders are needed.
export function generateFinalChampionshipBracket(participants, max, rng = Math.random) {
  const players = participants.slice(0, max);
  const byTier = { regular: [], winner: [], champion: [] };
  for (const p of players) byTier[getTier(p)].push(p);
  const entrants = {
    1: shuffle(byTier.regular, rng),
    2: shuffle(byTier.winner, rng),
    3: shuffle(byTier.champion, rng),
  };
  const entryByes = { 1: 0, 2: 1, 3: 2 };

  const matches = [];
  let carry = [];
  let roundNum = 0;

  for (let level = 1; ; level++) {
    const direct = (entrants[level] || []).map((p) => ({ kind: "p", name: p.name, byes: entryByes[level] }));
    const pool = [...carry, ...direct];
    if (level >= LAST_ENTRY_ROUND && pool.length <= 1) break;

    if (pool.length < 2) {
      carry = pool;
      continue;
    }
    const { pairs, deferred } = pairItems(pool, rng);
    const next = [];
    if (pairs.length > 0) roundNum++;
    pairs.forEach((pair, i) => {
      const id = `wb-r${roundNum}-m${i}`;
      matches.push({
        id,
        bracket: "winners",
        round: roundNum,
        matchIndex: i,
        player1: pair[0].kind === "p" ? pair[0].name : "TBD",
        player2: pair[1].kind === "p" ? pair[1].name : "TBD",
        winner: null,
        isPlayed: false,
        prevMatch1: pair[0].kind === "m" ? pair[0].id : null,
        prevMatch2: pair[1].kind === "m" ? pair[1].id : null,
        loserGoesTo: null,
        winCondition: "ft2",
        scoreP1: 0,
        scoreP2: 0,
      });
      next.push({ kind: "m", id, byes: 0 });
    });
    carry = deferred ? [...next, deferred] : next;
  }

  if (matches.length === 0) return [];
  return assignPhases(buildLosersAndGrandFinal(matches, "ft2"));
}
