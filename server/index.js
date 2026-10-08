import express from 'express'
import { createServer } from 'node:http'
import { Server } from 'socket.io'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, { cors: { origin: '*' } })
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
app.use(express.static(path.join(root, 'dist')))
app.get('*', (_, res) => res.sendFile(path.join(root, 'dist', 'index.html')))
const rooms = new Map()
const words = ['rainbow', 'guitar', 'volcano', 'butterfly', 'astronaut', 'pizza', 'castle', 'elephant', 'skateboard', 'lighthouse', 'watermelon', 'microphone']
const code = () => Math.random().toString(36).slice(2, 7).toUpperCase()
const pick = (count) => [...words].sort(() => Math.random() - .5).slice(0, count)

class Room {
  constructor(id, settings, host) {
    this.id = id
    this.settings = settings
    this.hostId = host.id
    this.players = [host]
    this.round = 0
    this.turn = 0
    this.phase = 'lobby'
    this.word = ''
    this.options = []
    this.strokes = []
    this.guessed = []
    this.timer = null
  }
  public() { return { id: this.id, settings: this.settings, hostId: this.hostId, players: this.players, round: this.round, turn: this.turn, phase: this.phase, word: this.phase === 'reveal' ? this.word : '', masked: this.masked(), strokes: this.strokes, guessed: this.guessed } }
  masked() { return this.word ? this.word.split('').map((letter, index) => index === 0 || (this.settings.hints && this.phase === 'playing' && index === Math.floor(this.word.length / 2)) ? letter.toUpperCase() : '_').join(' ') : '' }
  emit() { io.to(this.id).emit('room:update', this.public()) }
  beginTurn() {
    this.phase = 'choosing'
    this.strokes = []
    this.guessed = []
    this.options = pick(this.settings.wordCount)
    this.emit()
    io.to(this.players[this.turn].id).emit('word:options', this.options)
  }
  startRound() {
    this.phase = 'playing'
    this.emit()
    let remaining = this.settings.drawTime
    io.to(this.id).emit('timer', remaining)
    this.timer = setInterval(() => {
      remaining -= 1
      io.to(this.id).emit('timer', remaining)
      if (remaining <= 0) this.endTurn()
    }, 1000)
  }
  endTurn() {
    clearInterval(this.timer)
    this.phase = 'reveal'
    this.emit()
    io.to(this.id).emit('round:end', { word: this.word })
    setTimeout(() => {
      this.turn += 1
      if (this.turn >= this.players.length) { this.turn = 0; this.round += 1 }
      if (this.round >= this.settings.rounds) {
        this.phase = 'finished'
        this.emit()
        io.to(this.id).emit('game:over')
      } else this.beginTurn()
    }, 4000)
  }
}

io.on('connection', socket => {
  socket.on('room:create', ({ name, settings }) => {
    const id = code()
    const player = { id: socket.id, name: name.slice(0, 18), score: 0, color: '#7c5cff' }
    const room = new Room(id, settings, player)
    rooms.set(id, room)
    socket.join(id)
    socket.emit('room:joined', { room: room.public(), playerId: socket.id })
  })
  socket.on('room:join', ({ id, name }) => {
    const room = rooms.get(id?.toUpperCase())
    if (!room) return socket.emit('error:message', 'Room not found. Check your invite code.')
    if (room.players.length >= room.settings.maxPlayers) return socket.emit('error:message', 'This room is full.')
    const player = { id: socket.id, name: name.slice(0, 18), score: 0, color: ['#fc6a76','#3bcf92','#ffb12b','#53b9ff'][room.players.length % 4] }
    room.players.push(player); socket.join(room.id); socket.emit('room:joined', { room: room.public(), playerId: socket.id }); room.emit()
  })
  socket.on('game:start', ({ id }) => { const room = rooms.get(id); if (room?.hostId === socket.id && room.players.length > 1) { room.round = 0; room.turn = 0; room.beginTurn() } })
  socket.on('word:choose', ({ id, word }) => { const room = rooms.get(id); if (room?.players[room.turn]?.id === socket.id && room.options.includes(word)) { room.word = word; room.startRound() } })
  socket.on('canvas:stroke', ({ id, stroke }) => { const room = rooms.get(id); if (room?.phase === 'playing' && room.players[room.turn]?.id === socket.id) { room.strokes.push(stroke); socket.to(id).emit('canvas:stroke', stroke) } })
  socket.on('canvas:undo', ({ id }) => { const room = rooms.get(id); if (room?.players[room.turn]?.id === socket.id) { room.strokes.pop(); io.to(id).emit('canvas:replace', room.strokes) } })
  socket.on('canvas:clear', ({ id }) => { const room = rooms.get(id); if (room?.players[room.turn]?.id === socket.id) { room.strokes = []; io.to(id).emit('canvas:replace', []) } })
  socket.on('guess:send', ({ id, text }) => {
    const room = rooms.get(id); const player = room?.players.find(p => p.id === socket.id); if (!room || !player || room.phase !== 'playing') return
    const guess = text.trim(); const correct = socket.id !== room.players[room.turn].id && guess.toLowerCase() === room.word.toLowerCase() && !room.guessed.includes(socket.id)
    if (correct) { room.guessed.push(socket.id); player.score += Math.max(50, 120 - room.guessed.length * 15); io.to(id).emit('chat:message', { name: player.name, text: 'guessed the word!', correct: true }); room.emit(); if (room.guessed.length >= room.players.length - 1) room.endTurn() }
    else io.to(id).emit('chat:message', { name: player.name, text: guess, correct: false })
  })
  socket.on('disconnect', () => { for (const room of rooms.values()) { const index = room.players.findIndex(p => p.id === socket.id); if (index >= 0) { room.players.splice(index, 1); if (!room.players.length) { clearInterval(room.timer); rooms.delete(room.id) } else { if (room.hostId === socket.id) room.hostId = room.players[0].id; room.turn = Math.min(room.turn, room.players.length - 1); room.emit() } } } })
})

httpServer.listen(process.env.PORT || 3001)
