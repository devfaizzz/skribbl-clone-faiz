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
##Live Deployment Link (Render)
Link: https://skribbl-clone-faiz.onrender.com/

why i choose railway, because I have multiple projects already deployed on render, and netlify.

The production server serves the built client and Socket.IO from one process on `PORT` (default `3001`). Deploy to Render or Railway using build command `npm run build` and start command `npm start`.

## Architecture

The React client owns the landing, lobby, game, and winner screens. A Node/Express server hosts Socket.IO and keeps in-memory `Room` state: participants, settings, rounds, active drawer, timer, strokes, word options, guesses, and scores.

Architecture overview

The frontend is made with React. It shows the home page, room lobby, drawing screen, chat, score list, and winner screen.

The backend uses Node.js, Express, and Socket.IO. It keeps the rooms, players, scores, rounds, selected word, timer, and drawing data in memory.

When a player creates a room, the server makes a room code. Other players use this code to join the same room.

Socket.IO keeps all players connected in real time. When the drawer moves the mouse on the canvas, the app sends the drawing points, color, and brush size to the server. The server sends the same drawing data to everyone in that room. All players then see the drawing at the same time.

The canvas uses small line strokes. Each stroke has a start point, end point, color, and brush size. The server also supports undo and clear. When undo or clear is used, the updated drawing is sent to all players.

At the start of each turn, the server selects word options for the drawer. The drawer chooses one word. Other players only see blank letters and hints.

Players type guesses in the chat box. The server checks the guess by removing extra spaces and comparing lowercase text. If the guess is correct, the player gets points and everyone sees that the player guessed correctly.

The server controls the timer and round flow. When time ends, or all players guess correctly, the round ends. The next player becomes the drawer. After all rounds are complete, the player with the highest score wins.

Code walkthrough readiness

I used React because it makes it easy to manage different screens and update the game screen when room data changes.

I used Socket.IO because the game needs instant updates. It is used for joining rooms, starting games, choosing words, drawing, undo, clear, chat messages, guesses, scores, timers, and game results.

The server has a Room class. It keeps all room data in one place. This includes players, settings, rounds, current drawer, words, drawing strokes, guesses, and timer.

The canvas uses pointer events. When the drawer presses and moves the mouse, the app creates line strokes. These strokes are drawn on the local canvas and sent through Socket.IO. Other connected players receive the strokes and draw them on their own canvas.

The server checks if the current player is allowed to draw before accepting drawing data. It also checks if a guess is correct before giving points.

The room settings include player count, round count, drawing time, word choices, and hints. The host creates the room and starts the game after players join.

The project can be deployed as one web service. Express serves the React build files, and the same server handles Socket.IO connections.

The server validates which socket may draw, selects word choices, checks normalized guesses, awards points, broadcasts chat messages, transitions turns, and produces the final leaderboard. Rooms support an invite code and configurable player count, rounds, and draw time.
