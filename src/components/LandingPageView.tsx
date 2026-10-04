import React, { useState } from 'react';
import { ArrowRight, Lock, Mail, Shield, MessageSquare, Key, ShieldCheck, Moon, Sun, Sparkles, Download, Eye, EyeOff } from 'lucide-react';
import type { User, ThemeMode } from '../types';
import { API_BASE } from '../config';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';

interface LandingPageViewProps {
  ownerName: string;
  theme?: ThemeMode;
  onToggleTheme?: () => void;
  onLoginSuccess: (user: User) => void;
  onOpenInvitePrompt?: () => void;
}

export const LandingPageView: React.FC<LandingPageViewProps> = ({
  ownerName,
  theme = 'dark',
  onToggleTheme,
  onLoginSuccess,
}) => {
  const {
    isInstallable,
    isIOS,
    hasPrompt,
    showGuide,
    setShowGuide,
    installApp,
    triggerNativePrompt,
  } = usePWAInstall();
  const [tab, setTab] = useState<'signin' | 'invite'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState('');
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
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid email or password');
      if (data.token) localStorage.setItem('gateway_token', data.token);
      onLoginSuccess(data.user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid credentials. Please verify your email and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = inviteCodeInput.trim().toUpperCase();
    if (!cleanCode) {
      setError('Please enter a valid invitation code.');
      return;
    }
    window.location.href = `/invite/${cleanCode}`;
  };

  return (
    <div className="land-screen">
      <div className="land-container">
        {/* Sharp Precision Top Bar */}
        <header className="land-topbar">
          <div className="land-logo-row">
            <div className="land-logo-mark">G</div>
            <div className="land-logo-text-block">
              <span className="land-logo-name">Gateway</span>
              <span className="land-logo-sub">PERSONAL 1-ON-1 VAULT</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isInstallable && (
              <button
                type="button"
                className="land-theme-toggle-btn"
                style={{ color: 'var(--accent-primary)', borderColor: 'var(--border-strong)' }}
                onClick={installApp}
                title="Install Gateway as Desktop or Mobile PWA App"
              >
                <Download size={13} strokeWidth={2} />
                <span>Install App</span>
              </button>
            )}

            {onToggleTheme && (
              <button
                type="button"
                className="land-theme-toggle-btn"
                onClick={onToggleTheme}
                title={`Current Theme: ${theme.toUpperCase()} — Click to cycle color theme`}
              >
                {theme === 'light' ? (
                  <Sun size={13} strokeWidth={2} />
                ) : theme === 'midnight' ? (
                  <Sparkles size={13} strokeWidth={2} />
                ) : (
                  <Moon size={13} strokeWidth={2} />
                )}
                <span>{theme === 'midnight' ? 'Midnight' : theme === 'light' ? 'Light' : 'Obsidian'}</span>
              </button>
            )}
          </div>
        </header>

        {/* Main Grid: Architecture (Left) + Terminal (Right) */}
        <div className="land-grid">
          {/* Left Column: System Architecture */}
          <div className="land-hero-col">
            <div className="land-classification-tag">
              <ShieldCheck size={12} strokeWidth={2} />
              <span>STRICT 1:1 ARCHITECTURE</span>
            </div>

            <h1 className="land-h1">
              Private, point-to-point communication with {ownerName}.
            </h1>

            <p className="land-sub">
              No public user directories, no social feeds, and no guest-to-guest discovery.
              Every invited guest communicates exclusively and confidentially with {ownerName}.
            </p>

            <div className="land-specs-grid">
              <div className="land-spec-card">
                <div className="land-spec-header">
                  <Shield size={13} strokeWidth={2} />
                  <span>[01] Complete Isolation</span>
                </div>
                <p className="land-spec-desc">
                  Guests cannot search for, view, or communicate with any other participant.
                </p>
              </div>

              <div className="land-spec-card">
                <div className="land-spec-header">
                  <MessageSquare size={13} strokeWidth={2} />
                  <span>[02] Rich Media &amp; Voice</span>
                </div>
                <p className="land-spec-desc">
                  Direct lossless audio memos, uncompressed attachments, and responsive real-time chat.
                </p>
              </div>

              <div className="land-spec-card">
                <div className="land-spec-header">
                  <Key size={13} strokeWidth={2} />
                  <span>[03] Cryptographic Access</span>
                </div>
                <p className="land-spec-desc">
                  Access requires a single-use or multi-use invitation pass generated by the system owner.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Sharp Access Terminal */}
          <div className="land-terminal-card">
            {/* Mode Switcher */}
            <div className="land-tabs">
              <button
                type="button"
                className={`land-tab-btn ${tab === 'signin' ? 'active' : ''}`}
                onClick={() => {
                  setTab('signin');
                  setError(null);
                }}
              >
                SIGN IN
              </button>
              <button
                type="button"
                className={`land-tab-btn ${tab === 'invite' ? 'active' : ''}`}
                onClick={() => {
                  setTab('invite');
                  setError(null);
                }}
              >
                INVITATION PASS
              </button>
            </div>

            {error && <div className="land-error-bar">{error}</div>}

            {tab === 'signin' ? (
              <form className="land-form" onSubmit={handleLogin}>
                <div className="land-field">
                  <label className="land-label">Email or Username</label>
                  <div className="land-input-row">
                    <Mail size={14} className="land-input-icon" />
                    <input
                      type="text"
                      required
                      className="land-input"
                      placeholder="kilogbede19@gmail.com or micheal"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="username"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck="false"
                    />
                  </div>
                </div>

                <div className="land-field">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="land-label">Password</label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 4px',
                        fontFamily: 'var(--font-mono)',
                      }}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                      <span>{showPassword ? 'Hide' : 'Show'}</span>
                    </button>
                  </div>
                  <div className="land-input-row">
                    <Lock size={14} className="land-input-icon" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      className="land-input"
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck="false"
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="land-primary-btn">
                  {loading ? 'Authenticating...' : 'Enter Gateway'}
                  <ArrowRight size={14} strokeWidth={2} />
                </button>

                <p className="land-spec-desc" style={{ marginTop: 10, textAlign: 'center', fontSize: 11.5 }}>
                  Invited guest? Sign in with the email and password you created during invite setup.
                </p>
              </form>
            ) : (
              <form className="land-form" onSubmit={handleInviteSubmit}>
                <div className="land-field">
                  <label className="land-label">Invitation Pass Code</label>
                  <div className="land-input-row">
                    <Key size={14} className="land-input-icon" />
                    <input
                      type="text"
                      required
                      className="land-input"
                      placeholder="e.g. 7A9K2M"
                      value={inviteCodeInput}
                      onChange={(e) => setInviteCodeInput(e.target.value)}
                      autoComplete="off"
                      autoFocus
                    />
                  </div>
                </div>

                <p className="land-spec-desc">
                  Received an invite from {ownerName}? Enter your code or paste your full invitation URL into your browser to unlock your private channel.
                </p>

                <button type="submit" className="land-primary-btn">
                  <span>Validate Pass</span>
                  <ArrowRight size={14} strokeWidth={2} />
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Sharp Precision Footer */}
        <footer className="land-footer">
          <span>GATEWAY SPECIFICATION // END-TO-END POINT-TO-POINT</span>
          <span>ZERO AUDIENCE • NO ALGORITHMIC CURATION</span>
        </footer>
      </div>

      <PWAInstallModal
        isOpen={showGuide}
        onClose={() => setShowGuide(false)}
        isIOS={isIOS}
        hasPrompt={hasPrompt}
        onTriggerPrompt={triggerNativePrompt}
      />
    </div>
  );
};

export default LandingPageView;
