import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { Pool } from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.get('/favicon.ico', (req, res) => res.status(204).end());

app.use(cors());
const httpServer = createServer(app);



// 1. Socket.IO Setup
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow all origins for testing
  }
});

// 2. PostgreSQL Setup
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // e.g., postgres://user:pass@localhost:5432/colordb
});

// Health Check & DB Test
app.get('/api/health', async (req, res) => {
  try {
    const dbRes = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', db: dbRes.rows[0].now });
  } catch (err) {
    res.status(500).json({ status: 'db error' });
  }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  socket.emit('server-ready', 'Connected to Game Server');
});

const PORT = 3000;
// CRITICAL: Listen on 0.0.0.0 for LAN visibility
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});