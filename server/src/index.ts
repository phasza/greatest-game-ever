import { createServer } from './server.ts'

const port = Number(process.env.PORT ?? 3000)
const { wss } = createServer(port)
wss.on('listening', () => console.log(`WebSocket server listening on ws://localhost:${port}`))
