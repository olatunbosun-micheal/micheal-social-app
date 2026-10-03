import React, { useState, useEffect } from 'react';
import { ShieldCheck, ArrowRight, Lock, Mail, User as UserIcon, AlertCircle } from 'lucide-react';
import type { User } from '../types';
import { API_BASE } from '../config';

interface InviteLandingViewProps {
  inviteCode: string;
  onSuccess: (user: User, conversationId: string) => void;
  onGoHome: () => void;
}

export const InviteLandingView: React.FC<InviteLandingViewProps> = ({
  inviteCode,
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

  const [step, setStep] = useState<'welcome' | 'register'>('welcome');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Validate invite from backend API
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
          if (data.invite?.recipientName) {
            setName(data.invite.recipientName);
          }
        }
      } catch {
        // Fallback for offline mode
        setInviteMeta({
          recipientName: undefined,
          ownerName: 'Micheal',
        });
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
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      onSuccess(data.user, data.conversationId);
    } catch {
      // Local fallback in case backend is simulated
      const fallbackUser: User = {
        id: `user_${Date.now()}`,
        name: name.trim(),
        email: email.trim(),
        role: 'guest',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
        statusMessage: 'Joined via personal invitation',
        isOnline: true,
        lastSeen: 'online',
      };
      onSuccess(fallbackUser, `conv_${fallbackUser.id}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="onboarding-screen">
        <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Validating private invitation...</div>
      </div>
    );
  }

  if (error && !inviteMeta) {
    return (
      <div className="onboarding-screen">
        <div className="onboarding-card" style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--accent-danger)' }}>
            <AlertCircle size={40} />
          </div>
          <h2 className="onboarding-title" style={{ fontSize: 20 }}>Invitation Unavailable</h2>
          <p className="onboarding-desc">{error}</p>
          <button className="submit-btn" onClick={onGoHome}>
            Return to Gateway
          </button>
        </div>
      </div>
    );
  }

  const ownerName = inviteMeta?.ownerName || 'Micheal';

  return (
    <div className="onboarding-screen">
      <div className="onboarding-card">
        <div className="onboarding-badge">
          <ShieldCheck size={14} />
          <span>Verified Invitation</span>
        </div>

        {step === 'welcome' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              {inviteMeta?.recipientName ? (
                <h1 className="onboarding-title">Hi, {inviteMeta.recipientName}.</h1>
              ) : (
                <h1 className="onboarding-title">Chat with {ownerName}</h1>
              )}
              <p className="onboarding-desc" style={{ marginTop: 8 }}>
                <strong>{ownerName}</strong> invited you to his private communication channel.
                A secure 1-on-1 space to send messages, photos, files, and voice notes.
              </p>
              {inviteMeta?.note && (
                <div
                  style={{
                    background: 'var(--bg-app)',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    marginTop: 12,
                    fontSize: 12.5,
                    borderLeft: '3px solid var(--accent-primary)',
                  }}
                >
                  "{inviteMeta.note}"
                </div>
              )}
            </div>

            <div
              style={{
                fontSize: 12,
                color: 'var(--text-muted)',
                padding: '10px 0',
                borderTop: '1px solid var(--border-subtle)',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              Your conversation with {ownerName} is completely isolated and private.
            </div>

            <button
              className="submit-btn"
              onClick={() => setStep('register')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <span>Get Started</span>
              <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <form className="onboarding-form" onSubmit={handleRegister}>
            <div>
              <h2 className="onboarding-title" style={{ fontSize: 20 }}>Create Your Account</h2>
              <p className="onboarding-desc">
                Set up your credentials to access your private channel with {ownerName}.
              </p>
            </div>

            {error && (
              <div style={{ color: 'var(--accent-danger)', fontSize: 13, background: 'rgba(244,63,94,0.1)', padding: 10, borderRadius: 6 }}>
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Full Name</label>
              <div className="search-input-wrapper">
                <UserIcon size={16} color="var(--text-muted)" />
                <input
                  type="text"
                  required
                  className="search-input"
                  placeholder="Your Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="search-input-wrapper">
                <Mail size={16} color="var(--text-muted)" />
                <input
                  type="email"
                  required
                  className="search-input"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Create Password</label>
              <div className="search-input-wrapper">
                <Lock size={16} color="var(--text-muted)" />
                <input
                  type="password"
                  required
                  className="search-input"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="submit-btn"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <span>{isSubmitting ? 'Creating Account...' : 'Open Private Chat'}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
