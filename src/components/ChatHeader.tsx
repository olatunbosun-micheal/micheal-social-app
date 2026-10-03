import React from 'react';
import type { User } from '../types';
import { Phone, Video, Search, MoreVertical, ArrowLeft, Shield, Moon, Sun, Sparkles } from 'lucide-react';

interface ChatHeaderProps {
  contactUser: User;
  isTyping: boolean;
  onToggleDrawer: () => void;
  onBack?: () => void;
  showBackButton?: boolean;
  theme?: string;
  onToggleTheme?: () => void;
  onStartCall?: (isVideo: boolean) => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  contactUser,
  isTyping,
  onToggleDrawer,
  onBack,
  showBackButton = false,
  theme,
  onToggleTheme,
  onStartCall,
}) => {
  return (
    <div className="chat-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {showBackButton && (
          <button className="mobile-back-btn" onClick={onBack} title="Back to inbox">
            <ArrowLeft size={16} />
            <span>Inbox</span>
          </button>
        )}

        <div className="chat-header-user" onClick={onToggleDrawer} title="View contact information & media">
          <div className="avatar-container" style={{ width: 38, height: 38 }}>
            {contactUser.avatar ? (
              <img src={contactUser.avatar} alt={contactUser.name} className="avatar-img" />
            ) : (
              <div className="avatar-placeholder">{contactUser.name[0]}</div>
            )}
            {contactUser.isOnline && <div className="online-indicator" />}
          </div>

          <div className="chat-header-details">
            <div className="chat-header-name">
              <span>{contactUser.name}</span>
              {contactUser.role === 'owner' && (
                <span title="Verified Gateway Owner" style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <Shield size={14} color="var(--accent-primary)" />
                </span>
              )}
            </div>

            <div className={`chat-header-status ${isTyping ? 'typing' : contactUser.isOnline ? 'online' : ''}`}>
              {isTyping ? 'typing...' : contactUser.isOnline ? 'online' : `last seen ${contactUser.lastSeen}`}
            </div>
          </div>
        </div>
      </div>

      <div className="chat-header-actions">
        <button
          className="icon-action-btn"
          onClick={() => onStartCall?.(false)}
          title="Direct Voice Call"
        >
          <Phone size={19} />
        </button>

        <button
          className="icon-action-btn"
          onClick={() => onStartCall?.(true)}
          title="Secure Video Call"
        >
          <Video size={20} />
        </button>

        <button
          className="icon-action-btn"
          onClick={() => alert('Message search modal')}
          title="Search conversation"
        >
          <Search size={19} />
        </button>

        {onToggleTheme && (
          <button
            className="icon-action-btn"
            onClick={onToggleTheme}
            title={`Current Theme: ${theme?.toUpperCase() || 'DARK'} — Click to change color theme`}
          >
            {theme === 'light' ? (
              <Sun size={17} />
            ) : theme === 'midnight' ? (
              <Sparkles size={17} />
            ) : (
              <Moon size={17} />
            )}
          </button>
        )}

        <button
          className="icon-action-btn"
          onClick={onToggleDrawer}
          title="Conversation media & details"
        >
          <MoreVertical size={20} />
        </button>
      </div>
    </div>
  );
};
