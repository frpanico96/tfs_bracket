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
participants: array<{ id, name, email }>
matches: array<{
  id: string,
  round: number,
  matchIndex: number,
  player1: string,
  player2: string,
  winner: number (0 or 1) | null,
  isPlayed: boolean,
  prevMatch1: string | null,
  prevMatch2: string | null,
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

## Current Issues/TODO
- None identified

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