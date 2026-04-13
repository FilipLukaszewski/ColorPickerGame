import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { Pool } from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config();

const app = express();

app.get('/favicon.ico', (req, res) => res.status(204).end());

app.use(cors());
app.use(express.json());

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ── Lobby state ───────────────────────────────────────────────────────────────

const waitingPlayers: string[] = [];
const socketUserMap = new Map<string, string>();

// ── In-memory game room state ─────────────────────────────────────────────────

interface GameRoom {
  gameId: number;
  players: {
    socketId: string;
    username: string;
    guess: string | null; // null until submitted
  }[];
  currentRound: number;
  totalRounds: number;
  colorToGuess: string;
  timer: ReturnType<typeof setTimeout> | null;
  processing: boolean; // guard against double processRound calls
}

const gameRooms = new Map<string, GameRoom>();

const TOTAL_ROUNDS = 5;
const TIMER_SECONDS = 15;

// ── Utility functions ─────────────────────────────────────────────────────────

function randomHexColor(): string {
  // padStart ensures lowercase zero-padded 6-digit hex — fits VARCHAR(7)
  return '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
}

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function scoreGuess(target: string, guess: string): number {
  const [r1, g1, b1] = hexToRgb(target);
  const [r2, g2, b2] = hexToRgb(guess);
  const distance = Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
  const normalizedDiff = distance / 441.67;
  const scoreFactor = Math.pow(1 - normalizedDiff, 3);
  const finalScore = Math.round(scoreFactor * 1000);
  return Math.max(0, finalScore);
}

// ── Game round helpers ────────────────────────────────────────────────────────

async function startRound(roomId: string, room: GameRoom): Promise<void> {
  room.colorToGuess = randomHexColor();
  room.processing = false;
  room.players.forEach((p) => (p.guess = null));

  await pool.query(
    'UPDATE game SET current_round = $1, color_to_guess = $2 WHERE id = $3',
    [room.currentRound, room.colorToGuess, room.gameId]
  );

  io.to(roomId).emit('round-start', {
    roundNumber: room.currentRound,
    totalRounds: room.totalRounds,
    colorToGuess: room.colorToGuess,
    timerSeconds: TIMER_SECONDS,
  });

  room.timer = setTimeout(async () => {
    room.players.forEach((p) => {
      if (p.guess === null) p.guess = '#000000'; 
    });
    await processRound(roomId, room);
  }, (TIMER_SECONDS + 2) * 1000);
}

async function processRound(roomId: string, room: GameRoom): Promise<void> {
  // Guard: prevent double execution if both players submit at the exact same tick
  if (room.processing) return;
  room.processing = true;

  // Clear server timer if it hasn't fired yet (early submission path)
  if (room.timer) {
    clearTimeout(room.timer);
    room.timer = null;
  }

  const results = room.players.map((p) => ({
    username: p.username,
    guess: p.guess!,
    pointsEarned: scoreGuess(room.colorToGuess, p.guess!),
  }));

  // Persist points to DB
  for (const result of results) {
    await pool.query(
      'UPDATE game_players SET points = points + $1 WHERE game_id = $2 AND username = $3',
      [result.pointsEarned, room.gameId, result.username]
    );
  }

  const scoresResult = await pool.query(
    'SELECT username, points FROM game_players WHERE game_id = $1 ORDER BY points DESC',
    [room.gameId]
  );
  const scores: { username: string; points: number }[] = scoresResult.rows;

  io.to(roomId).emit('round-result', { results, scores });

  if (room.currentRound >= room.totalRounds) {
    // ── Final round: end the game ─────────────────────────────────────────────
    await pool.query("UPDATE game SET status = 'finished' WHERE id = $1", [room.gameId]);
    if (!scores[0]) return;
    const winner = scores[0].username; // already sorted DESC
    io.to(roomId).emit('game-over', { scores, winner });
    gameRooms.delete(roomId);
  } else {
    // ── More rounds: advance and start the next one after a short delay ───────
    room.currentRound++;
    // 3-second pause so clients can display the result overlay before round-start fires
    setTimeout(() => {
      if (gameRooms.has(roomId)) {
        startRound(roomId, room).catch(console.error);
      }
    }, 3000);
  }
}

