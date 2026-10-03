import React, { useState } from 'react';
import type { User, Message } from '../types';
import { X, ShieldAlert, BellOff, Trash2, FileText, Download } from 'lucide-react';

interface InfoDrawerProps {
  user: User;
  messages: Message[];
  onClose: () => void;
  onToggleBlockUser: (userId: string) => void;
  onClearChat: () => void;
  onOpenImage: (url: string) => void;
  isCurrentUserOwner: boolean;
}

export const InfoDrawer: React.FC<InfoDrawerProps> = ({
  user,
  messages,
  onClose,
  onToggleBlockUser,
  onClearChat,
  onOpenImage,
  isCurrentUserOwner,
}) => {
  const [activeTab, setActiveTab] = useState<'media' | 'docs' | 'voice'>('media');

  // Collect all media from messages
  const mediaItems: string[] = [];
  const docItems: { name: string; size: number }[] = [];
  const voiceItems: { duration: number; date: string }[] = [];

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
  });

  return (
    <div className="info-drawer">
      <div className="drawer-header">
        <span>Contact Info</span>
        <button className="icon-action-btn" onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      <div className="drawer-profile-card">
        {user.avatar ? (
          <img src={user.avatar} alt={user.name} className="drawer-avatar" />
        ) : (
          <div className="drawer-avatar avatar-placeholder" style={{ fontSize: 32 }}>
            {user.name[0]}
          </div>
        )}
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
        </div>
      </div>
    </div>
  );
};
