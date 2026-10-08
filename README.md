# Doodle Dash

A real-time multiplayer drawing and guessing game built for the skribbl.io clone assignment.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in two browser windows. Create a private room in one window, then enter its room code in the other. The Socket.IO server runs at `http://localhost:3001`.

## Production

```bash
npm run build
npm start
```

The production server serves the built client and Socket.IO from one process on `PORT` (default `3001`). Deploy to Render or Railway using build command `npm run build` and start command `npm start`.

## Architecture

The React client owns the landing, lobby, game, and winner screens. A Node/Express server hosts Socket.IO and keeps in-memory `Room` state: participants, settings, rounds, active drawer, timer, strokes, word options, guesses, and scores.

Canvas pointer movement produces compact line segments with position, colour, and brush width. The drawing client sends each segment through Socket.IO; the room broadcasts it to viewers, who render the same segment to their canvas. Clear and undo replace the shared stroke list.

The server validates which socket may draw, selects word choices, checks normalized guesses, awards points, broadcasts chat messages, transitions turns, and produces the final leaderboard. Rooms support an invite code and configurable player count, rounds, and draw time.
