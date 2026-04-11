import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';

// Use the Host's LAN IP here!
const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const socket = io(BACKEND_URL);

console.log("Connecting to:", import.meta.env.VITE_API_URL);

function App() {
  const [status, setStatus] = useState('Connecting...');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/api/health`);
        setStatus(`Server & DB: ${res.data.status}`);
      } catch (err) {
        setStatus('Server Offline or DB Error');
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
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Color Guessing Game</h1>
      <p>Status: {status}</p>
      <p>Socket Message: {msg}</p>
    </div>
  );
}
export default App