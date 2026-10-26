# TFS Bracket - Project Context

## Workflow Rules
- **Always pull from `main`** at the start of each work session (only the first time)
- **Commit on every change** - small, incremental commits after each feature/fix
- **Update this file** with changes made in each iteration

## Overview
A tournament bracket management app for creating and managing competitive tournaments.

## Tech Stack
- **Frontend**: React 19 + Vite
- **Backend**: Firebase (Auth + Firestore)
- **Styling**: Plain CSS

## Firebase Config (env vars required)
```
VITE_API_KEY
VITE_AUTH_DOMAIN
VITE_PROJECT_ID
VITE_STORAGE_BUCKET
VITE_MESSAGING_SENDER_ID
VITE_APP_ID
VITE_MEASUREMENT_ID
```

## Firestore Schema
### Collection: `tournaments`
```
id: string
name: string
maxParticipants: number (2-64, any number including odd)
regStart: timestamp
regEnd: timestamp
createdAt: timestamp
adminId: string
adminName: string
published: boolean
started: boolean
bracketType: string ("single" | "double")
participants: array<{ id, name, email }>
matches: array<{
  id: string,
  bracket: string ("winners" | "losers" | "grandFinal"),
  round: number,
  matchIndex: number,
  player1: string,
  player2: string,
  winner: number (0 or 1) | null,
  isPlayed: boolean,
  prevMatch1: string | null,
  prevMatch2: string | null,
  prevMatchLoser1: string | null,
  prevMatchLoser2: string | null,
  loserGoesTo: string | null,
  isGrandFinalReset: boolean,
  winCondition: string ("ft2" | "ft3" | "ft5" | "ft7" | "ft9"),
  scoreP1: number,
  scoreP2: number
}>
```

### Collection: `logs`
```
id: string
level: string (info, warn, error)
action: string
details: object
timestamp: timestamp
```

## Key User Flows
1. **Login** → Google Sign-In via Firebase Auth
2. **Create Tournament** → Sets name, max participants, reg dates, saved as draft
3. **Publish** → Only admin can publish (opens registration)
4. **Join Tournament** → Users join if reg open and slots available
5. **Start Tournament** → Admin generates bracket, shuffles participants
6. **Record Results** → Admin clicks "Win" on matches, advances bracket

## Dev Features
- `+ Add Fake Users` button (only in dev mode, admin only) - fills empty slots with fake participants
- `Change Max Players` button (only in dev mode, admin only) - updates maxParticipants for testing

## Iteration Log

### Iteration 1: Preliminary Rounds for Odd Player Counts
- **Feature**: Added support for odd number of players via preliminary rounds
- **Algorithm**: For N players, calculate `base = 2^floor(log2(N))`, create `N - base` preliminary matches, remaining players get byes into round 2
- **Changes**:
  - `src/utils/bracket.js`: Rewrote `generateBracket` to create preliminary round (round 1) when player count isn't a power of 2
  - `src/components/BracketView.jsx`: Added round naming (Preliminary, Quarterfinals, Semifinals, Finals)
  - `src/components/CreateTournament.jsx`: Changed maxParticipants from select dropdown to number input (2-64)
  - `src/components/TournamentDetail.jsx`: Added "Change Max Players" dev button for testing
- **Testing**: Update mock tournament maxParticipants from 8 to 11 via dev button, add 3 more fake users

## Available Scripts
```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run lint     # ESLint check
npm run preview # Preview production build
```

## Iteration 2: Double Elimination (Winner/Loser Bracket)

### Feature: Double Elimination Support
- **Toggle**: New "Single Elimination" / "Double Elimination" toggle in CreateTournament form (stores `bracketType` field on Firestore)
- **Bracket Generation**: `generateDoubleEliminationBracket` in `src/utils/bracket.js` creates winners + losers brackets + grand final with bracket reset support
- **Data Model**: Matches have `bracket` field (`"winners"`, `"losers"`, `"grandFinal"`), `loserGoesTo` on WB matches, `prevMatchLoser1/2` on LB matches, `isGrandFinalReset` on GF reset match
- **Grand Final Reset**: When the Losers Bracket champion wins GF match 1, `gf-m1` activates automatically — the LB champion must win a second match to claim the title
- **Bracket View**: `BracketView.jsx` renders three sections: Winners Bracket, Losers Bracket, Grand Final with labels (WB • / LB • prefixes)

