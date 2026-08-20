# Dots & Boxes

Modern multiplayer **Dots and Boxes** — React, TypeScript, Tailwind CSS. Local pass & play (2–8) or online lobbies via Firebase Realtime Database. Deploy on Vercel.

## Features

- **2–8 human players** (no AI)
- Grid size **5×5 to 16×16 dots**
- Local pass & play on one device
- Online: host creates a lobby, shares a 6-character code
- Bonus turns and chain-reaction box claims
- Web Audio sound effects (no external assets)
- Touch-friendly line targets

## Quick start (local play)

```bash
npm install
npm run dev
```

Open the URL Vite prints. **Local Pass & Play** works with no Firebase setup.

## Online multiplayer (Firebase)

1. Create a Firebase project and enable **Anonymous Authentication**.
2. Create a **Realtime Database** (start in locked mode, then deploy rules below).
3. Copy web app config into `.env` (see `.env.example`):

```bash
cp .env.example .env
```

Fill:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_DATABASE_URL`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

4. Deploy security rules:

```bash
# with Firebase CLI
firebase deploy --only database
```

Or paste [`database.rules.json`](./database.rules.json) in the Firebase console → Realtime Database → Rules.

5. Restart `npm run dev` so Vite picks up env vars.

## Deploy to Vercel

1. Push the repo and import the project in Vercel.
2. Framework preset: **Vite**. Build: `npm run build`. Output: `dist`.
3. Add the same `VITE_FIREBASE_*` variables in Project Settings → Environment Variables.
4. Redeploy.

`vercel.json` rewrites all routes to `index.html` for the SPA.

## Scripts

| Command        | Description              |
|----------------|--------------------------|
| `npm run dev`  | Development server       |
| `npm run build`| Typecheck + production   |
| `npm run preview` | Preview production build |

## Project layout

```
src/
  engine/       Pure game rules (shared by local + online)
  audio/        Web Audio SFX
  components/   UI
  hooks/        useLocalGame, useOnlineLobby
  firebase/     Config + lobby API
  types/        Shared types
```

## Security notes

- Players sign in with **Firebase Anonymous Auth**.
- Lobby access is gated by knowing the join code; rules require auth and validate settings ranges.
- Moves are applied with transactions (turn + moveCount checks) on the client; rules validate structure. Full server-side move validation is limited in RTDB rules — treat this as casual multiplayer, not tournament-grade anti-cheat.
