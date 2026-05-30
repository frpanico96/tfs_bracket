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

### Updated Firestore Security Rules (for Firebase Console)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /tournaments/{tournamentId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null
                    && request.resource.data.adminId == request.auth.uid;
      allow update: if request.auth != null
                    && request.auth.uid == resource.data.adminId;
      allow delete: if request.auth != null
                    && request.auth.uid == resource.data.adminId;
    }
    match /users/{userId} {
      allow read, write: if request.auth != null
                         && request.auth.uid == userId;
    }
    match /logs/{logId} {
      allow create: if request.auth != null;
      allow read: if request.auth != null;
    }
  }
}
```

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
