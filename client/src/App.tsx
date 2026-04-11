import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Docs from './Docs';
import Navbar from './Navbar';
import Home from './Home';
import Game from './Game';

function App() {
  return (
    <Router>
      <Navbar />
      <main className="page-wrapper">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/game/:roomId" element={<Game />} />
        </Routes>
      </main>
    </Router>
  );
}

export default App;
