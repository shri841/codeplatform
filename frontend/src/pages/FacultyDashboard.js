import React, { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';

const emptyQuestion = {
  title: '', description: '', difficulty: 'Easy', sample_input: '', sample_output: '',
  time_limit_seconds: 5, duration_minutes: 0, is_active: true,
  test_cases: [{ input_data: '', expected_output: '', is_hidden: false }],
};

export default function FacultyDashboard() {
  const [questions, setQuestions] = useState([]);
  const [form, setForm] = useState(emptyQuestion);
  const [editingId, setEditingId] = useState(null);
  const [msg, setMsg] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [view, setView] = useState('questions'); // 'questions' | 'leaderboard' | 'violations'
  const [lbQuestionId, setLbQuestionId] = useState(''); // '' = overall
  const [leaderboard, setLeaderboard] = useState({ scope: 'overall', rows: [] });
  const [violations, setViolations] = useState([]);

  const loadQuestions = useCallback(async () => {
    const res = await api.get('/questions/faculty/');
    setQuestions(res.data);
  }, []);

  const loadLeaderboard = useCallback(async (questionId) => {
    const qs = questionId ? `?question=${questionId}` : '';
    const res = await api.get(`/submissions/leaderboard/${qs}`);
    setLeaderboard(res.data);
  }, []);

  const loadViolations = useCallback(async () => {
    const res = await api.get('/submissions/violations/');
    setViolations(res.data);
  }, []);

  useEffect(() => { loadQuestions(); }, [loadQuestions]);
  useEffect(() => { if (view === 'leaderboard') loadLeaderboard(lbQuestionId); }, [view, lbQuestionId, loadLeaderboard]);
  useEffect(() => { if (view === 'violations') loadViolations(); }, [view, loadViolations]);

  const VIOLATION_LABELS = {
    tab_switch: 'Switched Tabs',
    window_blur: 'Left Window',
    fullscreen_exit: 'Exited Fullscreen',
    copy_paste_attempts: 'Copy/Paste Attempt(s)',
  };

  const allowReattempt = async (studentId, questionId) => {
    await api.post('/submissions/violations/unlock/', { student: studentId, question: questionId });
    loadViolations();
  };

  const toggleActive = async (q) => {
    await api.patch(`/questions/faculty/${q.id}/`, { is_active: !q.is_active });
    loadQuestions();
  };

  const handleField = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleTestCaseChange = (idx, field, value) => {
    const updated = [...form.test_cases];
    updated[idx] = { ...updated[idx], [field]: value };
    setForm({ ...form, test_cases: updated });
  };

  const addTestCase = () => setForm({
    ...form, test_cases: [...form.test_cases, { input_data: '', expected_output: '', is_hidden: false }],
  });

  const removeTestCase = (idx) => setForm({
    ...form, test_cases: form.test_cases.filter((_, i) => i !== idx),
  });

  const resetForm = () => { setForm(emptyQuestion); setEditingId(null); setShowForm(false); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      if (editingId) {
        await api.put(`/questions/faculty/${editingId}/`, form);
        setMsg('Question updated.');
      } else {
        await api.post('/questions/faculty/', form);
        setMsg('Question published to students.');
      }
      resetForm();
      loadQuestions();
    } catch (err) {
      setMsg('Error: ' + JSON.stringify(err.response?.data || {}));
    }
  };

  const editQuestion = (q) => {
    setForm({
      title: q.title,
      description: q.description,
      difficulty: q.difficulty,
      sample_input: q.sample_input,
      sample_output: q.sample_output,
      time_limit_seconds: q.time_limit_seconds ?? 5,
      duration_minutes: q.duration_minutes ?? 0,
      is_active: q.is_active ?? true,
      test_cases: q.test_cases?.length ? q.test_cases : [{ input_data: '', expected_output: '', is_hidden: false }],
    });
    setEditingId(q.id);
    setShowForm(true);
  };

  const deleteQuestion = async (id) => {
    if (!window.confirm('Delete this question?')) return;
    await api.delete(`/questions/faculty/${id}/`);
    loadQuestions();
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header-row">
        <div>
          <h1>Faculty Dashboard</h1>
          <p className="dashboard-sub">Create coding questions for students to solve.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }}>
          {showForm ? 'Close' : '+ New Question'}
        </button>
      </div>

      <div className="tabs" style={{ maxWidth: 480, marginTop: '1.2rem' }}>
        <button className={`tab ${view === 'questions' ? 'active' : ''}`} onClick={() => setView('questions')}>
          Questions
        </button>
        <button
          className={`tab ${view === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setView('leaderboard')}
        >
          Leaderboard
        </button>
        <button
          className={`tab ${view === 'violations' ? 'active' : ''}`}
          onClick={() => setView('violations')}
        >
          Violations
        </button>
      </div>

      {msg && <p className="form-success">{msg}</p>}

      {view === 'questions' && showForm && (
        <form className="question-form" onSubmit={handleSubmit}>
          <label>Title</label>
          <input name="title" value={form.title} onChange={handleField} required />

          <label>Description</label>
          <textarea name="description" rows="4" value={form.description} onChange={handleField} required />

          <div className="two-col">
            <div>
              <label>Difficulty</label>
              <select name="difficulty" value={form.difficulty} onChange={handleField}>
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
              </select>
            </div>
          </div>

          <div className="two-col">
            <div>
              <label>Sample Input</label>
              <textarea name="sample_input" rows="2" value={form.sample_input} onChange={handleField} />
            </div>
            <div>
              <label>Sample Output</label>
              <textarea name="sample_output" rows="2" value={form.sample_output} onChange={handleField} />
            </div>
          </div>

          <div className="two-col">
            <div>
              <label>Execution time limit (seconds per test case)</label>
              <input
                type="number" min="1" max="30" name="time_limit_seconds"
                value={form.time_limit_seconds} onChange={handleField}
              />
            </div>
            <div>
              <label>Time limit to submit (minutes, 0 = no limit)</label>
              <input
                type="number" min="0" name="duration_minutes"
                value={form.duration_minutes} onChange={handleField}
              />
            </div>
          </div>

          <h4>Test Cases (used for evaluating student submissions)</h4>
          {form.test_cases.map((tc, idx) => (
            <div className="test-case-row" key={idx}>
              <textarea
                placeholder="Input"
                rows="2"
                value={tc.input_data}
                onChange={(e) => handleTestCaseChange(idx, 'input_data', e.target.value)}
              />
              <textarea
                placeholder="Expected Output"
                rows="2"
                value={tc.expected_output}
                onChange={(e) => handleTestCaseChange(idx, 'expected_output', e.target.value)}
                required
              />
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={tc.is_hidden}
                  onChange={(e) => handleTestCaseChange(idx, 'is_hidden', e.target.checked)}
                /> Hidden
              </label>
              {form.test_cases.length > 1 && (
                <button type="button" className="btn-icon" onClick={() => removeTestCase(idx)}>✕</button>
              )}
            </div>
          ))}
          <button type="button" className="btn btn-outline small" onClick={addTestCase}>+ Add test case</button>

          <button className="btn btn-primary full-width" style={{ marginTop: '1.2rem' }}>
            {editingId ? 'Update Question' : 'Publish Question'}
          </button>
        </form>
      )}

      {view === 'questions' && (
        <>
          <h3 className="section-title">Your Questions</h3>
          <div className="card-grid">
            {questions.length === 0 && <p className="empty-state">You haven't published any questions yet.</p>}
            {questions.map((q) => (
              <div className="list-card question-card" key={q.id}>
                <div>
                  <div className="q-title-row">
                    <h4>{q.title}</h4>
                    <span className={`badge badge-${q.difficulty.toLowerCase()}`}>{q.difficulty}</span>
                  </div>
                  {!q.is_active && <span className="badge badge-inactive">Disabled</span>}
                  <p className="muted">{q.description.slice(0, 100)}{q.description.length > 100 ? '...' : ''}</p>
                  <p className="muted small">{q.test_cases?.length || 0} test case(s)</p>
                  <p className="muted small">
                    {q.time_limit_seconds}s exec limit
                    {q.duration_minutes > 0 ? ` · ${q.duration_minutes} min to submit` : ''}
                  </p>
                </div>
                <div className="list-card-actions">
                  <button className="btn btn-outline small" onClick={() => editQuestion(q)}>Edit</button>
                  <button className="btn btn-outline small" onClick={() => toggleActive(q)}>
                    {q.is_active ? 'Disable' : 'Enable'}
                  </button>
                  <button className="btn btn-outline small danger" onClick={() => deleteQuestion(q.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {view === 'leaderboard' && (
        <>
          <div className="dashboard-header-row" style={{ alignItems: 'center', marginTop: '1rem' }}>
            <h3 className="section-title" style={{ margin: 0 }}>Leaderboard</h3>
            <select
              className="select-control"
              value={lbQuestionId}
              onChange={(e) => setLbQuestionId(e.target.value)}
              style={{ maxWidth: 320 }}
            >
              <option value="">Overall (all questions)</option>
              {questions.map((q) => (
                <option key={q.id} value={q.id}>{q.title}</option>
              ))}
            </select>
          </div>

          {leaderboard.rows.length === 0 ? (
            <p className="empty-state">No accepted submissions yet.</p>
          ) : leaderboard.scope === 'question' ? (
            <div className="leaderboard-table-wrap">
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Student</th>
                    <th>Roll No.</th>
                    <th>Solved At</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.rows.map((row) => (
                    <tr key={row.student}>
                      <td>#{row.rank}</td>
                      <td>{row.student}</td>
                      <td>{row.roll_number || '—'}</td>
                      <td>{new Date(row.solved_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="leaderboard-table-wrap">
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Student</th>
                    <th>Roll No.</th>
                    <th>Solved</th>
                    <th>Last Solve</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.rows.map((row) => (
                    <tr key={row.student}>
                      <td>#{row.rank}</td>
                      <td>{row.student}</td>
                      <td>{row.roll_number || '—'}</td>
                      <td>{row.solved_count}</td>
                      <td>{new Date(row.last_solved_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {view === 'violations' && (
        <>
          <h3 className="section-title">Violations</h3>
          {violations.length === 0 ? (
            <p className="empty-state">No suspicious activity detected yet.</p>
          ) : (
            <div className="leaderboard-table-wrap">
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Roll No.</th>
                    <th>Question</th>
                    <th>Violation</th>
                    <th>When</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {violations.map((v) => (
                    <tr key={v.submission_id}>
                      <td>{v.student}</td>
                      <td>{v.roll_number || '—'}</td>
                      <td>{v.question}</td>
                      <td>
                        {VIOLATION_LABELS[v.violation_type] || v.violation_type}
                        {v.tab_switch_count > 0 && ` (${v.tab_switch_count})`}
                      </td>
                      <td>{new Date(v.submitted_at).toLocaleString()}</td>
                      <td>
                        {v.locked && (
                          <button
                            className="btn btn-outline small"
                            onClick={() => allowReattempt(v.student_id, v.question_id)}
                          >
                            Allow Reattempt
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
