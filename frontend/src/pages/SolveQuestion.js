import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import CodeEditor from '../components/CodeEditor';

const STARTER = {
  python: '# Write your Python solution here\n# Read input with input() and print() your answer\n\n',
  cpp: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    return 0;\n}\n',
};

const CONFETTI_COLORS = ['#f43f5e', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#06b6d4', '#eab308'];

function Confetti({ active }) {
  const pieces = useMemo(() => {
    if (!active) return [];
    return Array.from({ length: 60 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      delay: Math.random() * 0.15,
      duration: 2.4 + Math.random() * 0.8,
      rotate: 360 + Math.random() * 720,
      drift: (Math.random() - 0.5) * 200,
    }));
  }, [active]);

  if (!active) return null;
  return (
    <div className="confetti-container">
      {pieces.map((p) => (
        <span
          key={p.id}
          className={`confetti-piece ${p.id % 3 === 0 ? 'confetti-round' : ''}`}
          style={{
            left: `${p.left}%`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            '--rot': `${p.rotate}deg`,
            '--drift': `${p.drift}px`,
          }}
        />
      ))}
    </div>
  );
}

function formatRemaining(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function SolveQuestion() {
  const { id } = useParams();
  const [question, setQuestion] = useState(null);
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState(STARTER.python);
  const [result, setResult] = useState(null);
  const [runResult, setRunResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [runLoading, setRunLoading] = useState(false);
  const [remainingMs, setRemainingMs] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
  const [locked, setLocked] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const suspiciousCount = useRef(0);
  const resultRef = useRef(null);
  const celebratedIdRef = useRef(null);
  const autoSubmittedRef = useRef(false);
  const codeRef = useRef(code);
  const languageRef = useRef(language);

  useEffect(() => { codeRef.current = code; }, [code]);
  useEffect(() => { languageRef.current = language; }, [language]);

  const loadHistory = useCallback(() => {
    api.get(`/submissions/mine/?question=${id}`).then((res) => setHistory(res.data));
  }, [id]);

  useEffect(() => {
    api.get(`/questions/student/${id}/`).then((res) => {
      setQuestion(res.data);
      if (res.data.locked) setLocked(true);
    });
    loadHistory();
  }, [id, loadHistory]);

  // The single "was this already triggered" guard, plus the actual auto-submit
  // call. Any tab-switch/blur/fullscreen-exit signal calls this - only the
  // first one does anything, since after that the question is locked.
  const triggerAutoSubmit = useCallback(async (reason) => {
    if (autoSubmittedRef.current || locked) return;
    autoSubmittedRef.current = true;
    try {
      const res = await api.post('/submissions/auto-submit/', {
        question: id, code: codeRef.current, language: languageRef.current, reason,
      });
      setResult(res.data);
      loadHistory();
    } finally {
      setLocked(true);
    }
  }, [id, locked, loadHistory]);

  // Contest-style countdown: faculty can set a duration_minutes limit to submit.
  useEffect(() => {
    if (!question?.duration_minutes || !question?.started_at) {
      setRemainingMs(null);
      return;
    }
    const deadline = new Date(question.started_at).getTime() + question.duration_minutes * 60 * 1000;
    const tick = () => setRemainingMs(deadline - Date.now());
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [question]);

  // Anti-malpractice: alt+tab / switching apps or tabs immediately auto-submits
  // whatever code the student currently has, then locks the question.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        suspiciousCount.current += 1;
        triggerAutoSubmit('tab_switch');
      }
    };
    const onBlur = () => {
      suspiciousCount.current += 1;
      triggerAutoSubmit('window_blur');
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
    };
  }, [triggerAutoSubmit]);

  // Fullscreen lockdown: switching tabs/apps typically exits fullscreen on its
  // own too, which we also treat as a violation.
  useEffect(() => {
    const onFsChange = () => {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      if (!fs) {
        suspiciousCount.current += 1;
        triggerAutoSubmit('fullscreen_exit');
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, [triggerAutoSubmit]);

  const resumeFullscreen = () => {
    document.documentElement.requestFullscreen().catch(() => {});
  };

  const blockCopy = (e) => { e.preventDefault(); suspiciousCount.current += 1; };

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    setCode(STARTER[lang]);
  };

  const timeExpired = remainingMs !== null && remainingMs <= 0;

  // Celebrate whenever a submission (normal or auto) comes back Accepted.
  // Guarded by submission id so this can only ever fire once per result, even
  // if the effect runs twice (React 18 StrictMode double-invokes effects in dev).
  useEffect(() => {
    if (result?.status === 'Accepted' && result.id !== celebratedIdRef.current) {
      celebratedIdRef.current = result.id;
      setShowConfetti(true);
      const t = setTimeout(() => setShowConfetti(false), 3500);
      return () => clearTimeout(t);
    }
  }, [result]);

  // Bring the result into view the instant it arrives, instead of leaving the
  // student to scroll down past a tall editor to find it.
  useEffect(() => {
    if (result || runResult) {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [result, runResult]);

  const handleRun = async () => {
    setRunLoading(true);
    setRunResult(null);
    try {
      const res = await api.post('/submissions/run/', { question: id, code, language });
      setRunResult(res.data);
    } catch (err) {
      setRunResult({ status: 'Error', result_detail: JSON.stringify(err.response?.data || {}) });
    } finally {
      setRunLoading(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitLoading(true);
    setResult(null);
    try {
      const res = await api.post('/submissions/submit/', {
        question: id,
        code,
        language,
        tab_switch_count: suspiciousCount.current,
      });
      setResult(res.data);
      loadHistory();
    } catch (err) {
      setResult({ status: 'Error', result_detail: JSON.stringify(err.response?.data || {}) });
    } finally {
      setSubmitLoading(false);
    }
  };

  if (!question) return <div className="dashboard"><p>Loading question...</p></div>;

  return (
    <div className="dashboard solve-page">
      <Confetti active={showConfetti} />
      {showConfetti && (
        <div className="congrats-banner-wrap">
          <div className="congrats-banner">
            <div className="congrats-emoji">🎉</div>
            <div>
              <h3>Congratulations!</h3>
              <p>You solved "{question.title}" — all test cases passed.</p>
            </div>
          </div>
        </div>
      )}
      {locked ? (
        <div className="fullscreen-gate">
          <div className="fullscreen-gate-card">
            <h3>Question Locked</h3>
            <p>
              You switched tabs, lost window focus, or left fullscreen while solving this question.
              Your code was automatically submitted and this question is now locked — you cannot
              Run or Submit again. Contact your faculty if you believe this is a mistake.
            </p>
            <Link to="/student" className="btn btn-primary">Back to Questions</Link>
          </div>
        </div>
      ) : !isFullscreen && (
        <div className="fullscreen-gate">
          <div className="fullscreen-gate-card">
            <h3>Fullscreen required</h3>
            <p>This question must be solved in fullscreen mode. Exiting fullscreen is logged as suspicious activity.</p>
            <button className="btn btn-primary" onClick={resumeFullscreen}>Enter Fullscreen</button>
          </div>
        </div>
      )}

      <Link
        to="/student"
        className="back-link"
        onClick={() => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); }}
      >
        ← Back to questions
      </Link>

      <div className="solve-grid">
        <div className="question-panel" onCopy={blockCopy} onContextMenu={blockCopy}>
          <div className="q-title-row">
            <h2>{question.title}</h2>
            <span className={`badge badge-${question.difficulty.toLowerCase()}`}>{question.difficulty}</span>
          </div>
          <p className="q-description">{question.description}</p>

          <div className="limits-row">
            <span className="limit-pill">⏱ Execution limit: {question.time_limit_seconds}s / test case</span>
            {question.duration_minutes > 0 && remainingMs !== null && (
              <span className={`limit-pill ${timeExpired ? 'limit-pill-danger' : ''}`}>
                {timeExpired ? 'Time is up' : `Time left: ${formatRemaining(remainingMs)}`}
              </span>
            )}
          </div>

          {question.sample_input && (
            <>
              <h4>Sample Input</h4>
              <pre className="sample-block">{question.sample_input}</pre>
            </>
          )}
          {question.sample_output && (
            <>
              <h4>Sample Output</h4>
              <pre className="sample-block">{question.sample_output}</pre>
            </>
          )}

          <h4>Your Submission History</h4>
          {history.length === 0 && <p className="muted small">No submissions yet.</p>}
          <ul className="history-list">
            {history.map((h) => (
              <li key={h.id}>
                <span className={`status-pill status-${h.status.replace(' ', '-').toLowerCase()}`}>{h.status}</span>
                <span className="muted small">{h.passed_count}/{h.total_count} passed</span>
                <span className="muted small">{new Date(h.submitted_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="editor-panel">
          <div className="editor-toolbar">
            <select value={language} onChange={(e) => handleLanguageChange(e.target.value)}>
              <option value="python">Python 3</option>
              <option value="cpp">C++</option>
            </select>
          </div>

          <CodeEditor
            value={code}
            onChange={setCode}
            language={language}
            onBlockedAction={() => { suspiciousCount.current += 1; }}
          />

          <div className="editor-actions">
            <button className="btn btn-outline" onClick={handleRun} disabled={runLoading || timeExpired || locked}>
              {runLoading ? 'Running...' : '▶ Run (Sample)'}
            </button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitLoading || timeExpired || locked}>
              {submitLoading ? 'Submitting...' : timeExpired ? 'Time Expired' : 'Submit Code ▶'}
            </button>
          </div>

          <div ref={resultRef}>
            {runResult && (
              <div className={`result-box result-${runResult.status?.replace(' ', '-').toLowerCase()}`}>
                <h4>Run Result <span className="muted small">(sample only, not saved)</span></h4>
                {runResult.passed_count !== undefined && (
                  <p>{runResult.passed_count} / {runResult.total_count} sample case(s) passed</p>
                )}
                <pre>{runResult.result_detail}</pre>
              </div>
            )}

            {result && (
              <div className={`result-box result-${result.status?.replace(' ', '-').toLowerCase()}`}>
                <h4>Submission Result</h4>
                {result.passed_count !== undefined && (
                  <p>{result.passed_count} / {result.total_count} test cases passed</p>
                )}
                <pre>{result.result_detail}</pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
