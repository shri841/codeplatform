import React from 'react';
import Logo from './Logo';

const DEFAULT_FEATURES = [
  'No downloads or uploads — code directly in the browser',
  'Instant Accepted / Wrong Answer / Error verdicts',
  'Leaderboards to track your progress',
];

export default function AuthLayout({ subtitle, features = DEFAULT_FEATURES, children }) {
  return (
    <div className="auth-page">
      <div className="auth-branding">
        <Logo size={64} />
        <h1>CodeArena</h1>
        <p>{subtitle}</p>
        <ul className="auth-feature-list">
          {features.map((f) => <li key={f}>✓ {f}</li>)}
        </ul>
      </div>
      <div className="auth-form-side">
        <div className="auth-card">
          {children}
        </div>
      </div>
    </div>
  );
}
