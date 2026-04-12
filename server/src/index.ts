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
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const waitingPlayers: string[] = [];
const socketUserMap = new Map<string, string>();

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1'); 
    res.json({ status: 'ok' });
  } catch (err) {
    console.error("DATABASE CONNECTION ERROR:", err); 
    
    res.status(500).json({ status: 'error', message: 'Database unreachable' });
  }
});

app.post('/delete', async (req, res) => {
  try {
    await pool.query('DELETE FROM players')
    console.log('Database has been reset.')
    res.json({ status: 'cleared' });
  } catch (err) {
    console.log("Issue during database reset: ", err)
    res.status(500).json({ status: 'error' });
  }
})

io.on('connection', async (socket) => {
  console.log('User connected:', socket.id);
  socket.emit('server-ready', 'Connected to Game Server');

  const result = await pool.query('SELECT username FROM players');
  socket.emit('player-list', result.rows);

  socket.on('disconnect', async () => {
    const index = waitingPlayers.indexOf(socket.id);
    if (index !== -1) {
      waitingPlayers.splice(index, 1);
    }

    const username = socketUserMap.get(socket.id);
    if (username) {
      await pool.query('DELETE FROM players WHERE username = $1', [username]);
      io.emit('player-left', { username });
      socketUserMap.delete(socket.id);
    }
  });

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
        setTimeout(() => {
          io.to(p1).emit('start-game', { roomId });
          io.to(p2).emit('start-game', { roomId });
        }, 5000);
      }
    } catch (err) {
      socket.emit('join-error', 'Failed to join game');
      console.error(err);
    }

    
  });
});

const PORT = 3000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});