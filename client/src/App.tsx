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
    // 1. Test REST API
    axios.get(`${BACKEND_URL}/api/health`)
      .then(res => setStatus(`Server & DB: ${res.data.status}`))
      .catch(() => setStatus('Server Offline'));

    // 2. Test Socket.IO
    socket.on('server-ready', (data) => setMsg(data));

    return () => { socket.off('server-ready'); };
  }, []);

  useEffect(() => {
    // Listen for the initial connection
    socket.on('connect', () => {
      console.log('Connected to server with ID:', socket.id);
    });

    // THE MOST IMPORTANT ONE: Catch connection errors
    socket.on('connect_error', (err) => {
      console.error('Connection Error:', err.message);
      // If it says "xhr poll error", it's almost always a network/firewall block.
    });

    socket.on('disconnect', (reason) => {
      console.warn('Disconnected:', reason);
    });

    return () => {
      socket.off('connect');
      socket.off('connect_error');
      socket.off('disconnect');
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