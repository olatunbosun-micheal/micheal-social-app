import React, { useState } from 'react';
import { ShieldCheck, ArrowRight, Lock, Mail, User as UserIcon } from 'lucide-react';
import type { User } from '../types';

interface OnboardingModalProps {
  ownerName: string;
  onComplete: (newUser: User) => void;
  onCancel: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  ownerName,
  onComplete,
  onCancel,
}) => {
  const [step, setStep] = useState<'form' | 'ready'>('form');
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;
    setStep('ready');
  };

  const handleOpenChat = () => {
    const maleAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=85';
    const femaleAvatar = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=85';

    const newUser: User = {
      id: `user_${Date.now()}`,
      name: name.trim(),
      email: email.trim(),
      role: 'guest',
      gender,
      avatar: gender === 'female' ? femaleAvatar : maleAvatar,
      statusMessage: 'Joined via personal invitation',
      isOnline: true,
      lastSeen: 'online',
    };
    onComplete(newUser);
  };

  return (
    <div className="onboarding-screen">
      <div className="onboarding-card">
        <div className="onboarding-badge">
          <ShieldCheck size={14} />
          <span>Private Gateway Access</span>
        </div>

        {step === 'form' ? (
          <>
            <div>
              <h1 className="onboarding-title">Welcome</h1>
              <p className="onboarding-desc">
                You have an exclusive, private conversation with <strong>{ownerName}</strong>.
                Create your account to continue.
              </p>
            </div>

            <form className="onboarding-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <div className="search-input-wrapper">
                  <UserIcon size={16} color="var(--text-muted)" />
                  <input
                    type="text"
                    required
                    className="search-input"
                    placeholder="e.g. Alex Morgan"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Gender (profile picture)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => setGender('male')}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 4,
                      border: gender === 'male' ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                      background: gender === 'male' ? 'rgba(79, 126, 255, 0.12)' : 'var(--bg-card)',
                      color: gender === 'male' ? 'var(--text-primary)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    👨 Male
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender('female')}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 4,
                      border: gender === 'female' ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                      background: gender === 'female' ? 'rgba(79, 126, 255, 0.12)' : 'var(--bg-card)',
                      color: gender === 'female' ? 'var(--text-primary)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    👩 Female
                  </button>
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
                    placeholder="alex@example.com"
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
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <button type="submit" className="submit-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span>Continue</span>
                <ArrowRight size={16} />
              </button>

              <button
                type="button"
                className="control-btn"
                style={{ justifyContent: 'center', border: 'none', background: 'transparent' }}
                onClick={onCancel}
              >
                Back to Gateway View
              </button>
            </form>
          </>
        ) : (
          <>
            <div>
              <h1 className="onboarding-title">Welcome, {name}</h1>
              <p className="onboarding-desc">
                Your private conversation with <strong>{ownerName}</strong> is ready.
                No third parties, no user directory, no public feeds.
              </p>
            </div>

            <button
              className="submit-btn"
              onClick={handleOpenChat}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <span>Open Chat</span>
              <ArrowRight size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};
