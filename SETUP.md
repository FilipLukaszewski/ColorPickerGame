# Local Setup Guide: Multiplayer Color Game

Welcome to the Color Guessing Game! This project uses a separated client-server architecture (Vite/React for the frontend, Node/Express/Socket.IO for the backend) and relies on PostgreSQL for data storage. 

Follow these steps to get the game running on your Local Area Network (LAN).

## 1. Clone and Install Dependencies

Since this project uses a monorepo-lite structure, you will need to install the dependencies for both the client and the server separately.

```bash
# 1. Clone the repository
git clone <your-repository-url>
cd color-game

# 2. Install Server dependencies
cd server
npm install

# 3. Install Client dependencies
cd ../client
npm install
```

## 2. Database Setup (pgAdmin)

You will need PostgreSQL installed and running. We will use pgAdmin to create the database and tables.

### Step 2a: Create the Database
1. Open **pgAdmin** and log in.
2. In the left sidebar, right-click on **Databases** -> **Create** -> **Database...**
3. Name the database `colordb` (or a name of your choice) and click **Save**.

### Step 2b: Create the Tables
1. Right-click your newly created database (`colordb`) and select **Query Tool**.
2. Copy, paste, and run (F5 or the Play button) the following SQL script to create the required `players` and `game` tables:

```sql
-- Create the players table (lobby queue)
CREATE TABLE players (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create the game table
CREATE TABLE game (
    id SERIAL PRIMARY KEY,
    number_of_rounds INT NOT NULL CHECK (number_of_rounds > 0 AND number_of_rounds <= 20),
    current_round INT DEFAULT 1,
    color_to_guess VARCHAR(7),
    status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_progress', 'finished')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create the game_players table
CREATE TABLE game_players (
    id SERIAL PRIMARY KEY,
    game_id INT REFERENCES game(id) ON DELETE CASCADE,
    username VARCHAR(50) NOT NULL,
    points INT DEFAULT 0,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 3. Environment Variables (`.env`)

Before creating your environment variables, you need to find your Host machine's LAN IP address so the guest player can connect.
* **Windows:** Open Command Prompt and type `ipconfig`. Look for the `IPv4 Address` (e.g., `192.168.1.15`).
* **Mac/Linux:** Open Terminal and type `ifconfig` (or `ip a`). Look for `inet` under your active network adapter.

### Server `.env`
Create a file named `.env` inside the `/server` directory:
```text
# server/.env
# Update 'postgres' and 'password' with your actual pgAdmin credentials
DATABASE_URL=postgres://postgres:password@localhost:5432/colordb
PORT=3000
```

### Client `.env`
Create a file named `.env` inside the `/client` directory. **Crucial:** Use your actual LAN IP here, not `localhost`, so the second player can connect to the host's backend.
```text
# client/.env
# Replace the IP below with your Host's IPv4 Address
VITE_API_URL=http://192.168.1.X:3000
```

## 4. Running the Application

You will need two separate terminal windows (or tabs) to run the client and the server simultaneously.

### Start the Server (Terminal 1)
Navigate to the `server` directory and start the Node backend. Using `ts-node-dev` ensures the server restarts automatically if you make changes.

```bash
cd server
npx ts-node-dev src/index.ts
```
*You should see a message indicating the server is running on `http://0.0.0.0:3000`.*

### Start the Client (Terminal 2)
Navigate to the `client` directory and start the Vite frontend. The `--host` flag is absolutely strictly required; without it, Vite will only serve to localhost, and your friend on the network won't be able to access the UI.

```bash
cd client
npm run dev -- --host
```
*You should see a message showing the Local URL and the Network URL (e.g., `http://192.168.1.X:5173`).*

## 5. How to Play Over LAN

1. **The Host (You):** Open your browser and go to the Network URL provided by Vite (e.g., `http://192.168.1.X:5173`). *Note: Even though you are the host, using the Network IP instead of localhost prevents tricky CORS and secure-context mismatches.*
2. **The Guest (Player 2):** Connects to the exact same Network URL on their device's browser. Make sure both devices are on the same Wi-Fi network.

## 6. Verifying the Setup (What You Should See)

If everything is configured correctly, here is exactly what you should see across your terminals and browser.

> ⚠️ **WARNING:** Make sure you're using Chrome browser. Firefox has stricter rules that break the project.

### In Terminal 1 (Backend/Server)
Once `ts-node-dev` compiles and starts the server, the terminal output should look like this:
```text
[INFO] 14:30:00 ts-node-dev ver. 2.0.0 (using ts-node ver. 10.9.1, typescript ver. 5.0.0)
Server running on http://0.0.0.0:3000
```
*When a player opens the app in their browser, you should also see:*
```text
User connected: <random-socket-id-string>
```

### In Terminal 2 (Frontend/Client)
Vite will output its standard startup text, highlighting the Network URL.
```text
  VITE v5.0.0  ready in 350 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.15:5173/  <-- Use this link!
  ➜  press h to show help
```

### In the Browser (The React App)
When you (and Player 2) navigate to the Network URL, the React application will load. Based on the initial setup, you should see the following text rendered on the screen:

* **Color Guessing Game** (The main heading)
* **Status: Server & DB: ok** (This confirms the React frontend successfully hit the `/api/health` Express route, and Express successfully queried the PostgreSQL database).
* **Socket Message: Connected to Game Server** (This confirms the Socket.IO bidirectional connection is active and the server successfully emitted its welcome event).

**Troubleshooting via Browser Console:** If the status says "Connecting..." or "Server Offline", right-click the page, select **Inspect**, and check the **Console** and **Network** tabs. 
* **CORS errors** usually mean the `VITE_API_URL` in the client's `.env` file doesn't match the URL you are using to access the site.
* **Connection Refused errors** usually mean the host's firewall is blocking port 3000.

### Troubleshooting Network Issues
If the guest cannot load the page or connect to the server:
* **Firewalls:** Your OS firewall might be blocking incoming connections on ports `3000` and `5173`. You may need to go into Windows Defender Firewall / macOS Firewall settings and create an "Inbound Rule" to allow traffic on these ports.
* **IP Changes:** Remember that router-assigned local IP addresses can change upon computer restarts. If things suddenly stop working days later, re-run `ipconfig` and update your `client/.env` accordingly.
