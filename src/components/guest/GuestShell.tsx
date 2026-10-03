import React, { useState, useEffect } from 'react';
import type { User, Message, ReplyContext } from '../../types';
import { ChatHeader } from '../ChatHeader';
import { MessageList } from '../MessageList';
import { MessageComposer } from '../MessageComposer';
import { InfoDrawer } from '../InfoDrawer';
import { MediaLightbox } from '../MediaLightbox';
import { API_BASE } from '../../config';
import { realtimeClient } from '../../services/realtimeClient';
import { LogOut, Moon, Sun, ShieldCheck } from 'lucide-react';

interface GuestShellProps {
  currentUser: User;
  onLogout: () => void;
  theme: string;
  onToggleTheme: () => void;
}

export const GuestShell: React.FC<GuestShellProps> = ({
  currentUser,
  onLogout,
  theme,
  onToggleTheme,
}) => {
  const [ownerUser, setOwnerUser] = useState<User>({
    id: 'user_micheal',
    name: 'Micheal',
    email: 'micheal@gateway.internal',
    role: 'owner',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    statusMessage: 'Available for private 1-on-1 briefings & discussions',
    isOnline: true,
    lastSeen: 'online',
  });

  const [conversationId, setConversationId] = useState<string>(`conv_${currentUser.id}`);
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyTo, setReplyTo] = useState<ReplyContext | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxCaption, setLightboxCaption] = useState<string | undefined>(undefined);
  const [isOwnerTyping, setIsOwnerTyping] = useState(false);
  const [loading, setLoading] = useState(true);

  const token = typeof window !== 'undefined' ? localStorage.getItem('gateway_token') : null;

  // Fetch Guest's single private conversation & message history
  const fetchConversationData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.conversations && data.conversations.length > 0) {
          const conv = data.conversations[0];
          setConversationId(conv.id);
          if (conv.ownerUser) {
            setOwnerUser({
              ...conv.ownerUser,
              role: 'owner',
            });
          }

          // Fetch messages
          const msgRes = await fetch(`${API_BASE}/conversations/${conv.id}/messages`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (msgRes.ok) {
            const msgData = await msgRes.json();
            setMessages(msgData.messages || []);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to load guest conversation:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversationData();

    if (token) {
      realtimeClient.init(token);

      realtimeClient.on('message.created', (newMsg: Message) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      });

      realtimeClient.on('typing.started', ({ userId }: { userId: string }) => {
        if (userId === ownerUser.id) {
          setIsOwnerTyping(true);
        }
      });

      realtimeClient.on('typing.stopped', ({ userId }: { userId: string }) => {
        if (userId === ownerUser.id) {
          setIsOwnerTyping(false);
        }
      });

      realtimeClient.on('presence.updated', ({ userId, isOnline, lastSeen }: { userId: string; isOnline: boolean; lastSeen: string }) => {
        if (userId === ownerUser.id) {
          setOwnerUser((prev) => ({ ...prev, isOnline, lastSeen }));
        }
      });
    }

    // Auto-refresh periodically as a fallback
    const interval = setInterval(fetchConversationData, 3500);
    return () => clearInterval(interval);
  }, [token]);

  // Join the conversation room once conversationId is set
  useEffect(() => {
    if (conversationId) {
      realtimeClient.joinConversation(conversationId);
    }
  }, [conversationId]);

  // Send message handler
  const handleSendMessage = async (
    content: string,
    type: 'text' | 'image' | 'video' | 'file' | 'audio' = 'text',
    fileData?: { url: string; fileName: string; fileSize: number; duration?: number }
  ) => {
    const tempId = `msg_${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      conversationId,
      senderId: currentUser.id,
      type,
      content: content.trim(),
      attachments: fileData
        ? [
            {
              id: `att_${Date.now()}`,
              type: (type === 'text' ? 'file' : type) as 'image' | 'video' | 'audio' | 'file',
              url: fileData.url,
              fileName: fileData.fileName,
              fileSize: fileData.fileSize,
              mimeType:
                type === 'image'
                  ? 'image/jpeg'
                  : type === 'video'
                  ? 'video/mp4'
                  : type === 'audio'
                  ? 'audio/mp4'
                  : 'application/octet-stream',
              duration: fileData.duration,
            },
          ]
        : undefined,
      replyTo: replyTo || undefined,
      status: 'sent',
      reactions: [],
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setReplyTo(null);

    if (token && conversationId) {
      try {
        const res = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            type,
            content: content.trim(),
            attachments: optimisticMessage.attachments,
            replyToId: replyTo?.id,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          // Update temp message with real persisted message
          setMessages((prev) =>
            prev.map((m) => (m.id === tempId ? data.message : m))
          );
        }
      } catch (err) {
        console.warn('Send message failed:', err);
      }
    }
  };

  const handleReact = async (messageId: string, emoji: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ emoji }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? data.message : m))
        );
      }
    } catch (err) {
      console.warn('Reaction failed:', err);
    }
  };

  const handleTypingStart = () => {
    if (conversationId) {
      realtimeClient.sendTyping(conversationId, true);
    }
  };

  const handleTypingStop = () => {
    if (conversationId) {
      realtimeClient.sendTyping(conversationId, false);
    }
  };

  return (
    <div className="guest-shell-container">
      {/* Centered Luxury Glass Container for Desktop & Immersive Mobile */}
      <div className="guest-chat-wrapper">
        {/* Chat Header dedicated to Owner */}
        <ChatHeader
          contactUser={ownerUser}
          isTyping={isOwnerTyping}
          onToggleDrawer={() => setIsDrawerOpen(!isDrawerOpen)}
          showBackButton={false}
          theme={theme}
          onToggleTheme={onToggleTheme}
        />

        {/* Message Stream */}
        {loading && messages.length === 0 ? (
          <div className="messages-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              Connecting to your private channel with {ownerUser.name}...
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="messages-container" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24 }}>
            <div style={{ maxWidth: 360, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              <div className="empty-inbox-icon" style={{ width: 60, height: 60 }}>
                <ShieldCheck size={28} />
              </div>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Private Channel with {ownerUser.name}</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  This conversation is 100% private. Send a text, photo, voice note, or file directly to {ownerUser.name}.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <MessageList
            messages={messages}
            currentUser={currentUser}
            contactUser={ownerUser}
            isOtherPartyTyping={isOwnerTyping}
            onReply={(msg) =>
              setReplyTo({
                id: msg.id,
                senderId: msg.senderId,
                senderName: msg.senderId === currentUser.id ? 'You' : ownerUser.name,
                content: msg.content,
                type: msg.type,
              })
            }
            onReact={handleReact}
            onEdit={() => {}}
            onDelete={() => {}}
            onOpenImage={(url, caption) => {
              setLightboxUrl(url);
              setLightboxCaption(caption);
            }}
          />
        )}

        {/* Composer Bar */}
        <MessageComposer
          onSendMessage={handleSendMessage}
          replyTo={replyTo}
          onClearReply={() => setReplyTo(null)}
          onTypingStart={handleTypingStart}
          onTypingStop={handleTypingStop}
          isOtherPartyBlocked={false}
        />

        {/* Media / Contact Info Drawer */}
        {isDrawerOpen && (
          <InfoDrawer
            user={ownerUser}
            messages={messages}
            onClose={() => setIsDrawerOpen(false)}
            onToggleBlockUser={() => {}}
            onClearChat={() => setMessages([])}
            onOpenImage={(url) => setLightboxUrl(url)}
            isCurrentUserOwner={false}
          />
        )}

        {/* Guest Profile & Settings Modal */}
        {isProfileModalOpen && (
          <div className="lightbox-overlay" onClick={() => setIsProfileModalOpen(false)}>
            <div
              className="onboarding-card"
              style={{ maxWidth: 380, margin: 'auto' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="avatar-placeholder" style={{ width: 48, height: 48, fontSize: 20 }}>
                  {currentUser.name[0]}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{currentUser.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{currentUser.email}</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                <button className="control-btn" style={{ justifyContent: 'space-between', padding: '10px 14px' }} onClick={onToggleTheme}>
                  <span>Theme: {theme.toUpperCase()}</span>
                  {theme === 'dark' ? <Moon size={15} /> : <Sun size={15} />}
                </button>

                <button
                  className="control-btn"
                  style={{ justifyContent: 'center', padding: '10px', color: 'var(--accent-danger)', borderColor: 'var(--accent-danger)', marginTop: 8 }}
                  onClick={onLogout}
                >
                  <LogOut size={15} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Lightbox */}
      <MediaLightbox
        url={lightboxUrl}
        caption={lightboxCaption}
        onClose={() => {
          setLightboxUrl(null);
          setLightboxCaption(undefined);
        }}
      />
    </div>
  );
};
