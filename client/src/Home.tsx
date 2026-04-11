import { useEffect, useState } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import './App.css';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const socket = io(BACKEND_URL);

const Home = () => {
  const [status, setStatus] = useState('Connecting...');
  const [msg, setMsg] = useState('Waiting for server heartbeat...');

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/api/health`);
        setStatus(`Online`); // Cleaned up for the UI
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

  return (
    <div className="game-container">
      <div className={`status-badge ${status === 'Connecting...' ? 'connecting' : ''}`}>
        ● {status}
      </div>
      <h1>Start Guessing</h1>
      <div className="message-box">
        {msg}
      </div>
    </div>
  );
};

export default Home;
