import { useEffect, useRef, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import Round from './Round';
import './App.css';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ── Payload types matching server events ──────────────────────────────────────

interface RoundStartPayload {
  roundNumber: number;
  totalRounds: number;
  colorToGuess: string;
  timerSeconds: number;
}

interface RoundResultEntry {
  username: string;
  guess: string;
  pointsEarned: number;
}

interface ScoreEntry {
  username: string;
  points: number;
}

interface RoundResultPayload {
  results: RoundResultEntry[];
  scores: ScoreEntry[];
}

interface GameOverPayload {
  scores: ScoreEntry[];
  winner: string;
}

type GamePhase = 'waiting' | 'round' | 'result' | 'finished';

// ─────────────────────────────────────────────────────────────────────────────

function Game() {
  const { roomId } = useParams<{ roomId: string }>();
  const location = useLocation();

  // Username is passed via navigation state from Home.tsx.
  // Falls back to localStorage as a safety net (e.g. page refresh).
  const username: string =
    (location.state as { username?: string })?.username ||
    localStorage.getItem('username') ||
    'Unknown';

  const [phase, setPhase] = useState<GamePhase>('waiting');
  const [roundData, setRoundData] = useState<RoundStartPayload | null>(null);
  const [resultData, setResultData] = useState<RoundResultPayload | null>(null);
  const [finalData, setFinalData] = useState<GameOverPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<ReturnType<typeof io> | null>(null);

  useEffect(() => {
    const socket = io(BACKEND_URL);
    socketRef.current = socket;

    // Emit player-ready as soon as the socket connects
    socket.on('connect', () => {
      socket.emit('player-ready', { roomId, username });
    });

    socket.on('round-start', (data: RoundStartPayload) => {
      setRoundData(data);
      setResultData(null); // clear previous result
      setPhase('round');
    });

    socket.on('round-result', (data: RoundResultPayload) => {
      setResultData(data);
      setPhase('result');
    });

    socket.on('game-over', (data: GameOverPayload) => {
      setFinalData(data);
      setPhase('finished');
    });

    socket.on('game-error', (msg: string) => {
      setError(msg);
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId, username]);

  const handleSubmit = (guess: string) => {
    socketRef.current?.emit('submit-guess', { roomId, username, guess });
  };

  // ── Error screen ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="game-container">
        <h2 style={{ color: '#f87171', marginBottom: '1rem' }}>Game Error</h2>
        <div className="message-box">{error}</div>
      </div>
    );
  }

  // ── Waiting for opponent ────────────────────────────────────────────────────
  if (phase === 'waiting') {
    return (
      <div className="game-container">
        <h1 style={{ marginBottom: '1rem', fontSize: '2rem' }}>Game Room</h1>
        <div className="message-box" style={{ marginBottom: '1rem' }}>
          Room: <strong>{roomId}</strong>
        </div>
        <p style={{ opacity: 0.6, fontSize: '0.9rem', margin: 0 }}>
          Waiting for both players to connect…
        </p>
      </div>
    );
  }

  // ── Active round ────────────────────────────────────────────────────────────
  if (phase === 'round' && roundData) {
    return (
      <div className="game-container">
        <Round
          roundNumber={roundData.roundNumber}
          totalRounds={roundData.totalRounds}
          colorToGuess={roundData.colorToGuess}
          timerSeconds={roundData.timerSeconds}
          username={username}
          onSubmit={handleSubmit}
        />
      </div>
    );
  }

  // ── Round results ───────────────────────────────────────────────────────────
  if (phase === 'result' && resultData) {
    return (
      <div className="game-container">
        <h2 style={{ marginBottom: '0.25rem', fontSize: '1.4rem' }}>Round Results</h2>

        {/* Show the actual target colour */}
        {roundData && (
          <div
            className="color-swatch"
            style={{ backgroundColor: roundData.colorToGuess, height: '60px', marginTop: '0.75rem' }}
            title={`Target: ${roundData.colorToGuess}`}
          />
        )}

        <div className="result-overlay">
          {resultData.results.map((r) => (
            <div key={r.username} className="result-row">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <strong>{r.username}</strong>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      backgroundColor: r.guess,
                      border: '1px solid rgba(255,255,255,0.2)',
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.guess}</span>
                </div>
              </div>
              <strong style={{ color: 'var(--accent-color)', fontSize: '1.1rem' }}>
                +{r.pointsEarned} pts
              </strong>
            </div>
          ))}

          {/* Running totals */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '0.5rem 0.25rem',
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
            }}
          >
            {resultData.scores.map((s) => (
              <span key={s.username}>
                {s.username}: <strong style={{ color: 'var(--text-main)' }}>{s.points} pts</strong>
              </span>
            ))}
          </div>
        </div>

        <p style={{ opacity: 0.5, fontSize: '0.8rem', marginTop: '0.75rem', marginBottom: 0 }}>
          Next round starting soon…
        </p>
      </div>
    );
  }

  // ── Game over ───────────────────────────────────────────────────────────────
  if (phase === 'finished' && finalData) {
    const isWinner = finalData.winner === username;
    return (
      <div className="game-container">
        <div className="winner-banner">
          {isWinner ? '${finalData.winner} wins!`}
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Final Scores
        </p>
        <div className="result-overlay">
          {finalData.scores
            .slice()
            .sort((a, b) => b.points - a.points)
            .map((s) => (
              <div key={s.username} className="result-row">
                <strong style={s.username === username ? { color: 'var(--accent-color)' } : {}}>
                  {s.username} {s.username === username ? '(you)' : ''}
                </strong>
                <strong style={{ color: 'var(--accent-color)', fontSize: '1.1rem' }}>
                  {s.points} pts
                </strong>
              </div>
            ))}
        </div>
      </div>
    );
  }

  return null;
};

export default Game;
