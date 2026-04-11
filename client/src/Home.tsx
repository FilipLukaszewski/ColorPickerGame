import { useEffect, useState } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import './App.css';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const socket = io(BACKEND_URL);

const Home = () => {
  const [status, setStatus] = useState('Connecting...');
  const [msg, setMsg] = useState('Waiting for server heartbeat...');
  const [usernameInput, setUsernameInput] = useState('');
  const [verifiedJoinedUsersList, setVerifiedJoinedUsersList] = useState<any[]>([]);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/api/health`);
        setStatus(`Online`);
      } catch (err) {
        setStatus('Offline');
        console.error("Health check failed:", err);
      }
    };

    checkHealth();

    socket.on('connect', () => console.log('Connected:', socket.id));
    socket.on('server-ready', (data) => setMsg(data));
    socket.on('connect_error', (err) => console.error('Socket Error:', err.message));

    return () => {
      socket.off('connect');
      socket.off('server-ready');
      socket.off('connect_error');
    };
  }, []);

  const joinWaitingRoom = async () => {
    console.log("Joining room as:", usernameInput);
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
        {verifiedJoinedUsersList.length > 0 ? (
          verifiedJoinedUsersList.map((user, index) => (
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
          value={usernameInput} 
          onChange={(e) => setUsernameInput(e.target.value)}
        />
        <button className="btn-join" onClick={joinWaitingRoom}>
          Join
        </button>
      </div>
    </div>
  );
};

export default Home;