// ── HTTP endpoints ────────────────────────────────────────────────────────────

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (err) {
    console.error('DATABASE CONNECTION ERROR:', err);
    res.status(500).json({ status: 'error', message: 'Database unreachable' });
  }
});

app.post('/delete', async (req, res) => {
  try {
    await pool.query('DELETE FROM players');
    console.log('Database has been reset.');
    res.json({ status: 'cleared' });
  } catch (err) {
    console.log('Issue during database reset: ', err);
    res.status(500).json({ status: 'error' });
  }
});

// ── Socket.IO ─────────────────────────────────────────────────────────────────

io.on('connection', async (socket) => {
  console.log('User connected:', socket.id);
  socket.emit('server-ready', 'Connected to Game Server');

  const result = await pool.query('SELECT username FROM players');
  socket.emit('player-list', result.rows);

  // ── Disconnect ──────────────────────────────────────────────────────────────
  socket.on('disconnect', async () => {
    // Remove from lobby queue if still waiting
    const index = waitingPlayers.indexOf(socket.id);
    if (index !== -1) waitingPlayers.splice(index, 1);

    // Remove from lobby player list
    const username = socketUserMap.get(socket.id);
    if (username) {
      await pool.query('DELETE FROM players WHERE username = $1', [username]);
      io.emit('player-left', { username });
      socketUserMap.delete(socket.id);
    }

    // Clean up any active game room containing this socket
    for (const [roomId, room] of gameRooms.entries()) {
      const idx = room.players.findIndex((p) => p.socketId === socket.id);
      if (idx !== -1) {
        const disconnectedSocketId = socket.id;

        // 3-second grace period for network blips or React Strict Mode remounts
        setTimeout(() => {
          const currentRoom = gameRooms.get(roomId);
          if (!currentRoom) return;

          // If the socketId hasn't been updated, they haven't reconnected
          if (!currentRoom.players[idx]) return;
          if (currentRoom.players[idx].socketId === disconnectedSocketId) {
            if (currentRoom.timer) clearTimeout(currentRoom.timer);

            const other = currentRoom.players.find((_, i) => i !== idx);
            if (other) {
              io.to(other.socketId).emit('game-error', 'Your opponent disconnected. The game has ended.');
            }

            gameRooms.delete(roomId);
            console.log(`Game room ${roomId} deleted due to disconnection.`);
          }
        }, 3000); 

        break;
      }
    }
  });

  // ── Lobby: join queue ───────────────────────────────────────────────────────
  socket.on('join-queue', async (username: string) => {
    if (!username?.trim()) {
      socket.emit('join-error', 'Invalid username');
      return;
    }
    const existing = await pool.query('SELECT id FROM players WHERE username = $1', [username]);
    if (existing.rows.length > 0) {
      socket.emit('join-error', 'Username already taken');
      return;
    }
    try {
      const result = await pool.query(
        'INSERT INTO players (username) VALUES ($1) RETURNING id, username',
        [username]
      );
      const newPlayer = result.rows[0];

      socketUserMap.set(socket.id, username);
      socket.join('waiting-room');
      waitingPlayers.push(socket.id);

      io.emit('player-joined', newPlayer);

      if (waitingPlayers.length >= 2) {
        const [p1, p2] = waitingPlayers.splice(0, 2);
        if (!p1 || !p2) {
          if (p1) waitingPlayers.unshift(p1);
          if (p2) waitingPlayers.unshift(p2);
          return;
        }

        const roomId = randomUUID();
        const u1 = socketUserMap.get(p1);
        const u2 = socketUserMap.get(p2);

        if (u1) {
          await pool.query('DELETE FROM players WHERE username = $1', [u1]);
          io.emit('player-left', { username: u1 });
        }
        if (u2) {
          await pool.query('DELETE FROM players WHERE username = $1', [u2]);
          io.emit('player-left', { username: u2 });
        }
        socketUserMap.delete(p1);
        socketUserMap.delete(p2);

        
        io.to(p1).emit('start-game', { roomId });
        io.to(p2).emit('start-game', { roomId });
      }
    } catch (err) {
      socket.emit('join-error', 'Failed to join game');
      console.error(err);
    }
  });

  // ── Game: player signals they have arrived at /game/:roomId ────────────────
socket.on('player-ready', async ({ roomId, username }: { roomId: string; username: string }) => {
    // 1. Validation: Don't allow "Unknown" to start games
    if (!username || username === 'Unknown') {
      socket.emit('game-error', 'Invalid username. Please rejoin from the lobby.');
      return;
    }

    socket.join(roomId);

    if (!gameRooms.has(roomId)) {
      gameRooms.set(roomId, {
        gameId: 0,
        players: [],
        currentRound: 1,
        totalRounds: TOTAL_ROUNDS,
        colorToGuess: '',
        timer: null,
        processing: false,
      });
    }

    const room = gameRooms.get(roomId)!;

    // 2. Identify by socket.id OR username to prevent the "Unknown" collision
    const existingPlayerIndex = room.players.findIndex((p) => p.username === username);
    
    if (existingPlayerIndex === -1) {
      if (room.players.length < 2) {
        room.players.push({ socketId: socket.id, username, guess: null });
      } else {
        socket.emit('game-error', 'This room is already full.');
        return;
      }
    } else {
      // Update socket ID for reconnection
      if (!room.players[existingPlayerIndex]) return;
      room.players[existingPlayerIndex].socketId = socket.id;
    }

    console.log(`User ${username} (${socket.id}) ready in room ${roomId}. Players: ${room.players.length}/2`);

    // Both players present — create DB records and start the first round
    if (room.players.length === 2) {
      if (room.gameId === 0) {
        // First time starting the game
        try {
          const gameResult = await pool.query(
            "INSERT INTO game (number_of_rounds, current_round, color_to_guess, status) VALUES ($1, 1, '', 'in_progress') RETURNING id",
            [TOTAL_ROUNDS]
          );
          room.gameId = gameResult.rows[0].id;

          for (const player of room.players) {
            await pool.query(
              'INSERT INTO game_players (game_id, username) VALUES ($1, $2)',
              [room.gameId, player.username]
            );
          }

          await startRound(roomId, room);
        } catch (err) {
          console.error('Error starting game:', err);
          io.to(roomId).emit('game-error', 'Failed to start game. Please try again.');
          gameRooms.delete(roomId);
        }
      } else {
        // This is a reconnect. Resync the UI for the rejoining player.
        socket.emit('round-start', {
          roundNumber: room.currentRound,
          totalRounds: room.totalRounds,
          colorToGuess: room.colorToGuess,
          timerSeconds: TIMER_SECONDS, // UI will restart timer, but it keeps the game flowing
        });
      }
    }
  });

  // ── Game: player submits their colour guess ────────────────────────────────
  socket.on(
    'submit-guess',
    async ({ roomId, username, guess }: { roomId: string; username: string; guess: string }) => {
      const room = gameRooms.get(roomId);
      if (!room) return;

      const player = room.players.find((p) => p.username === username);
      if (!player) return;

      // Ignore duplicate submissions (button mash / network retry)
      if (player.guess !== null) return;

      player.guess = guess;
      console.log(`submit-guess: ${username} → ${guess} (round ${room.currentRound})`);

      // Process as soon as both players have submitted
      const allIn = room.players.every((p) => p.guess !== null);
      if (allIn) {
        await processRound(roomId, room).catch(console.error);
      }
    }
  );
});

// ── Start server ──────────────────────────────────────────────────────────────

const PORT = 3000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});