### Changes:
- `src/utils/bracket.js`: Added `generateDoubleEliminationBracket`, `propagateDoubleByeWinners`, `isDoubleBracket`; updated `advanceBracket` and `resetBracket` to handle double elim
- `src/components/CreateTournament.jsx`: Added bracket type toggle (single/double)
- `src/components/TournamentDetail.jsx`: Updated start/reset to use double elim generator when `bracketType === "double"`
- `src/components/BracketView.jsx`: Rewritten with `SingleBracketView` / `DoubleBracketView` / `GrandFinalMatch` / `MatchCard` sub-components
- `src/App.css`: Added styles for bracket type toggle, double elimination layout, grand final match card, WB/LB labels

### Firestore Schema Update
```
bracketType: string ("single" | "double")  # Added to tournaments collection
```

### Bug Fixes (Iteration 2.1)
- **Data staleness**: `TournamentDetail.jsx` was using `tournaments.find()` (stale Firestore snapshot) instead of the `tournament` prop (which is updated locally via `onUpdate`). Changed to use `tournament` directly, ensuring loser/winner propagations are immediately visible without waiting for Firestore sync.
- **Round naming**: `getLbRoundName` in `BracketView.jsx` marked ALL single-match LB rounds as "Losers Final". Fixed to only label the last LB round as "Losers Final"; intermediate consolidation rounds are correctly named "Losers Round N".
- **LB winner propagation**: `advanceBracket` in `bracket.js` had a bug where `match.bracket` was always referencing the original match (not the auto-advanced match), causing premature breaks in the propagation loop. Fixed by tracking `currentBracket` as the loop progresses.
- **BYE auto-advance in LB**: `propagateByeWinnersLosers` only did single-level propagation for LB matches. Rewritten with a while loop that chains through BYEs in both WB and LB brackets.
- **MatchCard clickability**: Was only checking `player2 === "BYE"` (single elim convention). Fixed to check both player slots for BYE, and to handle null players.

### Testing
- **Framework**: Vitest (v4) with jsdom environment
- **Libraries**: @testing-library/react, @testing-library/jest-dom, @testing-library/user-event
- **Setup**: `src/test/setup.js` (imports jest-dom matchers)
- **Location**: All test files in `src/test/` (Vitest discovers via `**/*.test.*` glob)
- **Scripts**: `npm test` (run once), `npm run test:watch` (watch mode)

### Test Files
```
src/
├── components/       # UI components
├── utils/            # Utility functions
├── test/             # Test files (Vitest)
    ├── bracket.test.js          # 33 tests (generation, advance, reset, utils)
    ├── logger.test.js           # 5 tests (Firebase addDoc mocking)
    ├── Header.test.jsx          # 5 tests
    ├── BaseModal.test.jsx       # 5 tests
    ├── PlayerColumn.test.jsx    # 8 tests
    ├── TournamentList.test.jsx  # 9 tests
    ├── BracketView.test.jsx     # 11 tests (single/double elim rendering)
    ├── MatchScoreModal.test.jsx # 9 tests (score entry, validation)
    ├── TournamentSidebar.test.jsx # 4 tests
    ├── CreateTournament.test.jsx  # 5 tests
    └── TournamentDetail.test.jsx  # 10 tests (manual participant addition)
Total: 110 tests across 11 files
```

### Bug Fix: advanceBracket single elim propagation
`advanceBracket` in `bracket.js` was checking `m.bracket === 'winners'` in the propagation loop, but single elimination matches don't have a `bracket` property. Fixed by adding `!m.bracket ||` to the condition so single elim winners propagate correctly. Discovered via unit tests.

## Iteration 3: Manual Participant Addition (Admin)

### Feature: Admin Can Manually Add Participants
- **Purpose**: UAT phase — the testing admin needs to add participants manually instead of relying on self-registration
- **Modal**: Uses `BaseModal` with a form containing Name (required) + Email (optional) fields
- **ID Generation**: Participants get a unique `manual-{timestamp}-{random}` ID (no Firebase Auth UID needed)
- **Visibility**: Button shows for the admin as long as the tournament hasn't started (not gated by `isDev`)
- **Edge cases**: Form validates non-empty name; email auto-generated if omitted; modal state resets on close

