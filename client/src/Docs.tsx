const Docs = () => {
  return (
    <div className="game-container docs-container">
      <h1>Project Documentation</h1>
      <p>
        <strong>Color guessr</strong> is a real-time multiplayer competition where players 
        test their color perception against others over a local network.
      </p>

      <div className="message-box" style={{ textAlign: 'left', borderStyle: 'solid', marginTop: '1.5rem' }}>
        <strong>Project Goal:</strong> To demonstrate a full-stack integration of 
        Relational Databases (PostgreSQL), Bidirectional Communication (Socket.io), 
        and a Modern Frontend (React + TS).
      </div>

      <h2>How the Game Works</h2>
      <ul>
        <li><strong>Lobby System:</strong> Players enter a username and either create a host lobby or join an existing one via the host's IP address.</li>
        <li><strong>The Flash:</strong> A random color is displayed for <strong>3 seconds</strong> before vanishing.</li>
        <li><strong>The Guess:</strong> Players use RGB sliders/inputs to recreate the color they saw.</li>
        <li><strong>Scoring:</strong> The server calculates the "Euclidean distance" between the guess and the actual color. The closer player wins the round.</li>
        <li><strong>Victory:</strong> The first player to win the majority of <strong>5 rounds</strong> is declared the winner.</li>
      </ul>

      <h2>Technologies Used</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', color: 'var(--text-muted)' }}>
        <div>• <strong>Frontend:</strong> React 18, TypeScript, Vite</div>
        <div>• <strong>Styling:</strong> CSS3 (Modern Glassmorphism)</div>
        <div>• <strong>Backend:</strong> Node.js, Express</div>
        <div>• <strong>Real-time:</strong> Socket.io</div>
        <div>• <strong>Database:</strong> PostgreSQL</div>
        <div>• <strong>Routing:</strong> React Router v6</div>
      </div>

      <h2>Database Architecture</h2>
      <p>Our PostgreSQL schema is designed for speed and consistency:</p>
      <ul>
        <li><code>players</code>: Stores <code>id</code>, <code>username</code>, and session timestamps.</li>
        <li><code>game</code>: Tracks lobby status, <code>player_ids</code>, current round number, hex codes for the rounds, and final <code>winner_id</code>.</li>
      </ul>

      <h2>API Endpoints</h2>
      <p>While most gameplay happens over Sockets, the initial setup uses a RESTful API:</p>
      
      <div className="api-section">
        <pre><code>{`GET  /api/health       - Check Server & DB connectivity
POST /api/players      - Register a new username
GET  /api/games/:id    - Fetch historical game data
POST /api/games        - Initialize a new game session`}</code></pre>
      </div>

      <h2>Socket.io Events</h2>
      <p>The core game engine relies on these real-time events:</p>
      <ul>
        <li><code>join-lobby</code>: Connects the guest to the host.</li>
        <li><code>start-round</code>: Triggered by the server to show the color.</li>
        <li><code>submit-guess</code>: Sends RGB values to the server for comparison.</li>
        <li><code>game-over</code>: Broadcasts the final winner to both clients.</li>
      </ul>
    </div>
  );
};

export default Docs;
