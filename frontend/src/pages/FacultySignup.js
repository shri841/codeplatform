import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import AuthLayout from '../components/AuthLayout';

export default function FacultySignup() {
  const [form, setForm] = useState({
    username: '', email: '', first_name: '', last_name: '', department: '', password: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/auth/signup/faculty/', form);
      setSuccess('Request submitted! An admin must approve your account before you can log in.');
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      const data = err.response?.data;
      setError(data ? JSON.stringify(data) : 'Signup failed.');
    }
  };

  return (
    <AuthLayout
      subtitle="Create coding questions, set test cases and time limits, and track your students' progress."
      features={[
        'Create questions with custom test cases',
        'Set execution and submission time limits',
        "View leaderboards and malpractice reports",
      ]}
    >
      <h2>Faculty Sign up</h2>
      <p className="auth-sub">Requires admin approval before you can log in.</p>
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
        <label>Department</label>
        <input name="department" onChange={handleChange} />
        <label>Password</label>
        <input name="password" type="password" onChange={handleChange} required />

        {error && <p className="form-error">{error}</p>}
        {success && <p className="form-success">{success}</p>}

        <button className="btn btn-primary full-width">Request Faculty Account</button>
      </form>
      <p className="auth-note">Already approved? <Link to="/login">Login</Link></p>
    </AuthLayout>
  );
}
