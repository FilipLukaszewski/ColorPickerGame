import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Docs from './Docs';
import Navbar from './Navbar';
import Home from './Home';

function App() {
  return (
    <Router>
      <Navbar />
      <main className="page-wrapper">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/docs" element={<Docs />} />
        </Routes>
      </main>
    </Router>
  );
}

export default App;
