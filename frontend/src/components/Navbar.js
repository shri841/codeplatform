import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';

export default function Navbar() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="brand">
        <Logo size={30} /> CodeArena
      </Link>
      <div className="nav-links">
        {!auth && (
          <>
            <Link to="/login" className="nav-link">Login</Link>
            <Link to="/signup/student" className="nav-btn">Get Started</Link>
          </>
        )}
        {auth && (
          <>
            <span className="nav-user">
              {auth.username} <span className="role-pill">{auth.role}</span>
            </span>
            <button className="nav-btn ghost" onClick={handleLogout}>Logout</button>
          </>
        )}
      </div>
    </nav>
  );
}
