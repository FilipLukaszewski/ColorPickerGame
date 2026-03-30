import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './db';
import homeRoutes from './routes/home';
import gameRoutes from './routes/game';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());               // allows the second player's machine to connect
app.use(express.json());       // parse JSON request bodies

// Routes
app.use('/home', homeRoutes);
app.use('/game', gameRoutes);

// Health check
app.get('/ping', (_req, res) => {
  res.json({ message: 'Server is alive!' });
});

// Boot — test DB connection first, then start listening
pool.connect()
  .then((client) => {
    client.release(); // ✅
    app.listen(PORT, '0.0.0.0', () => {  // 0.0.0.0 lets other machines on the LAN connect
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to connect to database:', err.message);
    process.exit(1);
  })