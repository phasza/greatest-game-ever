# Server

WebSocket room server (create / join / leave / disconnect) implementing the contract in the root README.

Requires the Node version in `.nvmrc`.

```sh
npm install
npm run dev     # node --watch, restarts on change
npm start       # run once
npm test        # vitest (unit + integration)
npm run lint && npm run typecheck
```

Listens on `PORT` (default `3000`), i.e. `ws://localhost:3000`.
Error codes: `ROOM_NOT_FOUND`, `ROOM_FULL`, plus `INVALID_NAME`, `ALREADY_IN_ROOM`, `INVALID_MESSAGE`, `UNKNOWN_TYPE`.
Out of scope for now: gameStarted, actions, timer.
