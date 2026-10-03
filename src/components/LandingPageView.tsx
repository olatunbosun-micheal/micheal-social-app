import React, { useState } from 'react';
import { ShieldCheck, ArrowRight, Lock, Mail, MessageSquare, Send, Sparkles } from 'lucide-react';
import type { User } from '../types';
import { API_BASE } from '../config';

interface LandingPageViewProps {
  ownerName: string;
  onLoginSuccess: (user: User) => void;
  onOpenInvitePrompt: () => void;
}

export const LandingPageView: React.FC<LandingPageViewProps> = ({
  ownerName,
  onLoginSuccess,
  onOpenInvitePrompt,
}) => {
  const [showSignIn, setShowSignIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }
      if (data.token) {
        localStorage.setItem('gateway_token', data.token);
      }
      onLoginSuccess(data.user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboarding-screen">
      <div className="onboarding-card" style={{ maxWidth: 460 }}>
        <div className="onboarding-badge">
          <ShieldCheck size={14} />
          <span>Personal Communication Gateway</span>
        </div>

        {!showSignIn ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h1 className="onboarding-title">Chat with {ownerName}</h1>
              <p className="onboarding-desc" style={{ marginTop: 8 }}>
                A private place to talk directly with <strong>{ownerName}</strong>. Send messages, photos, files, and voice notes.
              </p>
            </div>

            <div
              style={{
                background: 'var(--bg-app)',
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                fontSize: 13,
                color: 'var(--text-secondary)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
                <MessageSquare size={16} color="var(--accent-primary)" />
                <strong>Direct 1-on-1 Isolation</strong>
              </div>
              <div>No public search, no feed, and no user-to-user discovery. Every guest communicates strictly with {ownerName}.</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                className="submit-btn"
                onClick={onOpenInvitePrompt}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <Sparkles size={16} />
                <span>Join with Invitation Link</span>
              </button>

              <button
                className="control-btn"
                style={{ justifyContent: 'center', padding: '10px' }}
                onClick={() => setShowSignIn(true)}
              >
                <span>Already have an account? Sign In</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        ) : (
          <form className="onboarding-form" onSubmit={handleLogin}>
            <div>
              <h2 className="onboarding-title" style={{ fontSize: 20 }}>Sign In</h2>
              <p className="onboarding-desc">
                Access your private conversation with {ownerName}.
              </p>
            </div>

            {error && (
              <div style={{ color: 'var(--accent-danger)', fontSize: 13, background: 'rgba(244,63,94,0.1)', padding: 10, borderRadius: 6 }}>
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="search-input-wrapper">
                <Mail size={16} color="var(--text-muted)" />
                <input
                  type="email"
                  required
                  className="search-input"
                  placeholder="e.g. sarah.j@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="search-input-wrapper">
                <Lock size={16} color="var(--text-muted)" />
                <input
                  type="password"
                  required
                  className="search-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="submit-btn"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <span>{loading ? 'Signing In...' : 'Sign In'}</span>
              <Send size={15} />
            </button>

            <button
              type="button"
              className="control-btn"
              style={{ justifyContent: 'center', border: 'none', background: 'transparent' }}
              onClick={() => setShowSignIn(false)}
            >
              Back to Overview
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
