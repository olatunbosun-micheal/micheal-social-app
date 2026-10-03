import React, { useState, useEffect } from 'react';
import type { User, ThemeMode } from './types';
import { OwnerShell } from './components/owner/OwnerShell';
import { GuestShell } from './components/guest/GuestShell';
import { InviteLandingView } from './components/InviteLandingView';
import { LandingPageView } from './components/LandingPageView';
import { API_BASE } from './config';

export const App: React.FC = () => {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    return (localStorage.getItem('gateway_theme') as ThemeMode) || 'dark';
  });

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [activeInviteCode, setActiveInviteCode] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const match = window.location.pathname.match(/\/(?:invite|i)\/([a-zA-Z0-9]+)/);
      return match ? match[1] : null;
    }
    return null;
  });

  // Sync theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('gateway_theme', theme);
  }, [theme]);

  // Check existing session token on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('gateway_token');
      if (!token) {
        setAuthChecked(true);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setCurrentUser(data.user);
          } else {
            localStorage.removeItem('gateway_token');
          }
        } else {
          localStorage.removeItem('gateway_token');
        }
      } catch {
        // Network offline, keep token
      } finally {
        setAuthChecked(true);
      }
    };

    checkAuth();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('gateway_token');
    setCurrentUser(null);
    window.location.href = '/';
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : prev === 'light' ? 'midnight' : 'dark'));
  };

  // Loading state while checking token
  if (!authChecked) {
    return (
      <div className="onboarding-screen">
        <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          Connecting to Gateway...
        </div>
      </div>
    );
  }

  // 1. If an invitation link is opened and user is not yet logged in
  if (activeInviteCode && !currentUser) {
    return (
      <InviteLandingView
        inviteCode={activeInviteCode}
        theme={theme}
        onToggleTheme={toggleTheme}
        onSuccess={(user) => {
          setCurrentUser(user);
          setActiveInviteCode(null);
          window.history.pushState({}, '', '/');
        }}
        onGoHome={() => {
          setActiveInviteCode(null);
          window.history.pushState({}, '', '/');
        }}
      />
    );
  }

  // 2. If user is authenticated, route to appropriate dedicated shell
  if (currentUser) {
    if (currentUser.role === 'owner') {
      return (
        <OwnerShell
          ownerUser={currentUser}
          onLogout={handleLogout}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      );
    }

    // Guest App Shell (100% isolated 1-on-1 private chat with Owner)
    return (
      <GuestShell
        currentUser={currentUser}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  // 3. If unauthenticated, show public landing page
  return (
    <LandingPageView
      ownerName="Micheal"
      theme={theme}
      onToggleTheme={toggleTheme}
      onLoginSuccess={(user) => {
        setCurrentUser(user);
      }}
      onOpenInvitePrompt={() => {
        const code = prompt('Enter your invitation code (e.g. A8K29Lm):');
        if (code && code.trim()) {
          setActiveInviteCode(code.trim().toUpperCase());
        }
      }}
    />
  );
};

export default App;
