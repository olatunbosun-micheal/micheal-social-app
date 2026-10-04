import React, { useState } from 'react';
import type { User, Message } from '../types';
import {
  X,
  ShieldAlert,
  BellOff,
  Trash2,
  FileText,
  Download,
  Video,
  PhoneMissed,
  PhoneIncoming,
  PhoneOutgoing,
  UserX,
} from 'lucide-react';

interface InfoDrawerProps {
  user: User;
  messages: Message[];
  onClose: () => void;
  onToggleBlockUser: (userId: string) => void;
  onClearChat: () => void;
  onDeleteConversation?: () => void;
  onDeleteUser?: (userId: string) => void;
  onOpenImage: (url: string) => void;
  isCurrentUserOwner: boolean;
}

export const InfoDrawer: React.FC<InfoDrawerProps> = ({
  user,
  messages,
  onClose,
  onToggleBlockUser,
  onClearChat,
  onDeleteConversation,
  onDeleteUser,
  onOpenImage,
  isCurrentUserOwner,
}) => {
  const [activeTab, setActiveTab] = useState<'media' | 'docs' | 'voice' | 'calls'>('media');

  // Collect all media from messages
  const mediaItems: string[] = [];
  const docItems: { name: string; size: number }[] = [];
  const voiceItems: { duration: number; date: string }[] = [];
  const callItems: { isVideo: boolean; status: string; duration: number; date: string; isOutgoing: boolean }[] = [];

  messages.forEach((msg) => {
    msg.attachments?.forEach((att) => {
      if (att.type === 'image') {
        mediaItems.push(att.url);
      } else if (att.type === 'file') {
        docItems.push({ name: att.fileName, size: att.fileSize });
      } else if (att.type === 'audio') {
        voiceItems.push({ duration: att.duration || 14, date: msg.createdAt });
      }
    });

    if (msg.type === 'call') {
      callItems.push({
        isVideo: msg.callLog?.callType === 'video' || msg.content.toLowerCase().includes('video'),
        status: msg.callLog?.status || (msg.callLog?.duration ? 'completed' : 'missed'),
        duration: msg.callLog?.duration || 0,
        date: msg.createdAt,
        isOutgoing: msg.senderId !== user.id,
      });
    }
  });

  const formatDuration = (secs: number) => {
    if (!secs || secs <= 0) return '0s';
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return mins > 0 ? `${mins}m ${rem > 0 ? rem + 's' : ''}` : `${rem}s`;
  };

  return (
    <div className="info-drawer">
      <div className="drawer-header">
        <span>Contact Info</span>
        <button className="icon-action-btn" onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      <div className="drawer-profile-card">
        <div className="drawer-avatar avatar-placeholder" style={{ fontSize: 32 }}>
          {user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
        </div>
        <div className="drawer-name">{user.name}</div>
        <div className="drawer-email">{user.email}</div>
        <div className="drawer-status">{user.statusMessage || 'Available'}</div>
      </div>

      {/* Tabs */}
      <div className="drawer-tabs">
        <button
          className={`drawer-tab ${activeTab === 'media' ? 'active' : ''}`}
          onClick={() => setActiveTab('media')}
        >
          Media ({mediaItems.length})
        </button>
        <button
          className={`drawer-tab ${activeTab === 'docs' ? 'active' : ''}`}
          onClick={() => setActiveTab('docs')}
        >
          Docs ({docItems.length})
        </button>
        <button
          className={`drawer-tab ${activeTab === 'voice' ? 'active' : ''}`}
          onClick={() => setActiveTab('voice')}
        >
          Audio ({voiceItems.length})
        </button>
        <button
          className={`drawer-tab ${activeTab === 'calls' ? 'active' : ''}`}
          onClick={() => setActiveTab('calls')}
        >
          Calls ({callItems.length})
        </button>
      </div>

      <div className="drawer-content">
        {activeTab === 'media' && (
          mediaItems.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0', fontSize: 13 }}>
              No shared media yet
            </div>
          ) : (
            <div className="media-grid">
              {mediaItems.map((url, i) => (
                <div key={i} className="media-grid-item" onClick={() => onOpenImage(url)}>
                  <img src={url} alt={`Shared media ${i}`} />
                </div>
              ))}
            </div>
          )
        )}

        {activeTab === 'docs' && (
          docItems.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0', fontSize: 13 }}>
              No shared documents yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {docItems.map((doc, i) => (
                <div key={i} className="bubble-file-attachment" style={{ margin: 0 }}>
                  <FileText size={20} color="var(--accent-primary)" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="file-name" style={{ fontSize: 12.5 }}>{doc.name}</div>
                    <div className="file-size">{(doc.size / (1024 * 1024)).toFixed(1)} MB</div>
                  </div>
                  <Download size={14} color="var(--text-muted)" style={{ cursor: 'pointer' }} />
                </div>
              ))}
            </div>
          )
        )}

        {activeTab === 'voice' && (
          voiceItems.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0', fontSize: 13 }}>
              No voice recordings yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {voiceItems.map((v, i) => (
                <div key={i} className="bubble-file-attachment" style={{ margin: 0, justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13 }}>Voice message ({v.duration}s)</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {new Date(v.date).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )
        )}

        {activeTab === 'calls' && (
          callItems.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0', fontSize: 13 }}>
              No recorded call logs yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {callItems.map((c, i) => (
                <div
                  key={i}
                  className="bubble-file-attachment"
                  style={{
                    margin: 0,
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background:
                          c.status === 'missed' || c.status === 'declined'
                            ? 'rgba(239, 68, 68, 0.15)'
                            : 'rgba(16, 185, 129, 0.15)',
                        color:
                          c.status === 'missed' || c.status === 'declined'
                            ? '#ef4444'
                            : '#10b981',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {c.isVideo ? (
                        <Video size={15} />
                      ) : c.status === 'missed' ? (
                        <PhoneMissed size={15} />
                      ) : c.isOutgoing ? (
                        <PhoneOutgoing size={15} />
                      ) : (
                        <PhoneIncoming size={15} />
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {c.isVideo ? 'Video Call' : 'Voice Call'}
                      </div>
                      <div
                        style={{
                          fontSize: 11.5,
                          marginTop: 2,
                          color:
                            c.status === 'missed' || c.status === 'declined'
                              ? '#ef4444'
                              : 'var(--text-secondary)',
                        }}
                      >
                        {c.status === 'missed'
                          ? c.isOutgoing
                            ? 'No answer'
                            : 'Missed'
                          : c.status === 'declined'
                          ? 'Declined'
                          : c.duration > 0
                          ? `Duration: ${formatDuration(c.duration)}`
                          : 'Completed'}
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {new Date(c.date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )
        )}

        {/* Action Buttons */}
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="control-btn" style={{ justifyContent: 'center', padding: '10px' }}>
            <BellOff size={15} />
            <span>Mute Notifications</span>
          </button>

          {isCurrentUserOwner && (
            <button
              className="control-btn"
              style={{
                justifyContent: 'center',
                padding: '10px',
                color: user.isBlocked ? 'var(--accent-primary)' : 'var(--accent-danger)',
                borderColor: user.isBlocked ? 'var(--accent-primary)' : 'var(--accent-danger)',
              }}
              onClick={() => onToggleBlockUser(user.id)}
            >
              <ShieldAlert size={15} />
              <span>{user.isBlocked ? 'Unblock User' : 'Block User'}</span>
            </button>
          )}

          <button
            className="control-btn"
            style={{ justifyContent: 'center', padding: '10px', color: 'var(--text-muted)' }}
            onClick={onClearChat}
          >
            <Trash2 size={15} />
            <span>Clear Chat History</span>
          </button>

          {onDeleteConversation && (
            <button
              className="control-btn"
              style={{
                justifyContent: 'center',
                padding: '10px',
                color: '#ef4444',
                borderColor: 'rgba(239, 68, 68, 0.3)',
              }}
              onClick={() => {
                if (window.confirm(`Are you sure you want to delete this conversation with ${user.name}? All message history will be permanently wiped.`)) {
                  onDeleteConversation();
                }
              }}
            >
              <Trash2 size={15} />
              <span>Delete Conversation</span>
            </button>
          )}

          {isCurrentUserOwner && onDeleteUser && (
            <button
              className="control-btn"
              style={{
                justifyContent: 'center',
                padding: '10px',
                color: '#ef4444',
                background: 'rgba(239, 68, 68, 0.08)',
                borderColor: 'rgba(239, 68, 68, 0.5)',
                fontWeight: 600,
              }}
              onClick={() => {
                if (window.confirm(`⚠️ DANGER: Permanently delete user "${user.name}"? This will terminate their active sessions, delete their login access, and wipe their private channel.`)) {
                  onDeleteUser(user.id);
                }
              }}
            >
              <UserX size={15} />
              <span>Delete User Account</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
