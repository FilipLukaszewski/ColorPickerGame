import { useParams } from 'react-router-dom';
import './App.css';

const Game = () => {
  const { roomId } = useParams();

  return (
    <div className="game-container">
      <h1 style={{ marginBottom: '1rem', fontSize: '2rem' }}>Game Room</h1>
      <div className="message-box" style={{ marginBottom: '1rem' }}>
        Room ID: <strong>{roomId}</strong>
      </div>
      <p style={{ opacity: 0.6, fontSize: '0.9rem' }}>
        Game not yet implemented. Both players have connected successfully.
      </p>
    </div>
  );
};

export default Game;