### Changes:
- `src/components/TournamentDetail.jsx`: Added `showAddParticipant` state, `addParticipantName`/`addParticipantEmail` state, `handleAddParticipant` handler, "Add Participant" button in participants-actions, `BaseModal` with form
- `src/App.css`: Added `.modal-field` styles for form inputs inside modals

## Iteration 4: Security Hardening

### Feature: Client-Side Authorization Guards
- **Admin guards**: Added `if (!isAdmin) return;` check at the top of every mutation handler in `TournamentDetail.jsx` — publish, start, saveScore, updateAllWinConditions, updateMatchWinCondition, addParticipant, addFakeUsers, resetBracket, delete
- **Join validation**: `handleJoin` now checks published status, duplicate join, and capacity before executing (defense in depth beyond UI-only gates)
- **Delete guard**: `handleDeleteTournament` in `App.jsx` now fetches the document and verifies `adminId === user.uid` before deleting
- **isAdmin null guard**: Changed from `user.uid === t.adminId` to `user?.uid && t?.adminId && user.uid === t.adminId` to handle edge cases
- **Input validation**: `CreateTournament.jsx` validates name length (≤100), maxParticipants range (2-64), and regEnd > regStart before submitting
- **Firestore export**: Added `getDoc` to `firebase.js` exports (needed for delete guard)
- **Dev onboarding**: Created `.env.example` with placeholder values

### Changes:
- `src/components/TournamentDetail.jsx`: `isAdmin` null guard; auth check in handleJoin/handlePublish/handleStartTournament/handleSaveScore/handleUpdateAllWinConditions/handleUpdateMatchWinCondition/handleAddParticipant/handleAddFakeUsers/handleResetBracket/handleDelete
- `src/App.jsx`: `handleDeleteTournament` now fetches doc and verifies admin ownership before delete
- `src/firebase.js`: Added `getDoc` to imports and exports
- `src/components/CreateTournament.jsx`: Input validation for name length, maxParticipants, date ordering
- `.env.example`: Created for developer onboarding

## Iteration 9: UAT Testing Fixes — Score Awarding, Player Join, Restricted Page

### Changes
- `firestore.rules`: Users read rule opened to all auth users (admin needs `getDoc` to read player docs before awarding scores). Users update rule allows `score`-only changes (via `diff().affectedKeys().hasOnly(["score"])` or empty diff for `increment(0)` no-ops). Tournament update rule adds `canJoinTournament()` for players to join open tournaments. Invites read/update opened to all auth users (create/delete remain admin-locked).
- `src/components/TournamentDetail.jsx`: Score award flow now only sets `scoresAssigned` after ALL player updates succeed. Skips `increment(0)` calls. Replaced silent `catch {}` with `console.warn`.
- `src/components/RestrictedAccess.jsx` + `.css`: Standalone page with gradient background and centered card, no app chrome visible.
- `.env` / `.env.dev` / `package.json`: Env files split, `vite --mode dev` for dev mode.
- `src/release-notes.json`: Added `beta-v0.3` entry.

### Key Decisions
- Users read: any authenticated user can read any user doc. Names/emails are already public via tournament participant lists. This is required for leaderboard queries and admin score-award `getDoc` calls.
- Users update: any authenticated user can update the `score` field on any user doc. This is required for tournament score awarding. No other fields (role, name, email) can be modified cross-user.
- Score awarding only marks `scoresAssigned: true` after all player updates succeed. If any fails (e.g., rules deny), the flag stays false and the admin can retry.

### Security Fixes Applied

