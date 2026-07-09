import React, { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';

export default function AdminDashboard() {
  const [tab, setTab] = useState('pending');
  const [pending, setPending] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [students, setStudents] = useState([]);
  const [msg, setMsg] = useState('');

  const loadAll = useCallback(async () => {
    const [p, f, s] = await Promise.all([
      api.get('/auth/admin/faculty/pending/'),
      api.get('/auth/admin/faculty/'),
      api.get('/auth/admin/students/'),
    ]);
    setPending(p.data);
    setFaculty(f.data);
    setStudents(s.data);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const approve = async (id, action) => {
    await api.post(`/auth/admin/faculty/${id}/approve/`, { action });
    setMsg(action === 'approve' ? 'Faculty approved.' : 'Request rejected.');
    loadAll();
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this user permanently?')) return;
    await api.delete(`/auth/admin/users/${id}/delete/`);
    loadAll();
  };

  return (
    <div className="dashboard">
      <h1>Admin Dashboard</h1>
      <p className="dashboard-sub">Manage faculty approvals, students &amp; faculty accounts.</p>

      {msg && <p className="form-success">{msg}</p>}

      <div className="tabs">
        <button className={`tab ${tab === 'pending' ? 'active' : ''}`} onClick={() => setTab('pending')}>
          Pending Faculty ({pending.length})
        </button>
        <button className={`tab ${tab === 'faculty' ? 'active' : ''}`} onClick={() => setTab('faculty')}>
          Faculty ({faculty.length})
        </button>
        <button className={`tab ${tab === 'students' ? 'active' : ''}`} onClick={() => setTab('students')}>
          Students ({students.length})
        </button>
      </div>

      {tab === 'pending' && (
        <div className="card-grid">
          {pending.length === 0 && <p className="empty-state">No pending faculty requests 🎉</p>}
          {pending.map((u) => (
            <div className="list-card" key={u.id}>
              <div>
                <h4>{u.username}</h4>
                <p>{u.email}</p>
                <p className="muted">Dept: {u.department || '—'}</p>
              </div>
              <div className="list-card-actions">
                <button className="btn btn-primary small" onClick={() => approve(u.id, 'approve')}>Approve</button>
                <button className="btn btn-outline small danger" onClick={() => approve(u.id, 'reject')}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'faculty' && (
        <div className="card-grid">
          {faculty.map((u) => (
            <div className="list-card" key={u.id}>
              <div>
                <h4>{u.username}</h4>
                <p>{u.email}</p>
                <p className="muted">Dept: {u.department || '—'}</p>
              </div>
              <div className="list-card-actions">
                <button className="btn btn-outline small danger" onClick={() => remove(u.id)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'students' && (
        <div className="card-grid">
          {students.map((u) => (
            <div className="list-card" key={u.id}>
              <div>
                <h4>{u.username}</h4>
                <p>{u.email}</p>
                <p className="muted">Roll No: {u.roll_number || '—'}</p>
              </div>
              <div className="list-card-actions">
                <button className="btn btn-outline small danger" onClick={() => remove(u.id)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
