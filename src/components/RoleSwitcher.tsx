import React, { useState } from 'react';
import type { User, ThemeMode } from '../types';
import { ShieldCheck, Moon, Sun, Sparkles, RefreshCw, ChevronDown, Smartphone, Monitor } from 'lucide-react';

interface RoleSwitcherProps {
  currentUser: User | null;
  guestUsers: Record<string, User>;
  onSelectUser: (userId: string | 'onboarding' | 'landing') => void;
  isAutoResponderEnabled: boolean;
  onToggleAutoResponder: () => void;
  isPhoneMockup: boolean;
  onTogglePhoneMockup: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onResetData: () => void;
  isLiveDbMode: boolean;
  onToggleLiveDbMode: () => void;
}

export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({
  currentUser,
  guestUsers,
  onSelectUser,
  isAutoResponderEnabled,
  onToggleAutoResponder,
  isPhoneMockup,
  onTogglePhoneMockup,
  theme,
  onToggleTheme,
  onResetData,
  isLiveDbMode,
  onToggleLiveDbMode,
}) => {
  const [showToolsMenu, setShowToolsMenu] = useState(false);

  return (
    <div className="control-bar">
      <div className="control-bar-left">
        <div className="brand-badge">
          <div className="brand-icon">
            <ShieldCheck size={14} />
          </div>
          <span className="brand-title">Gateway</span>
        </div>

        <div className="role-selector-wrapper">
          <select
            className="role-select"
            value={currentUser ? currentUser.id : 'onboarding'}
            onChange={(e) => onSelectUser(e.target.value as any)}
            title="Switch Active Account / View"
          >
            <option value="user_micheal">Micheal (Owner)</option>
            {!isLiveDbMode && (
              <optgroup label="Demo Guests (Simulated)">
                {Object.values(guestUsers).map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} (Guest)
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label="Landing & Onboarding">
              <option value="landing">Public Landing Page</option>
              <option value="onboarding">Guest Register View</option>
            </optgroup>
          </select>
          <ChevronDown size={12} color="var(--text-muted)" style={{ pointerEvents: 'none' }} />
        </div>

        <button
          className={`mode-indicator-pill ${isLiveDbMode ? 'live' : 'demo'}`}
          onClick={onToggleLiveDbMode}
          title={isLiveDbMode ? 'Switched to Live Database Mode' : 'Switched to Demo Mock Mode'}
        >
          <span className="mode-dot" />
          <span>{isLiveDbMode ? 'Live DB' : 'Demo Mode'}</span>
        </button>
      </div>

      <div className="control-bar-right">
        {/* Desktop Quick Actions */}
        <div className="desktop-control-group">
          <button
            className={`control-btn ${isAutoResponderEnabled ? 'active' : ''}`}
            onClick={onToggleAutoResponder}
            title="Toggle realistic simulated responses"
          >
            <Sparkles size={13} />
            <span>Auto-Reply {isAutoResponderEnabled ? 'ON' : 'OFF'}</span>
          </button>

          <button
            className={`control-btn ${isPhoneMockup ? 'active' : ''}`}
            onClick={onTogglePhoneMockup}
            title="Toggle Mobile Mockup Frame"
          >
            {isPhoneMockup ? <Smartphone size={13} /> : <Monitor size={13} />}
            <span>{isPhoneMockup ? 'Frame' : 'Full'}</span>
          </button>

          <button className="control-btn" onClick={onToggleTheme} title="Switch Theme">
            {theme === 'dark' ? <Moon size={13} /> : <Sun size={13} />}
          </button>

          <button className="control-btn" onClick={onResetData} title="Reset Data">
            <RefreshCw size={12} />
          </button>
        </div>

        {/* Mobile Sleek Menu Toggle */}
        <div className="mobile-control-group">
          <button
            className="control-btn"
            onClick={onToggleTheme}
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Moon size={13} /> : <Sun size={13} />}
          </button>

          <button
            className="control-btn"
            onClick={() => setShowToolsMenu(!showToolsMenu)}
            title="More Options"
          >
            <span style={{ fontSize: 11 }}>Tools</span>
            <ChevronDown size={11} />
          </button>
        </div>
      </div>

      {/* Mobile Tools Dropdown Popover */}
      {showToolsMenu && (
        <div className="mobile-tools-dropdown" onClick={() => setShowToolsMenu(false)}>
          <div className="mobile-tools-menu" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-tools-header">
              <span>Developer Controls</span>
            </div>
            <button
              className={`mobile-tool-item ${isAutoResponderEnabled ? 'active' : ''}`}
              onClick={() => {
                onToggleAutoResponder();
                setShowToolsMenu(false);
              }}
            >
              <Sparkles size={14} />
              <span>Auto-Reply: {isAutoResponderEnabled ? 'Enabled' : 'Disabled'}</span>
            </button>

            <button
              className="mobile-tool-item"
              onClick={() => {
                onToggleLiveDbMode();
                setShowToolsMenu(false);
              }}
            >
              <span className={`mode-dot ${isLiveDbMode ? 'live' : 'demo'}`} />
              <span>Switch to {isLiveDbMode ? 'Demo Mode' : 'Live DB Mode'}</span>
            </button>

            <button
              className="mobile-tool-item"
              onClick={() => {
                onResetData();
                setShowToolsMenu(false);
              }}
            >
              <RefreshCw size={14} />
              <span>Reset State</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

