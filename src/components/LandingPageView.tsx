import React, { useState } from 'react';
import { ArrowRight, Lock, Mail, MessageSquare, Key, ShieldCheck, Moon, Sun, Sparkles, Download, Eye, EyeOff, Send } from 'lucide-react';
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
  
  const [tab, setTab] = useState<'signin' | 'invite' | 'request'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [requestEmail, setRequestEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
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

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestEmail.trim()) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    
    try {
      const res = await fetch(`${API_BASE}/invites/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: requestEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to request invite');
      
      setSuccessMsg('Request received! The owner will send an invitation link to your email shortly.');
      setRequestEmail('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing-modern-wrapper">
      <div className="landing-modern-container">
        {/* Navbar */}
        <header className="landing-navbar">
          <div className="landing-logo">
            <div className="landing-logo-icon"><ShieldCheck size={20} /></div>
            <span className="landing-logo-text">MA's Social App</span>
          </div>

          <div className="landing-nav-actions">
            {isInstallable && (
              <button className="landing-nav-btn install-btn" onClick={installApp}>
                <Download size={14} /> Install App
              </button>
            )}
            {onToggleTheme && (
              <button className="landing-nav-btn icon-only" onClick={onToggleTheme}>
                {theme === 'light' ? <Sun size={16} /> : theme === 'midnight' ? <Sparkles size={16} /> : <Moon size={16} />}
              </button>
            )}
          </div>
        </header>

        {/* Hero Section & Form Grid */}
        <div className="landing-hero-grid">
          {/* Left: Hero Copy */}
          <div className="landing-hero-content">
            <h1 className="landing-title">
              Connect directly with <span className="highlight-text">{ownerName}</span>.
            </h1>
            <p className="landing-subtitle">
              Step into your exclusive communication hub. No crowded feeds or public profiles—just meaningful, secure, and private 1-on-1 conversations.
            </p>
            
            <div className="landing-features">
              <div className="feature-item">
                <div className="feature-icon"><Lock size={18} /></div>
                <div>
                  <h4>Absolute Privacy</h4>
                  <p>100% isolated chat instances.</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon"><MessageSquare size={18} /></div>
                <div>
                  <h4>Rich Media & Voice</h4>
                  <p>Lossless audio & real-time messaging.</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon"><Key size={18} /></div>
                <div>
                  <h4>Invite-Only Access</h4>
                  <p>Secured via cryptographic passes.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Glassmorphism Form Card */}
          <div className="landing-form-glass">
            <div className="landing-tabs">
              <button 
                className={`landing-tab ${tab === 'signin' ? 'active' : ''}`}
                onClick={() => { setTab('signin'); setError(null); setSuccessMsg(null); }}
              >
                Sign In
              </button>
              <button 
                className={`landing-tab ${tab === 'invite' ? 'active' : ''}`}
                onClick={() => { setTab('invite'); setError(null); setSuccessMsg(null); }}
              >
                Have Invite
              </button>
              <button 
                className={`landing-tab ${tab === 'request' ? 'active' : ''}`}
                onClick={() => { setTab('request'); setError(null); setSuccessMsg(null); }}
              >
                Request Access
              </button>
            </div>

            <div className="landing-form-body">
              {error && <div className="landing-alert error">{error}</div>}
              {successMsg && <div className="landing-alert success">{successMsg}</div>}

              {tab === 'signin' && (
                <form onSubmit={handleLogin} className="landing-form">
                  <div className="landing-field">
                    <label>Email Address</label>
                    <div className="input-wrapper">
                      <Mail size={16} />
                      <input 
                        type="email" 
                        required 
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="landing-field">
                    <div className="label-row">
                      <label>Password</label>
                      <button type="button" className="toggle-pwd" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />} {showPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    <div className="input-wrapper">
                      <Lock size={16} />
                      <input 
                        type={showPassword ? 'text' : 'password'} 
                        required 
                        placeholder="Enter password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="landing-btn-primary">
                    {loading ? 'Authenticating...' : 'Enter App'} <ArrowRight size={16} />
                  </button>
                </form>
              )}

              {tab === 'invite' && (
                <form onSubmit={handleInviteSubmit} className="landing-form">
                  <p className="landing-form-desc">
                    Paste the invitation code provided by {ownerName} to set up your private channel.
                  </p>
                  <div className="landing-field">
                    <label>Invitation Pass Code</label>
                    <div className="input-wrapper">
                      <Key size={16} />
                      <input 
                        type="text" 
                        required 
                        placeholder="e.g. 7A9K2M"
                        value={inviteCodeInput}
                        onChange={(e) => setInviteCodeInput(e.target.value)}
                      />
                    </div>
                  </div>
                  <button type="submit" className="landing-btn-primary">
                    Validate Pass <ArrowRight size={16} />
                  </button>
                </form>
              )}

              {tab === 'request' && (
                <form onSubmit={handleRequestSubmit} className="landing-form">
                  <p className="landing-form-desc">
                    Don't have an invite? Leave your email and {ownerName} will send you an invitation link to join.
                  </p>
                  <div className="landing-field">
                    <label>Your Email</label>
                    <div className="input-wrapper">
                      <Mail size={16} />
                      <input 
                        type="email" 
                        required 
                        placeholder="Email to receive the link"
                        value={requestEmail}
                        onChange={(e) => setRequestEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="landing-btn-primary">
                    {loading ? 'Sending...' : 'Request Link'} <Send size={16} />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>


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
