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


const io = new Server(httpServer, {
  cors: {
    origin: "*",
  }
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1'); 
    res.json({ status: 'ok' });
  } catch (err) {
    console.error("DATABASE CONNECTION ERROR:", err); 
    
    res.status(500).json({ status: 'error', message: 'Database unreachable' });
  }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  socket.emit('server-ready', 'Connected to Game Server');
});

const PORT = 3000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
