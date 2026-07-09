import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function StudentDashboard() {
  const [questions, setQuestions] = useState([]);
  const [filter, setFilter] = useState('All');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/questions/student/').then((res) => setQuestions(res.data));
  }, []);

  const filtered = filter === 'All' ? questions : questions.filter((q) => q.difficulty === filter);

  const handleSolve = (id) => {
    // Requesting fullscreen must happen directly inside a user gesture (this click)
    // or the browser will silently refuse it.
    const el = document.documentElement;
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    }
    navigate(`/student/solve/${id}`);
  };

  return (
    <div className="dashboard">
      <h1>Student Dashboard</h1>
      <p className="dashboard-sub">Pick a problem, write your code, and submit — all in the browser.</p>

      <div className="filter-row">
        {['All', 'Easy', 'Medium', 'Hard'].map((f) => (
          <button key={f} className={`tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
      </div>

      <div className="card-grid">
        {filtered.length === 0 && <p className="empty-state">No questions available yet. Check back soon!</p>}
        {filtered.map((q) => (
          <div className="list-card question-card" key={q.id}>
            <div>
              <div className="q-title-row">
                <h4>{q.title}</h4>
                <span className={`badge badge-${q.difficulty.toLowerCase()}`}>{q.difficulty}</span>
              </div>
              {q.locked ? (
                <span className="badge badge-locked">⚠ Locked — Malpractice Detected</span>
              ) : q.solved && (
                <span className="badge badge-solved">✓ Solved</span>
              )}
              <p className="muted">{q.description.slice(0, 110)}{q.description.length > 110 ? '...' : ''}</p>
              <p className="muted small">By {q.created_by_name}</p>
            </div>
            <div className="list-card-actions">
              <button className="btn btn-primary small" onClick={() => handleSolve(q.id)}>
                {q.locked ? 'View (Locked)' : q.solved ? 'Reattempt →' : 'Solve →'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
