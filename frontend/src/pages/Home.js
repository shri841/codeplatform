import React, { useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';

export default function Home() {
  const navigate = useNavigate();
  const clickCount = useRef(0);
  const clickTimer = useRef(null);

  // Not linked or hinted at anywhere - five quick clicks on the logo opens
  // the login page, which still accepts admin credentials even without a
  // visible "Admin" tab.
  const handleLogoClick = () => {
    clickCount.current += 1;
    clearTimeout(clickTimer.current);
    if (clickCount.current >= 5) {
      clickCount.current = 0;
      navigate('/login?admin=1');
      return;
    }
    clickTimer.current = setTimeout(() => { clickCount.current = 0; }, 2000);
  };

  return (
    <div className="hero">
      <div className="hero-content">
        <span onClick={handleLogoClick}><Logo size={56} /></span>
        <p className="eyebrow">A modern practice-coding platform</p>
        <h1>Learn. Code. <span className="gradient-text">Get Evaluated Instantly.</span></h1>
        <p className="hero-sub">
          Faculty publish coding problems, students write &amp; submit code directly
          in the browser — no downloads, no uploads. Results appear instantly.
        </p>
        <div className="hero-actions">
          <Link to="/signup/student" className="btn btn-primary">Sign up as Student</Link>
          <Link to="/signup/faculty" className="btn btn-outline">Sign up as Faculty</Link>
        </div>
        <p className="hero-note">Already have an account? <Link to="/login">Log in</Link></p>
      </div>

      <div className="role-cards">
        <div className="role-card">
          <div className="role-icon">💻</div>
          <h3>Student</h3>
          <p>Sign up instantly, solve questions, and submit code right in the browser editor — no downloads, no uploads.</p>
        </div>
        <div className="role-card">
          <div className="role-icon">🎓</div>
          <h3>Faculty</h3>
          <p>Create coding questions with test cases, set time limits, and track your students' progress on the leaderboard.</p>
        </div>
      </div>
    </div>
  );
}
