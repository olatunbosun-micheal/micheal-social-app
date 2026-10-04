import React, { useState, useEffect, useRef } from 'react';
import type { User, Conversation, Message, ReplyContext } from '../../types';
import { OwnerInbox } from '../OwnerInbox';
import { ChatHeader } from '../ChatHeader';
import { MessageList } from '../MessageList';
import { MessageComposer } from '../MessageComposer';
import { InfoDrawer } from '../InfoDrawer';
import { InviteModal } from '../InviteModal';
import type { InviteData } from '../InviteModal';
import { MediaLightbox } from '../MediaLightbox';
import { CallModal, type CallSession } from '../call/CallModal';
import { API_BASE } from '../../config';
import { realtimeClient } from '../../services/realtimeClient';
import { LogOut, Moon, Sun, ShieldCheck } from 'lucide-react';

interface OwnerShellProps {
  ownerUser: User;
  onLogout: () => void;
  theme: string;
  onToggleTheme: () => void;
}

export const OwnerShell: React.FC<OwnerShellProps> = ({
  ownerUser,
  onLogout,
  theme,
  onToggleTheme,
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>('');
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [replyTo, setReplyTo] = useState<ReplyContext | null>(null);
  const [invites, setInvites] = useState<InviteData[]>([]);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxCaption, setLightboxCaption] = useState<string | undefined>(undefined);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const [callSession, setCallSession] = useState<CallSession | null>(null);

  // Mobile navigation
  const [mobileView, setMobileView] = useState<'inbox' | 'chat'>('inbox');
  const [isMobileScreen, setIsMobileScreen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  );

  const token = typeof window !== 'undefined' ? localStorage.getItem('gateway_token') : null;

  useEffect(() => {
    const handleResize = () => {
      setIsMobileScreen(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch real conversations from database
  const fetchConversations = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.conversations) {
          setConversations(data.conversations);
          setActiveConversationId((prev) => {
            // Keep currently viewed conversation if it exists in the list
            if (prev && data.conversations.some((c: any) => c.id === prev)) {
              return prev;
            }
            return data.conversations.length > 0 ? data.conversations[0].id : '';
          });
        }
      }
    } catch (err) {
      console.warn('Failed to fetch conversations:', err);
    }
  };

  // Fetch messages for a specific conversation
  const fetchMessagesForConv = async (convId: string) => {
    if (!token || !convId) return;
    try {
      const res = await fetch(`${API_BASE}/conversations/${convId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => ({
          ...prev,
          [convId]: data.messages || [],
        }));
      }
    } catch (err) {
      console.warn('Failed to fetch messages:', err);
    }
  };

  // Fetch invites
  const fetchInvites = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/invites`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setInvites(data.invites || []);
      }
    } catch {
      // fallback
    }
  };

  // Initialize Auth, Realtime & Sync
  useEffect(() => {
    fetchConversations();
    fetchInvites();

    if (token) {
      realtimeClient.init(token);

      realtimeClient.on('message.created', (newMsg: Message) => {
        setMessages((prev) => {
          const list = prev[newMsg.conversationId] || [];
          if (list.some((m) => m.id === newMsg.id)) return prev;

          // If this is an optimistic message matching clientTempId:
          if (newMsg.clientTempId && list.some((m) => m.id === newMsg.clientTempId)) {
            return {
              ...prev,
              [newMsg.conversationId]: list.map((m) => (m.id === newMsg.clientTempId ? newMsg : m)),
            };
          }

          // Fallback matching for pending optimistic message from the same sender
          const pendingIdx = list.findIndex(
            (m) =>
              (m.id.startsWith('temp_') || m.id.startsWith('msg_')) &&
              m.senderId === newMsg.senderId &&
              m.content === newMsg.content &&
              Math.abs(new Date(m.createdAt).getTime() - new Date(newMsg.createdAt).getTime()) < 15000
          );
          if (pendingIdx !== -1) {
            const updated = [...list];
            updated[pendingIdx] = newMsg;
            return {
              ...prev,
              [newMsg.conversationId]: updated,
            };
          }

          return {
            ...prev,
            [newMsg.conversationId]: [...list, newMsg],
          };
        });

        // Refetch conversations to update timestamps & unread counts
        fetchConversations();
      });

      realtimeClient.on('typing.started', ({ userId }: { userId: string }) => {
        setTypingUsers((prev) => ({ ...prev, [userId]: true }));
      });

      realtimeClient.on('typing.stopped', ({ userId }: { userId: string }) => {
        setTypingUsers((prev) => ({ ...prev, [userId]: false }));
      });

      realtimeClient.on('conversation.cleared', ({ conversationId }: { conversationId: string }) => {
        setMessages((prev) => ({
          ...prev,
          [conversationId]: [],
        }));
        fetchConversations();
      });

      realtimeClient.on('call.start', (data: { fromUserId: string; conversationId: string; isVideo: boolean; callerName: string; callerAvatar?: string }) => {
        const callerUser: User = conversations.find((c) => c.guestUser.id === data.fromUserId)?.guestUser || {
          id: data.fromUserId,
          name: data.callerName || 'Guest User',
          email: '',
          role: 'guest',
          avatar: data.callerAvatar || '',
          isOnline: true,
          lastSeen: 'online',
        };

        setCallSession({
          targetUser: callerUser,
          conversationId: data.conversationId,
          isVideo: !!data.isVideo,
          direction: 'incoming',
          status: 'ringing',
        });
      });
    }

    const interval = setInterval(() => {
      fetchConversations();
      if (activeConversationIdRef.current) {
        fetchMessagesForConv(activeConversationIdRef.current);
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [token]);

  const activeConversationIdRef = useRef(activeConversationId);
  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  // When active conversation changes, fetch its messages and join room
  useEffect(() => {
    if (activeConversationId) {
      activeConversationIdRef.current = activeConversationId;
      realtimeClient.joinConversation(activeConversationId);
      fetchMessagesForConv(activeConversationId);
    }
  }, [activeConversationId]);

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || (conversations.length > 0 ? conversations[0] : null);
  const activeId = activeConversation?.id || activeConversationId;
  const contactUser = activeConversation ? activeConversation.guestUser : null;
  const currentMessages = activeId ? (messages[activeId] || []) : [];
  const isContactTyping = contactUser ? !!typingUsers[contactUser.id] : false;

  // Generate Invite
  const handleGenerateInvite = async (params: {
    recipientName?: string;
    note?: string;
    maxUses: number;
    expiresInHours?: number | null;
  }): Promise<InviteData> => {
    const res = await fetch(`${API_BASE}/invites`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      throw new Error('Failed to create invite');
    }

    const invite = await res.json();
    setInvites((prev) => [invite, ...prev]);
    return invite;
  };

  // Revoke Invite
  const handleRevokeInvite = async (id: string) => {
    try {
      await fetch(`${API_BASE}/invites/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setInvites((prev) =>
        prev.map((i) => (i.id === id ? { ...i, isRevoked: true } : i))
      );
    } catch (err) {
      console.warn('Revoke failed:', err);
    }
  };

  // Start WebRTC Call (Audio or Video)
  const handleStartCall = (isVideo: boolean) => {
    if (!contactUser || !activeId) return;
    setCallSession({
      targetUser: contactUser,
      conversationId: activeId,
      isVideo,
      direction: 'outgoing',
      status: 'calling',
    });
    realtimeClient.initiateCall({
      targetUserId: contactUser.id,
      conversationId: activeId,
      isVideo,
      callerName: ownerUser.name,
      callerAvatar: ownerUser.avatar,
    });
  };

  // Send Message
  const handleSendMessage = async (
    content: string,
    type: 'text' | 'image' | 'video' | 'file' | 'audio' = 'text',
    fileData?: { url: string; fileName: string; fileSize: number; duration?: number }
  ) => {
    if (!activeId) return;

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const optimisticMessage: Message = {
      id: tempId,
      clientTempId: tempId,
      conversationId: activeId,
      senderId: ownerUser.id,
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

    setMessages((prev) => ({
      ...prev,
      [activeId]: [...(prev[activeId] || []), optimisticMessage],
    }));
    setReplyTo(null);

    if (token) {
      try {
        const res = await fetch(`${API_BASE}/conversations/${activeId}/messages`, {
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
            clientTempId: tempId,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setMessages((prev) => {
            const list = prev[activeId] || [];
            // If already added by realtime socket
            if (list.some((m) => m.id === data.message.id)) {
              return {
                ...prev,
                [activeId]: list.filter((m) => m.id !== tempId),
              };
            }
            return {
              ...prev,
              [activeId]: list.map((m) => (m.id === tempId ? data.message : m)),
            };
          });
        }
      } catch (err) {
        console.warn('Message send failed:', err);
      }
    }
  };

  const handleReact = async (messageId: string, emoji: string) => {
    if (!token || !activeId) return;
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
        setMessages((prev) => ({
          ...prev,
          [activeId]: prev[activeId]?.map((m) =>
            m.id === messageId ? data.message : m
          ) || [],
        }));
      }
    } catch (err) {
      console.warn('Reaction failed:', err);
    }
  };

  const handleToggleArchive = async (convId: string, currentArchived: boolean) => {
    const nextArchived = !currentArchived;
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, isArchived: nextArchived } : c))
    );
    if (token) {
      try {
        await fetch(`${API_BASE}/conversations/${convId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ isArchived: nextArchived }),
        });
      } catch (err) {
        console.warn('Failed to toggle archive:', err);
      }
    }
  };

  const handleToggleUnread = async (convId: string, currentUnread: number) => {
    const nextUnread = currentUnread > 0 ? 0 : 1;
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, unreadCount: nextUnread } : c))
    );
    if (token) {
      try {
        await fetch(`${API_BASE}/conversations/${convId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ unreadCount: nextUnread }),
        });
      } catch (err) {
        console.warn('Failed to toggle unread:', err);
      }
    }
  };

  const showSidebar = !isMobileScreen || mobileView === 'inbox';
  const showChat = !isMobileScreen || mobileView === 'chat';

  return (
    <div className="app-container">
      {/* Sleek Minimalist Owner Top Navigation */}
      <header className="control-bar">
        <div className="control-bar-left">
          <div className="brand-badge">
            <div className="brand-icon">
              <ShieldCheck size={14} />
            </div>
            <span className="brand-title">Micheal's Gateway</span>
          </div>
        </div>

        <div className="control-bar-right">
          <button className="control-btn" onClick={onToggleTheme} title="Switch Theme">
            {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
          </button>

          <button className="control-btn" onClick={onLogout} title="Sign Out">
            <LogOut size={13} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="main-workspace">
        {/* Owner Unified Inbox */}
        {showSidebar && (
          <OwnerInbox
            conversations={conversations}
            activeConversationId={activeId}
            onSelectConversation={(id) => {
              setActiveConversationId(id);
              activeConversationIdRef.current = id;
              setReplyTo(null);
              setConversations((prev) =>
                prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c))
              );
              setMobileView('chat');
              fetchMessagesForConv(id);
            }}
            onToggleArchive={handleToggleArchive}
            onToggleUnread={handleToggleUnread}
            lastMessages={Object.fromEntries(
              conversations.map((c) => [c.id, messages[c.id]?.[messages[c.id]?.length - 1]])
            )}
            typingUsers={typingUsers}
            onOpenInviteModal={() => setIsInviteModalOpen(true)}
          />
        )}

        {/* Chat Area */}
        {showChat && (
          activeConversation && contactUser ? (
            <div className="chat-view">
              <ChatHeader
                contactUser={contactUser}
                isTyping={isContactTyping}
                onToggleDrawer={() => setIsDrawerOpen(!isDrawerOpen)}
                showBackButton={isMobileScreen}
                onBack={() => setMobileView('inbox')}
                theme={theme}
                onToggleTheme={onToggleTheme}
                onStartCall={handleStartCall}
              />

              <MessageList
                key={activeId}
                messages={currentMessages}
                currentUser={ownerUser}
                contactUser={contactUser}
                isOtherPartyTyping={isContactTyping}
                onReply={(msg) =>
                  setReplyTo({
                    id: msg.id,
                    senderId: msg.senderId,
                    senderName: msg.senderId === ownerUser.id ? 'You' : contactUser.name,
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

              <MessageComposer
                key={activeId}
                onSendMessage={handleSendMessage}
                replyTo={replyTo}
                onClearReply={() => setReplyTo(null)}
                onTypingStart={() => {
                  if (activeId) {
                    realtimeClient.sendTyping(activeId, true);
                  }
                }}
                onTypingStop={() => {
                  if (activeId) {
                    realtimeClient.sendTyping(activeId, false);
                  }
                }}
                isOtherPartyBlocked={false}
              />
            </div>
          ) : (
            <div className="chat-view" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24 }}>
              <div style={{ maxWidth: 360, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <div className="empty-inbox-icon" style={{ width: 64, height: 64 }}>
                  <ShieldCheck size={32} />
                </div>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Owner Communication Gateway</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Your communication gateway is isolated and active. Give someone your private invitation link to start receiving 1-on-1 messages.
                  </p>
                </div>
                <button
                  className="submit-btn"
                  style={{ padding: '10px 20px', fontSize: 13 }}
                  onClick={() => setIsInviteModalOpen(true)}
                >
                  + Generate Invitation Link
                </button>
              </div>
            </div>
          )
        )}

        {/* Media / Contact Info Drawer */}
        {isDrawerOpen && contactUser && (
          <InfoDrawer
            user={contactUser}
            messages={currentMessages}
            onClose={() => setIsDrawerOpen(false)}
            onToggleBlockUser={() => {}}
            onClearChat={async () => {
              if (activeId && token) {
                setMessages((prev) => ({ ...prev, [activeId]: [] }));
                try {
                  await fetch(`${API_BASE}/conversations/${activeId}/messages`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  fetchConversations();
                } catch (err) {
                  console.warn('Failed to clear chat:', err);
                }
              }
              setIsDrawerOpen(false);
            }}
            onOpenImage={(url) => setLightboxUrl(url)}
            isCurrentUserOwner={true}
          />
        )}
      </div>

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <InviteModal
          ownerName={ownerUser.name}
          onClose={() => setIsInviteModalOpen(false)}
          onGenerateInvite={handleGenerateInvite}
          existingInvites={invites}
          onRevokeInvite={handleRevokeInvite}
        />
      )}

      {/* Lightbox Modal */}
      <MediaLightbox
        url={lightboxUrl}
        caption={lightboxCaption}
        onClose={() => {
          setLightboxUrl(null);
          setLightboxCaption(undefined);
        }}
      />

      {/* WebRTC Live Audio / Video Call Modal */}
      {callSession && (
        <CallModal
          session={callSession}
          currentUser={ownerUser}
          onEndCall={() => setCallSession(null)}
          onAcceptCall={(video) => {
            setCallSession((prev) => (prev ? { ...prev, isVideo: video, status: 'connected' } : null));
          }}
        />
      )}
    </div>
  );
};