#### 1. Firestore Rules (Complete Rewrite)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAdmin() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ["admin", "tournament_admin"];
    }

    function isSuperAdmin() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin";
    }

    function isValidTournament() {
      return request.resource.data.name is string
        && request.resource.data.name.size() <= 100
        && request.resource.data.maxParticipants >= 2
        && request.resource.data.maxParticipants <= 64
        && request.resource.data.bracketType in ["single", "double"]
        && request.resource.data.adminId == request.auth.uid;
    }

    function canJoinTournament() {
      return resource.data.published == true
        && request.time >= resource.data.regStart
        && request.time < resource.data.regEnd
        && resource.data.participants.size() < resource.data.maxParticipants
        && request.resource.data.participants.size() == resource.data.participants.size() + 1
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(["participants"]);
    }

    match /tournaments/{tournamentId} {
      allow read: if request.auth != null
        && (resource.data.published == true
            || resource.data.adminId == request.auth.uid
            || isAdmin());
      allow create: if request.auth != null
        && isAdmin()
        && isValidTournament();
      allow update: if request.auth != null
        && (request.auth.uid == resource.data.adminId
            || canJoinTournament());
      allow delete: if request.auth != null
        && request.auth.uid == resource.data.adminId;
    }

    match /users/{userId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null
        && request.auth.uid == userId;
      allow update: if request.auth != null
        && (request.auth.uid == userId
            || request.resource.data.diff(resource.data).affectedKeys().hasOnly(["score"])
            || request.resource.data.diff(resource.data).affectedKeys().size() == 0);
      allow delete: if request.auth != null
        && request.auth.uid == userId;
    }

    match /invites/{inviteId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null
        && isSuperAdmin();
      allow update: if request.auth != null;
      allow delete: if false;
    }

    match /logs/{logId} {
      allow create: if request.auth != null;
      allow read: if false;
      allow delete: if false;
      allow update: if false;
    }
  }
}
```

#### 2. Invite System — Transactional Consumption
- `consumeInvite` now uses `runTransaction` to atomically validate and consume invites (TOCTOU fix)
- Re-reads invite doc inside the transaction, checks `used`, `usedCount`, `expiresAt`, then writes
- `isEmailInvited` now filters `where("used", "==", false)` — consumed invites no longer grant access

#### 3. Leaderboard — Proper Query Filter
- Changed from `query(usersRef)` (which read ALL user docs and would fail with rule `userId == uid or score > 0`)
- Now uses `query(usersRef, where("score", ">", 0))` — only returns users with scores, passes the rule
- Removed client-side `.filter()` since the query already excludes scoreless users

#### 4. Firebase Hosting — Security Headers
Added `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, `Referrer-Policy`, `X-XSS-Protection` to hosting config.

#### 5. Composite Index
Added `email ASC, used ASC` composite index for the `isEmailInvited` query.

### Changes:
- `firestore.rules`: Complete rewrite with role-based access on all collections, input validation on tournament creates
- `src/utils/invite.js`: TOCTOU fix via `runTransaction`; `isEmailInvited` now filters `used == false`
- `src/firebase.js`: Added `runTransaction` to imports/exports
- `src/components/Leaderboard.jsx`: Added `where("score", ">", 0)` to query, removed client-side `.filter()`
- `firebase.json`: Added security headers
- `firestore.indexes.json`: Added `invites` composite index
- `.env`: Added `VITE_ALLOW_OPEN_REGISTRATION=true`
- `.env.example`: Added `VITE_ALLOW_OPEN_REGISTRATION`
## Iteration 5: Role-Based Access Control

### Feature: Global Admin/Player Role System
- **Firestore `users/{uid}` collection**: Each user gets a document with `role`, `email`, `name`, `createdAt` on first login
- **Bootstrapping**: `VITE_ADMINS` env var lists email addresses that get auto-assigned `admin` role on first login
- **Role resolution**: `useUserRole` hook reads from Firestore; falls back to env var if Firestore fails
- **Players**: Cannot create tournaments, cannot see "Create Tournament" button, no access to create view
- **Admins**: Full access to create and manage tournaments
- **Admin role badge**: Shows in header next to user name (purple for admin, grey for player)

### Changes:
- `src/hooks/useUserRole.js`: New hook that reads/creates user role doc in Firestore
- `src/App.jsx`: Uses `useUserRole`, passes `role` and `isGlobalAdmin` to children; gates create view; shows loading state
- `src/components/Header.jsx`: Added `role` prop, renders role badge
- `src/components/TournamentList.jsx`: Only shows "Create Tournament" button and create prompt for `isGlobalAdmin`
- `src/firebase.js`: Added `setDoc` to imports/exports
- `src/App.css`: Added `.role-badge` styles
- `.env`: Added `VITE_ADMINS=frpanico96@gmail.com`
- `.env.example`: Added `VITE_ADMINS` placeholder
- `src/test/TournamentList.test.jsx`: Updated tests for `isGlobalAdmin` prop gating
- `src/test/Header.test.jsx`: Compatible with optional `role` prop

