import React, { useState } from 'react';
import type { Conversation, Message } from '../types';
import { Search, SlidersHorizontal, Image, Mic, FileText, Pin, UserPlus, Download } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';

interface OwnerInboxProps {
  conversations: Conversation[];
  activeConversationId: string;
  onSelectConversation: (convId: string) => void;
  lastMessages: Record<string, Message | undefined>;
  typingUsers: Record<string, boolean>;
  onOpenSettings?: () => void;
  onOpenInviteModal?: () => void;
}

export const OwnerInbox: React.FC<OwnerInboxProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  lastMessages,
  typingUsers,
  onOpenInviteModal,
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
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'archived'>('all');

  const filteredConversations = conversations.filter((conv) => {
    const matchesSearch =
      conv.guestUser.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.guestUser.email.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === 'unread') {
      return conv.unreadCount > 0;
    }
    if (activeTab === 'archived') {
      return conv.isArchived;
    }
    return !conv.isArchived;
  });

  const formatConversationTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="inbox-sidebar">
      {/* Header */}
      <div className="inbox-header">
        <div className="inbox-header-title">
          <span>Inbox</span>
        </div>
        <div className="inbox-header-actions">
          {isInstallable && (
            <button
              className="control-btn"
              onClick={installApp}
              title="Install Gateway PWA"
              style={{ padding: '4px 8px', color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }}
            >
              <Download size={13} />
              <span>Install</span>
            </button>
          )}

          {onOpenInviteModal && (
            <button
              className="control-btn active"
              onClick={onOpenInviteModal}
              title="Create new invitation link"
              style={{ padding: '4px 10px', fontWeight: 600 }}
            >
              <UserPlus size={14} />
              <span>Invite</span>
            </button>
          )}
          <button className="icon-action-btn" title="Filter & settings">
            <SlidersHorizontal size={18} />
          </button>
        </div>
      </div>

      {/* Search Box */}
      <div className="inbox-search-box">
        <div className="search-input-wrapper">
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            className="search-input"
            placeholder="Search or start new chat"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="inbox-tabs">
        <button
          className={`inbox-tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All
        </button>
        <button
          className={`inbox-tab ${activeTab === 'unread' ? 'active' : ''}`}
          onClick={() => setActiveTab('unread')}
        >
          Unread
        </button>
        <button
          className={`inbox-tab ${activeTab === 'archived' ? 'active' : ''}`}
          onClick={() => setActiveTab('archived')}
        >
          Archived
        </button>
      </div>

      {/* Conversation List */}
      <div className="conversation-list">
        {filteredConversations.length === 0 ? (
          <div className="empty-inbox-wrapper">
            <div className="empty-inbox-icon">
              <UserPlus size={24} />
            </div>
            <div>
              <div className="empty-inbox-title">No conversations yet</div>
              <div className="empty-inbox-desc">
                Your gateway is completely private. Invite someone using a unique link to start a private 1-on-1 chat.
              </div>
            </div>
            {onOpenInviteModal && (
              <button
                className="submit-btn"
                style={{ width: '100%', maxWidth: 220, fontSize: 13, padding: '9px 14px' }}
                onClick={onOpenInviteModal}
              >
                + Invite Someone
              </button>
            )}
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isActive = conv.id === activeConversationId;
            const lastMsg = lastMessages[conv.id];
            const isTyping = typingUsers[conv.guestUser.id];

            return (
              <div
                key={conv.id}
                className={`conversation-item ${isActive ? 'active' : ''}`}
                onClick={() => onSelectConversation(conv.id)}
              >
                <div className="avatar-container">
                  {conv.guestUser.avatar ? (
                    <img
                      src={conv.guestUser.avatar}
                      alt={conv.guestUser.name}
                      className="avatar-img"
                    />
                  ) : (
                    <div className="avatar-placeholder">{conv.guestUser.name[0]}</div>
                  )}
                  {conv.guestUser.isOnline && <div className="online-indicator" />}
                </div>

                <div className="conversation-info">
                  <div className="conversation-top-row">
                    <div className="conversation-name">{conv.guestUser.name}</div>
                    <div className={`conversation-time ${conv.unreadCount > 0 ? 'unread' : ''}`}>
                      {lastMsg ? formatConversationTime(lastMsg.createdAt) : formatConversationTime(conv.updatedAt)}
                    </div>
                  </div>

                  <div className="conversation-bottom-row">
                    <div className={`conversation-preview ${isTyping ? 'typing' : ''}`}>
                      {isTyping ? (
                        <span>typing...</span>
                      ) : lastMsg ? (
                        <>
                          {lastMsg.type === 'image' && <Image size={13} style={{ marginRight: 2 }} />}
                          {lastMsg.type === 'audio' && <Mic size={13} style={{ marginRight: 2 }} />}
                          {lastMsg.type === 'file' && <FileText size={13} style={{ marginRight: 2 }} />}
                          <span>{lastMsg.content}</span>
                        </>
                      ) : (
                        <span>No messages yet</span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {conv.isPinned && <Pin size={12} color="var(--text-muted)" />}
                      {conv.unreadCount > 0 && (
                        <div className="unread-badge">{conv.unreadCount}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
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
