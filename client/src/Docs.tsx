const Docs = () => {
  return (
    <div className="game-container docs-container">
      <h1>Project Documentation</h1>
      <p>
        <strong>Color Guessr</strong> is a real-time 1v1 multiplayer game where two players 
        test their color memory against each other. Players are automatically matched via a 
        matchmaking queue — no manual room codes needed.
      </p>

      <div className="message-box" style={{ textAlign: 'left', borderStyle: 'solid', marginTop: '1.5rem' }}>
        <strong>Project Goal:</strong> To demonstrate a full-stack integration of 
        Relational Databases (PostgreSQL), Bidirectional Communication (Socket.io), 
        and a Modern Frontend (React + TypeScript).
      </div>

      <h2>How the Game Works</h2>
      <ul>
        <li><strong>Matchmaking Queue:</strong> Players enter a username and click Join. The server automatically pairs the first two players in the queue and redirects both to a shared game room.</li>
        <li><strong>The Flash:</strong> A randomly generated hex color is displayed for <strong>3 seconds</strong> before vanishing.</li>
        <li><strong>The Guess:</strong> Players use a <strong>color picker</strong> to recreate the hex color they saw from memory.</li>
        <li><strong>Scoring:</strong> The server calculates the Euclidean distance in RGB space between each guess and the actual color. Closer guesses score more points (up to 1000 per round).</li>
        <li><strong>Rounds:</strong> The game lasts <strong>5 rounds</strong>. After all rounds, the player with the most total points is declared the winner.</li>
      </ul>

      <h2>Technologies Used</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', color: 'var(--text-muted)' }}>
        <div>• <strong>Frontend:</strong> React 18, TypeScript, Vite</div>
        <div>• <strong>Color Picker:</strong> react-colorful</div>
        <div>• <strong>Backend:</strong> Node.js, Express</div>
        <div>• <strong>Real-time:</strong> Socket.io</div>
        <div>• <strong>Database:</strong> PostgreSQL (via node-postgres)</div>
        <div>• <strong>Routing:</strong> React Router v6</div>
        <div>• <strong>HTTP Client:</strong> Axios</div>
        <div>• <strong>Styling:</strong> CSS3</div>
      </div>

      <h2>Database Architecture</h2>
      <p>The PostgreSQL schema uses three tables:</p>
      <ul>
        <li><code>players</code>: Temporarily stores <code>id</code> and <code>username</code> of players currently in the waiting queue. Entries are removed once a match is found or the player disconnects.</li>
        <li><code>game</code>: Tracks each game session — <code>number_of_rounds</code>, <code>current_round</code>, the active <code>color_to_guess</code> (hex string), and <code>status</code> (<code>'in_progress'</code> or <code>'finished'</code>).</li>
        <li><code>game_players</code>: Links usernames to a game session and accumulates their <code>points</code> across rounds.</li>
      </ul>

      <h2>Scoring Formula</h2>
      <p>Points per round are calculated using the Euclidean distance in RGB space:</p>
      <div className="api-section">
        <pre><code>{`distance  = sqrt((R1-R2)² + (G1-G2)² + (B1-B2)²)
score     = max(0, round((1 - distance / 441.67)³ × 1000))

Example:
  Target: #c85028  →  rgb(200, 80, 40)
  Guess:  #be4637  →  rgb(190, 70, 55)
  Distance ≈ 18.7  →  Score ≈ 997 pts`}</code></pre>
      </div>

      <h2>API Endpoints</h2>
      <p>Two HTTP endpoints are exposed for health checking and admin use:</p>
      <div className="api-section">
        <pre><code>{`GET  /api/health  - Checks server and PostgreSQL connectivity
POST /delete      - Clears the players table (dev/reset utility)`}</code></pre>
      </div>

      <h2>Socket.io Events</h2>
      <p>All gameplay is driven by Socket.io. Below is the full event contract:</p>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.5rem 0 0.25rem' }}>Client → Server</p>
      <ul>
        <li><code>join-queue (username)</code>: Registers the player and adds them to the matchmaking queue. Emits <code>start-game</code> to both players once two are queued.</li>
        <li><code>player-ready {'{ roomId, username }'}</code>: Sent when a player arrives at the game route. Starts the first round once both players have emitted this.</li>
        <li><code>submit-guess {'{ roomId, username, guess }'}</code>: Sends the player's hex color guess to the server. The round is processed once both players have submitted.</li>
      </ul>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.75rem 0 0.25rem' }}>Server → Client</p>
      <ul>
        <li><code>server-ready</code>: Confirmation message sent on connection.</li>
        <li><code>player-list</code>: Sends the current waiting-room player list to a newly connected client.</li>
        <li><code>player-joined {'{ username }'}</code>: Broadcast when a new player joins the queue.</li>
        <li><code>player-left {'{ username }'}</code>: Broadcast when a player disconnects or a match is found.</li>
        <li><code>start-game {'{ roomId }'}</code>: Sent to both matched players with their shared room UUID.</li>
        <li><code>round-start {'{ roundNumber, totalRounds, colorToGuess, timerSeconds }'}</code>: Signals the start of a round, including the target hex color and timer duration.</li>
        <li><code>round-result {'{ results, scores }'}</code>: Sent after both guesses are processed, with per-player points earned and running totals.</li>
        <li><code>game-over {'{ scores, winner }'}</code>: Broadcast after the final round with sorted final scores and the winner's username.</li>
        <li><code>join-error (message)</code>: Emitted if a username is already taken or invalid.</li>
        <li><code>game-error (message)</code>: Emitted on game-level errors (e.g. opponent disconnected, room already full).</li>
      </ul>
    </div>
  );
};

export default Docs;
