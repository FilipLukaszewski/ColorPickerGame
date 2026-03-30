import { Router, Request, Response } from 'express';
import pool from '../db';

const router = Router();

// GET /game/status - Checks DB connection and game readiness
router.get('/status', async (req: Request, res: Response) => {
  try {
    // A simple query to check if the DB is responding
    const dbCheck = await pool.query('SELECT NOW()'); 
    
    res.json({
      gameServer: 'Online',
      database: 'Connected',
      serverTime: dbCheck.rows[0].now,
      info: 'Waiting for players to join via IP...'
    });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to reach the database.' 
    });
  }
});

// POST /game/join - Placeholder for when the second player joins
router.post('/join', (req: Request, res: Response) => {
  const { playerName } = req.body;
  res.json({
    message: `Player ${playerName} is attempting to join the host.`
  });
});

export default router;