### Test Count
```
Total: 110 tests across 11 files
```

## Iteration 6: Invite System & Tournament Admin Role

### Feature: Role-Based Invite Links
- **New role `tournament_admin`**: Can create and manage tournaments but cannot use the invite functionality (reserved for `admin` super admins)
- **Invite generation**: Super admins (`VITE_ADMINS`) see an "Invite" button in the Header → opens `InviteModal` → enter @gmail.com email + select role (Tournament Admin / Player) → generates unique invite link → copy to clipboard
- **Invite processing**: `useUserRole` reads `?invite=TOKEN` query param on page load → fetches invite from Firestore `invites` collection → validates (not used, email match) → updates user role → marks invite as consumed
- **Invite banner**: Shows success/error message on the tournament list page after invite processing
- **Role hierarchy**: `admin` (super, from VITE_ADMINS) > `tournament_admin` (can create/manage) > `player` (view only)

### Changes:
- `src/hooks/useUserRole.js`: Added `isSuperAdmin` return, `inviteToken` parameter, invite processing logic; `isGlobalAdmin` now includes `tournament_admin`
- `src/utils/invite.js`: New file with `createInvite`, `getInviteByToken`, `consumeInvite`, `buildInviteLink`, `INVITE_ROLES`
- `src/components/InviteModal.jsx`: New component — modal with email input, role selector, link generation, copy-to-clipboard
- `src/components/Header.jsx`: Added `isSuperAdmin` and `onInvite` props, "Invite" button
- `src/App.jsx`: Reads invite query param, passes to hook, shows invite banner, renders InviteModal
- `src/firebase.js`: Added `invitesRef` export
- `src/App.css`: Added `.role-badge.role-tournament_admin`, `.header-actions`, `.btn-invite`, `.invite-banner`, `.invite-link-box`, `.invite-error/success/hint`
- `.env.example`: No changes needed (existing `VITE_ADMINS` is sufficient)

### Firestore Schema Update
```
Collection: invites
  token: string (unique, via crypto.randomUUID())
  email: string (lowercase)
  role: string ("tournament_admin" | "player")
  used: boolean
  createdBy: string (uid)
  createdByName: string
  createdAt: timestamp
```

### Firestore Rules Update
```
match /invites/{inviteId} {
  allow read: if request.auth != null;
  allow create: if request.auth != null;
  allow update: if request.auth != null;
}
```

## Iteration 10: Final Championship

### Feature
A second tournament type, `tournamentType: "final_championship"` (absent on standard tournaments). It is always double elimination and is played over a **pool of games** instead of a single game. Everything is **admin-driven**: the admin runs the pick/ban for both players and records the set scores (no player ownership or live sync).

- **Creation**: `CreateTournament` has a Standard / Final Championship toggle. For Final Championship the bracket-type toggle and single-game picker are replaced by `GamePoolPicker` (reuses `GamePicker`, appends each pick as a removable chip). Minimum pool: 11 games (`MIN_POOL_SIZE`).
- **Tiers**: participants carry `tier: "regular" | "winner" | "champion"` (missing = regular). The admin sets it from the participant list before the bracket starts. Winners enter the winners bracket one round after the regulars, Champions two rounds after. Any number of each.
- **Formats** (`PHASE_FORMAT`): matches before the semifinals are FT2 sets, both semifinals FT3, Winners Final / Losers Final / Grand Final / Grand Final Reset FT5. Each *set* is one game title played to 3 rounds (`SET_FT`). `winCondition` holds the match format (`ft2|ft3|ft5`), so `advanceBracket` and the rankings work unchanged: `scoreP1/scoreP2` are **sets won**.
- **Pick/ban templates** (admin acts for player1 / player2 in turn; the decider is automatic and random from what is left):
  - FT2: ban, ban, pick, pick, ban, ban, decider (3 games max)
  - FT3: ban, ban, pick, pick, ban, ban, pick, pick, decider (5 games max)
  - FT5: pick, pick, ban, ban, pick, pick, pick, pick, pick, pick, decider (9 games max; with an 11-game pool the decider is the last game left)
  - Games are played in pick order, the decider last. The pool resets for every match (including the Grand Final Reset).
