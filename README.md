# Distance Challenges Tracker (Electron)

Track multi-sport distance challenges and pacing (e.g., 1315 km in 96 days).

## Features
- Multiple challenges at once (running, cycling, or any sport).
- Calculates:
  - Total days, days left
  - Average per day to hit the goal (overall and from today)
  - Your current pace (km/day)
  - Projected finish date at your current pace
- Fast logging UI, recent logs per challenge
- Local storage on your machine via `electron-store`

## Run locally
```bash
cd distance-challenges-electron
npm install
npm start
```

> Requires Node 18+

## Example challenge
- Target: 1315 km
- Window: 96 days
The app will show the overall average required per day (1315/96 ≈ 13.70 km/day), your current pace based on logged days, and how much per day you need from **today** to still finish on time.

## Project structure
```
.
├─ main.js          # Electron main process + IPC + persistence (electron-store)
├─ preload.js       # Safe bridge exposing APIs to the renderer
├─ renderer/
│  ├─ index.html
│  ├─ styles.css
│  └─ renderer.js
└─ package.json
```

## Data
All data is stored locally (per user) by `electron-store` in a JSON file under the OS's app data directory.

## Notes
- This is intentionally dependency-light and doesn't require a bundler.
- If you later want charts, packaging, or cloud sync, we can extend this.
