import { useState } from 'react'

function Docs() {

  return (
    <>
      <h1>Color picker game</h1>
      <h3>A local multiplayer game server about guessing the correct color. It is built with Node.js, TypeScript, Express, and PostgreSQL.</h3>
      <h2>How does it work?</h2>
      <h3>When the game starts, player will see a color for a short time. Then they have to guess what was the color. Player with the closer guess to the answer win the round.</h3>
      <h1>Architecture:</h1>
      <h2>Home:</h2>
      <h3>A page where user puts its username and hosts or joins the lobby.</h3>
      <h2>Game:</h2>
      <h3>A page where the main game logic works.</h3>
      <h1>Endpoints:</h1>
      <h2>/ping</h2>
      <h3>GET method: Checks the health server status confirms the server is up.</h3>
      <h2>/home/home</h2>
      <h3>GET method: Returns lobby welcome message.</h3>
      <h2>/game/status</h2>
      <h3>GET method: Checks DB connection and game readiness</h3>
      <h2>/game/join</h2>
      <h3>POST method: Placeholder for a second player joining.</h3>
      <h1>Examples:</h1>
    </>
  )
}

export default Docs