- **Match flow**: `FinalChampionshipMatchModal` (pick/ban wizard with undo, then per-set score entry, DQ). Progress (`pickBan`, `sets`) is saved to Firestore after each step via `handleSaveFcProgress`, so a match can be resumed; the match is only decided (and `advanceBracket` called through `handleSaveScore`) when a player reaches the set target.

### Data model additions
```
tournaments/{id}:
  tournamentType: "final_championship"        # only on Final Championship
  gamePool: array<{ id, name, image }>
  participants[].tier: "regular" | "winner" | "champion"
  matches[].phase: "general" | "semi" | "final"
  matches[].winCondition: "ft2" | "ft3" | "ft5"   # fixed per phase
  matches[].setFt: 3
  matches[].pickBan: null | { template, pool: [{id,name}], steps: [{ action: "ban"|"pick"|"decider", player: 0|1|null, game }] }
  matches[].sets: array<{ game, scoreP1, scoreP2, winner: 0|1 }>
```
No `firestore.rules` changes were needed (`bracketType` is `double`, tier changes are admin participant updates, and a full 64-player bracket with sets stays around 160 KB).

### Bracket generation (`src/utils/finalChampionship.js`)
- `generateFinalChampionshipBracket(participants, max, rng)`: builds the winners bracket level by level. Level 1 pairs the regulars, level 2 adds the Winners to the survivors, level 3 adds the Champions. Known entrants face undecided winners first so same-tier players do not meet early. If a level has an odd number of entrants one undecided winner skips a round, so **no BYE placeholders** are used.
- `buildLosersAndGrandFinal(wbMatches, wc)`: losers bracket for an arbitrary winners-bracket shape (consolidate survivors, then cross with the incoming losers; odd leftovers skip a round by a direct link). It is separate from the standard generator, which is untouched.
- Every non-champion ends with exactly two losses; this is covered by a simulation over 633 tier mixes (1,899 played-out tournaments).

### Rankings
Superseded by Iteration 12b: `computeRankings` now groups every double elimination tournament (standard and Final Championship) by the losers-bracket match that knocked a player out.

### Other changes
- `TournamentDetail.jsx`: tier selector + badges, FC start/reset, FC modal, swap limited to players of the same tier, win-condition handlers disabled for FC, game pool shown in the info block.
- `BracketView.jsx` / `PublicBracketView.jsx`: phase round names (Winners Semifinal, Losers Final, ...), fixed (non-clickable) format labels, live set score for matches in progress.
- `TournamentSidebar.jsx`: `hideWinCondition` replaces the default win-condition control for FC.
- Known limitation: a player joining while registration is open writes the participants array from their own copy, so tiers should be set once registration is closed (same pre-existing behaviour as other participant edits).

### Tests
Suite total: 240 tests across 19 files (180 before this iteration). New files: `finalChampionship.test.js` (engine, simulation, rankings, full flow), `FinalChampionshipMatchModal.test.jsx`, `GamePoolPicker.test.jsx`, `CreateTournamentFC.test.jsx`, `BracketViewFC.test.jsx`, `TournamentDetailFC.test.jsx`.

## Iteration 11: Maintainability pass

### Done (behaviour-preserving)
- `utils/participants.js`: `addNames` / `removeName` / `renameName` replace seven hand-written copies of the `participantNameSet` bookkeeping in `TournamentDetail.jsx`.
- `bracket.js`: removed the unreachable "drop loser into losers bracket" blocks in `propagateInitialByes` (only BYE matches are played at generation, so their loser is always `"BYE"`). Verified: 0 calls over field sizes 2-64 and byte-identical output for 504 generated brackets (single + double, seeded).
- `finalChampionship.js`: `canSwapSlots` holds the same-tier swap rule (was inline in the 1100-line component), unit-tested.
- `App.jsx`: `Leaderboard`, `PublicRegistration` and `PublicBracketView` are lazy-loaded. Main chunk 660 kB -> 293 kB (firebase split into its own 363 kB chunk).
- CI: also runs on PRs to `develop` and now runs `npm run build`.
- Tests: standard double-elimination playthrough for every field size 2-64, helpers, `canSwapSlots`.

