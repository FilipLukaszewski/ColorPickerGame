import { Router, Request, Response } from 'express';

const router = Router();

// GET /home
router.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'success',
    message: 'Welcome to the Game Lobby!',
    instructions: 'Use /game to start a session.'
  });
});

export default router;