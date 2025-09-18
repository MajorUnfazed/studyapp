# Pomodoro – Focus Timer with Analytics

A lightweight, accurate Pomodoro timer with long breaks, stats, achievements, and offline‑first support. Client is React + Vite, backend is Express + SQLite.

## Highlights
- Drift‑resistant timer (end‑time scheduling) with a Web Worker engine for accuracy under tab throttling.
- Work/Break/Long Break modes; configurable durations and long‑break cadence; handy presets (25/5, 50/10, 90/15).
- Auto‑start next interval, Skip (no XP), distraction‑free toggle, and keyboard shortcuts.
- Sounds + desktop notifications at boundaries.
- XP, levels, streaks, achievements; history (today, last 7 days) and a 120‑day heatmap.
- PWA offline‑first: precached UI, network‑first API GETs, queued POSTs with Background Sync.
- Backend health banner—timer keeps working even when the API is down.

## Getting started
Prerequisites: Node 18+

1) Install dependencies
- `npm install`

2) Run the client
- `npm run dev`
- Open the printed URL (e.g., http://localhost:5173/ or :5174)

3) Run the API server (in a separate terminal)
- `npm run start:server` (http://localhost:4000)

Common scripts
- `npm run build` – Build the client (generates PWA assets)
- `npm run preview` – Preview the production build

## PWA & offline behavior
- App shell is precached for instant loads and offline use.
- API GETs use network‑first with cache fallback; progress/achievements/history are cached locally for offline viewing.
- API POSTs (e.g., session‑complete, settings) are queued when offline and replay automatically when back online.
- A backend‑down banner appears if the API can’t be reached; you can keep timing sessions, and data will sync later.

## Data & persistence
- Client settings persist in localStorage.
- Server keeps session history in SQLite under `server/`.
- Duplicate protection: a unique index on `(started_at, ended_at)` prevents replayed POSTs from creating duplicates.

## Keyboard shortcuts
- Space – Start/Pause
- S – Skip current interval
- R – Reset
- A – Toggle auto‑start next
- D – Toggle distraction‑free

## Troubleshooting
- Vite port busy: It will auto‑select another port; use the URL shown in the console.
- API connection refused: Start the server; the banner will clear once healthy.
- Notifications blocked: Click Allow in the app and confirm browser/site settings.
- Audio restrictions: Interact with the page (e.g., click) before sounds will play in some browsers.

## Tech stack
- Frontend: React 18, Vite 5, Service Worker (vite‑plugin‑pwa)
- Backend: Express 4, better‑sqlite3 (SQLite)

## License
For personal/educational use. Adapt and extend as needed.
