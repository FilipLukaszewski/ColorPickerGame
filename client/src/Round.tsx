import { useEffect, useRef, useState } from 'react';
import { HexColorPicker } from 'react-colorful';

interface RoundProps {
  roundNumber: number;
  totalRounds: number;
  colorToGuess: string;
  timerSeconds: number;
  username: string;
  onSubmit: (guess: string) => void;
}

const Round = ({ roundNumber, totalRounds, colorToGuess, timerSeconds, onSubmit }: RoundProps) => {
  const [revealed, setRevealed] = useState(true);
  const [guess, setGuess] = useState('#ffffff');
  const [timeLeft, setTimeLeft] = useState(timerSeconds);
  const [submitted, setSubmitted] = useState(false);

  // Refs so timer callbacks always read the latest values without stale closures
  const submittedRef = useRef(false);
  const guessRef = useRef(guess);

  useEffect(() => {
    guessRef.current = guess;
  }, [guess]);

  // Hide the target color after 3 seconds
  useEffect(() => {
    const revealTimer = setTimeout(() => setRevealed(false), 3000);
    return () => clearTimeout(revealTimer);
  }, []);

    useEffect(() => {
    if (submitted || timeLeft <= 0) return;

    const tick = setInterval(() => {
        setTimeLeft((t) => t - 1);
    }, 1000);

    return () => clearInterval(tick);
    }, [timeLeft, submitted]);

    useEffect(() => {
    if (timeLeft === 0 && !submittedRef.current) {
        submittedRef.current = true;
        setSubmitted(true);
        onSubmit(guessRef.current);
    }
    }, [timeLeft, onSubmit]);

  const handleSubmit = () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitted(true);
    onSubmit(guessRef.current);
  };

  return (
    <div>
      {/* Round counter */}
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 0.75rem' }}>
        Round <strong style={{ color: 'var(--text-main)' }}>{roundNumber}</strong> of {totalRounds}
      </p>

      {/* Target color swatch — hidden after 3 s */}
      <div
        className={`color-swatch${revealed ? '' : ' hidden'}`}
        style={revealed ? { backgroundColor: colorToGuess } : undefined}
        title={revealed ? 'Memorise this colour!' : 'Colour hidden — make your guess'}
      />

      {/* Countdown timer */}
      <div className={`timer${timeLeft <= 5 ? ' urgent' : ''}`}>
        {timeLeft}s
      </div>

      {/* Player's guess preview swatch */}
      <div
        className="color-swatch"
        style={{ backgroundColor: guess, height: '70px', marginBottom: '0.75rem' }}
        title="Your current guess"
      />

      {/* Native colour picker */}
      <div className="picker-container" style={{ marginBottom: '1rem' }}>
        <HexColorPicker
          color={guess}
          onChange={setGuess}
          style={{ 
            width: '100%', 
            pointerEvents: submitted ? 'none' : 'auto',
            opacity: submitted ? 0.6 : 1 
          }}
        />
      </div>

      {/* Submit button */}
      <button
        className="btn-join"
        onClick={handleSubmit}
        disabled={submitted}
        style={{ width: '100%', opacity: submitted ? 0.5 : 1 }}
      >
        {submitted ? '✓ Submitted' : 'Submit Guess'}
      </button>
    </div>
  );
};

export default Round;