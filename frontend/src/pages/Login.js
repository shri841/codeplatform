import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/AuthLayout';

const TABS = [
  { key: 'student', label: 'Student' },
  { key: 'faculty', label: 'Faculty' },
];

export default function Login() {
  const [searchParams] = useSearchParams();
  const isAdminMode = searchParams.get('admin') === '1';
  const tabs = isAdminMode ? [...TABS, { key: 'admin', label: 'Admin' }] : TABS;
  const [tab, setTab] = useState(isAdminMode ? 'admin' : 'student');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const role = await login(username, password);
      if (role !== tab && !(role === 'admin' && !isAdminMode)) {
        setError(`This account is registered as "${role}", not "${tab}". Redirecting to the correct dashboard...`);
      }
      if (role === 'admin') navigate('/admin');
      else if (role === 'faculty') navigate('/faculty');
      else navigate('/student');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout subtitle="Practice coding, get instant feedback, and track your progress — all in the browser.">
      <h2>Welcome back</h2>
      <p className="auth-sub">Log in to continue to CodeArena</p>

      <div className="tabs">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
            type="button"
          >
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <label>Username</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} required />

        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

        {error && <p className="form-error">{error}</p>}

        <button className="btn btn-primary full-width" disabled={loading}>
          {loading ? 'Logging in...' : `Login as ${tab}`}
        </button>
      </form>

      {tab === 'faculty' && (
        <p className="auth-note">New faculty? <Link to="/signup/faculty">Request an account</Link> (requires admin approval).</p>
      )}
      {tab === 'student' && (
        <p className="auth-note">New student? <Link to="/signup/student">Create an account</Link>.</p>
      )}
    </AuthLayout>
  );
}
