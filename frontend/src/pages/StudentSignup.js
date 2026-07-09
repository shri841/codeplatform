import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import AuthLayout from '../components/AuthLayout';

export default function StudentSignup() {
  const [form, setForm] = useState({
    username: '', email: '', first_name: '', last_name: '', roll_number: '', password: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/auth/signup/student/', form);
      setSuccess('Account created! Redirecting to login...');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      const data = err.response?.data;
      setError(data ? JSON.stringify(data) : 'Signup failed.');
    }
  };

  return (
    <AuthLayout
      subtitle="Join CodeArena and start solving coding problems today — no downloads, no setup, just your browser."
      features={[
        'Write and submit code directly in the browser',
        'Get an instant Accepted / Wrong Answer / Error verdict',
        'See where you rank on the leaderboard',
      ]}
    >
      <h2>Student Sign up</h2>
      <p className="auth-sub">Direct signup — start solving right away.</p>
      <form onSubmit={handleSubmit}>
        <label>Username</label>
        <input name="username" onChange={handleChange} required />
        <label>Email</label>
        <input name="email" type="email" onChange={handleChange} required />
        <div className="two-col">
          <div>
            <label>First name</label>
            <input name="first_name" onChange={handleChange} />
          </div>
          <div>
            <label>Last name</label>
            <input name="last_name" onChange={handleChange} />
          </div>
        </div>
        <label>Roll Number</label>
        <input name="roll_number" onChange={handleChange} required />
        <label>Password</label>
        <input name="password" type="password" onChange={handleChange} required />

        {error && <p className="form-error">{error}</p>}
        {success && <p className="form-success">{success}</p>}

        <button className="btn btn-primary full-width">Create account</button>
      </form>
      <p className="auth-note">Already have an account? <Link to="/login">Login</Link></p>
    </AuthLayout>
  );
}
