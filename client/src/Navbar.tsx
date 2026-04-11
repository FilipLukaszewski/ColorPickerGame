import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav className="navbar">
    <Link to="/" className="nav-brand">Color guessr</Link>
    <div className="nav-links">
      <Link to="/" className="nav-item">Play</Link>
      <Link to="/docs" className="nav-item">Docs</Link>
    </div>
  </nav>
  );
};

export default Navbar;
