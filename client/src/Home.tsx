import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import './App.css';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const Home = () => {
  const [status, setStatus] = useState('Connecting...');
  const [msg, setMsg] = useState('Waiting for server heartbeat...');

  const [input, setInput] = useState('')
  const [users, setUsers] = useState<any[]>([]) 
  const [joined, setJoined] = useState(false)

  const socketRef = useRef<ReturnType<typeof io> | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    const socket = io(BACKEND_URL);
    socketRef.current = socket;

    axios.get(`${BACKEND_URL}/api/health`)
    .then(() => setStatus('Online'))
    .catch(() => setStatus('Offline'));

    socket.on('connect', () => console.log('Connected:', socket.id));
    socket.on('server-ready', (data) => setMsg(data));
    socket.on('connect_error', (err) => console.error('Socket Error:', err.message));
    socket.on('player-list', (existingPlayers) => setUsers(existingPlayers));
    socket.on('player-joined', (newPlayer) => setUsers((prev) => [...prev, newPlayer]));
    socket.on('player-left', ({ username }) => setUsers((prev) => prev.filter((u) => u.username !== username)));
    socket.on('join-error', (msg) => {
      alert(msg);
      setJoined(false);
    });
    socket.on('start-game', ({ roomId }) => {
      setJoined(true);
      navigate(`/game/${roomId}`);
    });

    return () => {
      socket.disconnect();
    };
  }, [navigate]);

  const joinWaitingRoom = () => {
    if (!input.trim() || !socketRef.current) return;
    setJoined(true);
    socketRef.current.emit('join-queue', input.trim());
  };

  return (
    <div className="game-container">
      <div className="server-row">
        <div className={`status-badge ${status === 'Connecting...' ? 'connecting' : ''}`}>
          ● {status}
        </div>
        <div className="message-box">
          {msg}
        </div>
      </div>

      <div className="player-list">
        {users.length > 0 ? (
          users.map((user, index) => (
            <div key={index} className="player-tag">
              {user.username}
            </div>
          ))
        ) : (
          <span className="player-status-text" style={{ fontSize: '0.9rem' }}>
            Waiting for players to join...
          </span>
        )}
      </div>
      
      <h1 style={{ marginTop: '0', marginBottom: '1.5rem', fontSize: '2rem' }}>
        Start Guessing
      </h1>

      <div className="input-group">
        <input 
          type="text" 
          className="game-input"
          placeholder="Username"
          value={input} 
          onChange={(e) => setInput(e.target.value)}
        />
        <button className="btn-join" onClick={joinWaitingRoom} disabled={joined}>
          Join
        </button>
      </div>
    </div>
  );
};

export default Home;
