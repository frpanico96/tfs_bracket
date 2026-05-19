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
1. Create a tournament with "Double Elimination" type
2. Add participants (need power of 2 for clean bracket, e.g., 4 or 8)
3. Start tournament → verify winners + losers brackets render
4. Record scores in WB → verify losers drop to LB
5. Complete LB → verify LB champion reaches GF
6. Test GF reset: if LB champion wins GF match 1, verify reset match activates

## Refactoring (Completed)
All code has been split into reusable components following best practices:

### Directory Structure
```
src/
├── components/
│   ├── Header.jsx              # App header with user info
│   ├── TournamentList.jsx     # Tournament listing view
│   ├── CreateTournament.jsx   # Tournament creation form
│   ├── TournamentDetail.jsx   # Tournament detail view
│   ├── BracketView.jsx        # Bracket visualization (clickable matches)
│   ├── TournamentSidebar.jsx  # Page-level sidebar (extensible for multiple features)
│   ├── BaseModal.jsx          # Reusable modal component (extended for specific features)
│   ├── MatchScoreModal.jsx    # Score recording modal (extends BaseModal)
│   └── PlayerColumn.jsx       # Player profile + score buttons (used in MatchScoreModal)
├── utils/
│   ├── bracket.js             # Bracket generation + date parsing
│   └── logger.js             # Logging utility
├── App.jsx                    # Main app with auth + routing
├── firebase.js               # Firebase config + exports
├── App.css                    # Component styles
└── index.css                 # Global styles
```

### New Development Approach
- Always create new components in `src/components/`
- Keep utility functions in `src/utils/`
- Import firebase from `../firebase` relative path