### Backlog (not done on purpose, needs a decision or Firebase emulator)
1. **Lost updates**: every match save writes the whole `matches[]` from the client copy. Two admins (or two tabs) scoring different matches overwrite each other. Fix: `runTransaction` re-reading the doc, or one doc per match in a subcollection (also removes the 1 MiB / 3000-key ceiling).
2. **Rules trust the client**: `firestore.rules` does not validate `matches` shape, so any admin client can write a bracket that violates the game rules. Add shape checks or move scoring into a Cloud Function.
3. **`TournamentDetail.jsx` is ~1100 lines** with ~30 handlers mixing Firestore writes, validation and UI. Next step: a `useTournamentActions(t, user)` hook so handlers are testable without rendering.
4. **`App.css` is a single ~3000-line file**; consider CSS modules per component.
5. **Docs drift** (`DEV_CONTEXT.md` test counts, README) - generate counts in CI instead of hand-editing.
6. Standard double-elim ranking splits same-round losers (see Iteration 10); product decision.

## Iteration 12: Swap players on TBD slots + same-round positions

### 12a. Swapping TBD slots (`src/utils/swap.js`)
Use case: recreate an external backup bracket exactly, including which prelim winner feeds which round-2 match.
- `swapSlots(matches, id1, slot1, id2, slot2)` returns a new array, or the **same reference when refused**.
  - named <-> named: delegates to the unchanged `swapPlayers` (any round, FC keeps its same-tier rule).
  - anything involving a TBD slot: the whole slot (`playerN` **and** `prevMatchN` feeder link) is exchanged, so "winner of match X" moves to another match. `advanceBracket` routes winners through `prevMatch1/2`, so nothing else has to change.
  - TBD rules (keep the bracket a valid tree, keep entry rounds): both slots in the **same round**, both on the **winners side** (winners bracket / single elimination; never losers bracket or grand final), no BYE, and none of the matches (or their feeders) played. Swapping is already only offered while no match has been played.
- `isSwappableSlot(match, slot)`: named slot, or TBD slot with a feeder on the winners side.
- `BracketView`: TBD slots are selectable in swap mode (hint text: see Iteration 13). Refused pairs just clear the selection.
- `TournamentDetail`: uses `swapSlots`; a refused swap shows a toast. `canSwapSlots` (Final Championship tier rule) only compares tiers when both slots hold a player, so a Winner/Champion can be swapped with a TBD slot of their own round.
- Not covered: the losers-bracket wiring (which winners-bracket loser drops into which losers match) is still the generated one. If the backup bracket drops losers differently, that needs its own editor.
- Tests: `swap.test.js` (engine, refusals, property test: random accepted swaps on standard, single and Final Championship brackets always play out with every player losing exactly twice), `BracketViewSwapTbd.test.jsx`, `TournamentDetailSwap.test.jsx`.

### 12b. Same losers round = same position; only available positions in Score Settings
- `computeDoubleElimRankings` (bracket.js): after champion and runner-up, every player is placed by the **losers-bracket loss that eliminated them**; players out in the same losers round share a position (`displayRank` "5th-6th") and get the points of the first position of the group. The old special code for 3rd/4th and the "highest round lost" rule (which compared round numbers across the two brackets) are gone; podium and ordering are unchanged (checked on 1,575 finished standard brackets: 0 order flips, top 4 identical). The temporary `rankByLosersExit` option from Iteration 10 was removed because this is now the only behaviour.
- `utils/positions.js`: `getPositionGroups(tournament)` / `getAvailablePositions(tournament)` return the positions that exist, e.g. 8 players -> 1,2,3,4,5,7; 11 players -> 1,2,3,4,5,7,9,11. They generate the real bracket (standard or Final Championship with tiers), play it out once and read the rankings, so they can never disagree with the real result. Verified independent of the results for every standard size 2-64 and 386 Final Championship tier mixes. Single elimination returns `null` (unchanged: every position listed).
- Score Settings modal (`TournamentDetail`): lists only available positions, tie rows are labelled "5th-6th Place". Values are still stored in `rankScores[rank - 1]`, so existing data keeps working and a position that is not listed is simply ignored. With fewer than 2 participants the maximum player count is used (note shown). The list follows the number of registered players, so check it again once registration is closed.
- Existing data: tournaments whose scores were already awarded are not recalculated. Tournaments finished before this change show shared positions in the sidebar from now on (rankings are derived from the matches), and the points of the second player of a tie are now those of the first position of the group.
- Tests: `positions.test.js` (position tables, sums, independence from results, same-round ties with distinct points per rank), `TournamentDetailPositions.test.jsx` (modal), plus the Iteration 10 ranking tests.

