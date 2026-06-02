# TFS Bracket

A modern tournament bracket management application with invite-only access, role-based control, and real-time scoring.

Built for **Team Fight Series (TFS)** — a community fighting game tournament organization.

---

## Features

- **Single & Double Elimination** — Generate brackets, support odd players, grand final reset
- **Real-time Scoring** — Record match scores with a compact modal; DQ support
- **Role-based Access** — Super Admin, Tournament Admin, and Player roles
- **Invite-only UAT** — Secure invite system with email invites and shareable invite links
- **Participant Management** — Add existing users or create new players via picklist + name field
- **Custom Point System** — Assign points per finishing rank via "Set Scores" modal
- **Leaderboard** — Cumulative scores across all completed tournaments, real-time updates
- **Player Swap** — Admin can swap players between unfilled match slots before recording scores
- **Rankings Sidebar** — Post-tournament rankings computed from bracket results, visible to all users
- **Completed Tournament Handling** — Auto-assign scores, sort completed tournaments to bottom
- **Session Persistence** — Auth and navigation state survive page refresh

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, plain CSS |
| Backend | Firebase Auth, Firestore |
| CI | GitHub Actions (`test.yml`) |
| Hosting | Firebase Hosting |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- A Firebase project with Auth (Google provider) and Firestore enabled

### Setup

```bash
git clone <repo-url>
cd tfs-bracket
npm install
```

### Environment Variables

Create a `.env` file in the `tfs-bracket/` directory:

```env
VITE_API_KEY=your-firebase-api-key
VITE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_PROJECT_ID=your-project-id
VITE_STORAGE_BUCKET=your-project.appspot.com
VITE_MESSAGING_SENDER_ID=your-sender-id
VITE_APP_ID=your-app-id
VITE_ADMINS=your.email@gmail.com
VITE_ENV=dev
VITE_DEV_VERSION=
VITE_UAT_VERSION=
VITE_PROD_VERSION=
```

See `.env.example` for the full list.

### Development

```bash
npm run dev
```

### Testing

```bash
npm test
```

### Build

```bash
npm run build
```

### Deploy

```bash
npx firebase deploy
```

---

## Version Badges

The header and login page show badges for each relevant deployment environment. Each badge is color-coded:

| Badge | Color | Meaning |
|-------|-------|---------|
| **Prod** | Green | Version deployed to production |
| **UAT** | Amber | Version deployed to user acceptance testing |
| **Dev** | Purple | Current development version |
| **—** | Gray | Environment has no deployed version |

In **DEV** all three badges are shown. In **UAT** only Prod and UAT are shown. In **PROD** only the Prod badge is shown. The Dev badge includes `(development)` to distinguish it.

Click any badge to view release notes.

The Dev version is resolved in order:
1. `VITE_DEV_VERSION` environment variable
2. Latest git tag reachable from HEAD (injected at build time)
3. Hard-coded fallback: `beta-v0.2`

---

## Architecture

### Auth flow

1. User signs in with Google or Discord (Firebase Auth with OAuth providers)
2. `useUserRole` hook checks `VITE_ADMINS` env var and `invites` collection
3. Role is stored in Firestore `users/{uid}.role`
4. Unauthorized users see an access-denied screen (RestrictedAccess component)
5. Registration is gated by `VITE_ALLOW_OPEN_REGISTRATION` env var

### Bracket engine

All bracket logic lives in `src/utils/bracket.js`:
- `generateBracket` — Creates single or double elimination match trees
- `advanceBracket` — Advances winner/loser through the bracket after a match
- `computeRankings` — Post-tournament ranking with custom point support
- `swapPlayers` — Swap players between unfilled match slots
- `getMatchRoundName` — Human-readable round names

### Data model

**Tournament** (`tournaments/{id}`):
- `name`, `adminId`, `type` (single/double), `participants[]`
- `matches[]`, `started`, `published`, `completed`
- `rankScores[]` — custom points per finishing rank
- `scoresAssigned` — flag to prevent duplicate score assignment

**User** (`users/{userId}`):
- `email`, `name`, `role` (admin|tournament_admin|player), `score`, `provider` (google|discord|manual)
- Manually created players get `provider: "manual"` and `role: "player"`

**Invite** (`invites/{inviteId}`):
- `email`, `role`, `token`, `used`, `createdBy`
- Generic multi-use invites support `maxUses` and `expiresAt`

---

## CI/CD

GitHub Actions runs tests on every push via `.github/workflows/test.yml`. The workflow:
- Checks out the repo
- Installs dependencies with caching
- Runs `npm test` in `tfs-bracket/`

---

## Project Structure

```
tfs-bracket/
├── src/
│   ├── components/     # React components
│   ├── hooks/          # Custom hooks (useUserRole)
│   ├── utils/          # bracket.js, invite.js, user.js, logger.js
│   ├── test/           # Test files
│   ├── release-notes.json
│   ├── App.jsx         # Main app with routing
│   ├── App.css         # All styles
│   └── firebase.js     # Firebase initialization
├── firebase.json       # Firebase hosting config
├── firestore.rules     # Security rules
├── firestore.indexes.json
├── vite.config.js      # Vite config
├── DEV_CONTEXT.md      # Development context
├── .env.example        # Environment variable template
└── .github/workflows/  # CI configuration
```
