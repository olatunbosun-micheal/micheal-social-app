import React, { useState, useEffect } from 'react';
import { ArrowRight, Lock, Mail, User as UserIcon, Shield, AlertTriangle, Moon, Sun, Sparkles } from 'lucide-react';
import type { User, ThemeMode } from '../types';
import { API_BASE } from '../config';

interface InviteLandingViewProps {
  inviteCode: string;
  theme?: ThemeMode;
  onToggleTheme?: () => void;
  onSuccess: (user: User, conversationId: string) => void;
  onGoHome: () => void;
}

export const InviteLandingView: React.FC<InviteLandingViewProps> = ({
  inviteCode,
  theme = 'dark',
  onToggleTheme,
  onSuccess,
  onGoHome,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteMeta, setInviteMeta] = useState<{
    recipientName?: string;
    ownerName: string;
    note?: string;
  } | null>(null);

  const [step, setStep] = useState<'welcome' | 'register' | 'login'>('welcome');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const validate = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/invites/validate/${inviteCode}`);
        const data = await res.json();
        if (!res.ok || !data.valid) {
          setError(data.error || 'Invalid or expired invitation link.');
        } else {
          setInviteMeta({
            recipientName: data.invite?.recipientName,
            ownerName: data.owner?.name || 'Micheal',
            note: data.invite?.note,
          });
          if (data.invite?.recipientName) setName(data.invite.recipientName);
        }
      } catch {
        setInviteMeta({ ownerName: 'Micheal' });
      } finally {
        setLoading(false);
      }
    };
    validate();
  }, [inviteCode]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/register-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          inviteCode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      if (data.token) localStorage.setItem('gateway_token', data.token);
      onSuccess(data.user, data.conversationId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      if (data.token) localStorage.setItem('gateway_token', data.token);
      onSuccess(data.user, '');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid email or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="land-screen">
        <div className="land-panel">
          <div className="land-logo-row">
            <div className="land-logo-mark"><Shield size={16} strokeWidth={2} /></div>
            <span className="land-logo-name">Gateway</span>
          </div>
          <p className="land-sub" style={{ marginTop: 8 }}>Validating invitation...</p>
        </div>
      </div>
    );
  }

  if (error && !inviteMeta) {
    return (
      <div className="land-screen">
        <div className="land-panel">
          <div className="land-logo-row">
            <div className="land-logo-mark"><Shield size={16} strokeWidth={2} /></div>
            <span className="land-logo-name">Gateway</span>
          </div>
          <div className="land-heading-block">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-danger)', marginBottom: 8 }}>
              <AlertTriangle size={18} strokeWidth={2} />
              <span style={{ fontWeight: 700, fontSize: 16 }}>Invitation Unavailable</span>
            </div>
            <p className="land-sub">{error}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', marginTop: 12 }}>
            <button
              className="land-primary-btn"
              onClick={() => {
                setError(null);
                setInviteMeta({ ownerName: 'Micheal' });
                setStep('login');
              }}
            >
              <span>Already created account? Sign In</span>
              <ArrowRight size={15} />
            </button>
            <button className="land-secondary-btn" onClick={onGoHome}>Return to Gateway</button>
          </div>
        </div>
      </div>
    );
  }

  const ownerName = inviteMeta?.ownerName || 'Micheal';

  if (step === 'welcome') {
    return (
      <div className="land-screen">
        <div className="land-panel">
          <div className="land-logo-row" style={{ justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="land-logo-mark"><Shield size={16} strokeWidth={2} /></div>
              <span className="land-logo-name">Gateway</span>
            </div>
            {onToggleTheme && (
              <button
                type="button"
                className="land-theme-toggle-btn"
                onClick={onToggleTheme}
                title={`Theme: ${theme.toUpperCase()} — Click to cycle color theme`}
              >
                {theme === 'light' ? <Sun size={13} strokeWidth={2} /> : theme === 'midnight' ? <Sparkles size={13} strokeWidth={2} /> : <Moon size={13} strokeWidth={2} />}
                <span>{theme}</span>
              </button>
            )}
          </div>

          <div className="land-invite-tag">Personal invitation</div>

          <div className="land-heading-block">
            {inviteMeta?.recipientName
              ? <h1 className="land-h1">Hi, {inviteMeta.recipientName}.</h1>
              : <h1 className="land-h1">You've been invited.</h1>
            }
            <p className="land-sub">
              <strong style={{ color: 'var(--text-primary)' }}>{ownerName}</strong> invited you to a private, direct conversation. No public profile, no other users — just the two of you.
            </p>
          </div>

          {inviteMeta?.note && (
            <div className="land-note-block">
              <span className="land-note-label">Note from {ownerName}</span>
              <p className="land-note-text">"{inviteMeta.note}"</p>
            </div>
          )}

          <div className="land-divider" />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
            <button
              className="land-primary-btn"
              onClick={() => { setStep('register'); setError(null); }}
            >
              <span>Create account &amp; open chat</span>
              <ArrowRight size={15} />
            </button>

            <button
              type="button"
              className="land-ghost-btn"
              style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}
              onClick={() => { setStep('login'); setError(null); }}
            >
              <span>Already created your account? <strong style={{ color: 'var(--accent-primary)' }}>Log In here</strong></span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'login') {
    return (
      <div className="land-screen">
        <div className="land-panel">
          <div className="land-logo-row">
            <div className="land-logo-mark"><Shield size={16} strokeWidth={2} /></div>
            <span className="land-logo-name">Gateway</span>
          </div>

          <div className="land-heading-block">
            <h1 className="land-h1">Sign in to your account</h1>
            <p className="land-sub">Log in with the credentials you created to resume chatting with {ownerName}.</p>
          </div>

          {error && <div className="land-error-bar">{error}</div>}

          <form className="land-form" onSubmit={handleLogin}>
            <div className="land-field">
              <label className="land-label">Email</label>
              <div className="land-input-row">
                <Mail size={14} className="land-input-icon" />
                <input
                  type="email"
                  required
                  className="land-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="land-field">
              <label className="land-label">Password</label>
              <div className="land-input-row">
                <Lock size={14} className="land-input-icon" />
                <input
                  type="password"
                  required
                  className="land-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} className="land-primary-btn">
              {isSubmitting ? 'Signing in...' : 'Sign In'}
              <ArrowRight size={15} />
            </button>
          </form>

          <div style={{ marginTop: 16, textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
            Need to register instead?{' '}
            <button
              type="button"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent-primary)',
                cursor: 'pointer',
                fontWeight: 600,
                padding: 0,
              }}
              onClick={() => {
                setStep('register');
                setError(null);
              }}
            >
              Register
            </button>
          </div>

          <button className="land-ghost-btn" onClick={() => setStep('welcome')}>
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="land-screen">
      <div className="land-panel">
        <div className="land-logo-row">
          <div className="land-logo-mark"><Shield size={16} strokeWidth={2} /></div>
          <span className="land-logo-name">Gateway</span>
        </div>

        <div className="land-heading-block">
          <h1 className="land-h1">Create account</h1>
          <p className="land-sub">Set up your credentials to access your private channel with {ownerName}.</p>
        </div>

        {error && <div className="land-error-bar">{error}</div>}

        <form className="land-form" onSubmit={handleRegister}>
          <div className="land-field">
            <label className="land-label">Full name</label>
            <div className="land-input-row">
              <UserIcon size={14} className="land-input-icon" />
              <input
                type="text"
                required
                className="land-input"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>
          </div>

          <div className="land-field">
            <label className="land-label">Email</label>
            <div className="land-input-row">
              <Mail size={14} className="land-input-icon" />
              <input
                type="email"
                required
                className="land-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
          </div>

          <div className="land-field">
            <label className="land-label">Password</label>
            <div className="land-input-row">
              <Lock size={14} className="land-input-icon" />
              <input
                type="password"
                required
                className="land-input"
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>

          <button type="submit" disabled={isSubmitting} className="land-primary-btn">
            {isSubmitting ? 'Creating account...' : 'Open private chat'}
            <ArrowRight size={15} />
          </button>
        </form>

        <div style={{ marginTop: 16, textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
          Already created your account?{' '}
          <button
            type="button"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-primary)',
              cursor: 'pointer',
              fontWeight: 600,
              padding: 0,
            }}
            onClick={() => {
              setStep('login');
              setError(null);
            }}
          >
            Log In
          </button>
        </div>

        <button className="land-ghost-btn" onClick={() => setStep('welcome')}>
          Back
        </button>
      </div>
    </div>
  );
};