## Iteration 13: Losers bracket mirror order + expected-player hints

### 13a. Mirror drop order (`bracket.js`)
Winners-bracket losers now enter **losers round 2 only** (the first drop-in round) in **reverse** order: the loser of the first WB match of that round plays the **last** LB match of the round, and the last WB match's loser plays the first (16 players: `wb-r2-m0..m3 -> lb-r2-m3..m0`). Later drop-in rounds keep the natural order (changed after feedback: mirroring every round mixed players badly). It separates players who just met in the WB (rematch figures quoted in the first version of this patch were for mirroring every round and no longer apply).
- Only the loser mapping changed: WB and LB winner links, round counts and positions are identical for sizes 2-64. Final Championship already mirrored and is unaffected.
- `advanceBracket` drops a loser into the slot named by `prevMatchLoser1/2` of the target (deterministic); the old first-free-slot logic remains as fallback for older stored brackets.
- Existing tournaments keep their stored wiring; only newly generated or reset brackets get the mirrored order.

### 13b. Expected-player hints on every TBD slot (`utils/slotLabels.js`)
Display only: the stored value stays `"TBD"`; a child `<small class="slot-hint">` is shown (the span's own text is still exactly "TBD").
- WB: `Winner WB R1 #3`; single elimination: `Winner R1 #3`; LB: `Winner LB R2 #1` / `Loser WB R2 #1`; grand final: winner of the WB / LB final; reset: `Grand Final finalist`. BYE and named slots show nothing.
- `title` tooltip with the real names once the source match is known (`Loser of Ann vs Bob`). The lookup comes from a context in `BracketView`.
- The hint is always visible now (it used to show in swap mode only); `feederLabel` was removed from `swap.js`. The grand final placeholder card also lists its two sources.
- Tests: `lbMirrorAndHints.test.js`, updated `BracketViewSwapTbd.test.jsx` / `swap.test.js`.

## Iteration 14: Seeding by leaderboard score

### Rules
- Seed = rank by total leaderboard score (`users.score`, read with the same query as the Leaderboard). Equal scores, players without an account and players without score are ordered randomly among themselves, below the scored players.
- Applies to single elimination, double elimination and Final Championship regulars.
- Standard / double: standard seed order (`standardOrder`): 8 players -> 1v8, 4v5, 2v7, 3v6, so top seeds meet last. Not a power of two: the best seeds get the byes into the first full round, the others play preliminaries best-vs-worst (20 players: top 12 byes, 13v20, 14v19, 15v18, 16v17); a preliminary winner takes the slot of the better seed of its match (seed 1 faces the 16v17 winner).
- Final Championship: regulars that skip the preliminary round enter at round 2, so the "most advanced regular entry round" is 2 (1 when the regular field is a power of two). **Winners enter one round after that, Champions two rounds after that** (24 players = 20 regular + 2 winners + 2 champions: preliminaries round 1, bye seeds round 2, Winners round 3, Champions round 4). FC still uses no BYE placeholders. Rounds pair best seed vs worst seed of the pool (`pairSeeded`); an odd pool still defers one undecided winner.

### Code
- `utils/seeding.js`: `seedParticipants(participants, scores, rng)` (copies with `seed`), `standardOrder`, `seededFirstRound`, `hasSeeds`.
- Generators seed **only when every participant has a numeric `seed`**; otherwise the old random draw runs unchanged (existing tests, callers and `Math.random` behaviour are identical).
- `TournamentDetail`: start and reset read the scores (`loadSeededParticipants`) and store `seeded: true|false` on the tournament doc. If the leaderboard can not be read a toast is shown and the draw is random (`seeded: false`).
- `positions.js`: measures the seeded shape unless the tournament was started without `seeded` (tournaments started before this change keep the old shape; only matters for Final Championship fields whose regulars are not a power of two).

### Notes
- Seeds are not persisted per player; they live in the generated bracket. Reset re-reads the scores, so a reset after a leaderboard change re-seeds.
- Existing tournaments are untouched until reset.
- Tests: `seeding.test.js`, `TournamentDetailSeeding.test.jsx`, seeded/legacy cases in `positions.test.js`.

