import React, { useState, useEffect } from 'react';
import type { User, Conversation, Message, ReplyContext, ThemeMode } from './types';
import { OWNER_USER, GUEST_USERS, INITIAL_CONVERSATIONS, INITIAL_MESSAGES } from './data/mockData';
import { RoleSwitcher } from './components/RoleSwitcher';
import { OwnerInbox } from './components/OwnerInbox';
import { ChatHeader } from './components/ChatHeader';
import { MessageList } from './components/MessageList';
import { MessageComposer } from './components/MessageComposer';
import { InfoDrawer } from './components/InfoDrawer';
import { MediaLightbox } from './components/MediaLightbox';
import { OnboardingModal } from './components/OnboardingModal';
import { InviteModal } from './components/InviteModal';
import type { InviteData } from './components/InviteModal';
import { InviteLandingView } from './components/InviteLandingView';
import { LandingPageView } from './components/LandingPageView';
import { soundFX } from './services/soundEffects';
import confetti from 'canvas-confetti';
import { ShieldCheck } from 'lucide-react';

import { API_BASE } from './config';

export const App: React.FC = () => {
  // Theme state
  const [theme, setTheme] = useState<ThemeMode>('dark');

  // Multi-user & isolation state
  const [isLiveDbMode, setIsLiveDbMode] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(OWNER_USER);
  const [guestUsers, setGuestUsers] = useState<Record<string, User>>(GUEST_USERS);
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [messages, setMessages] = useState<Record<string, Message[]>>(INITIAL_MESSAGES);

  // Invitation state
  const [invites, setInvites] = useState<InviteData[]>([
    {
      id: 'inv_vip_sarah',
      code: 'A8K29Lm',
      recipientName: 'Sarah',
      note: 'Direct VIP invitation link for design collaboration',
      maxUses: 1,
      usedCount: 1,
      isRevoked: false,
      expiresAt: null,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'inv_gen_open',
      code: 'OPEN99X',
      recipientName: undefined,
      note: 'General multi-use link',
      maxUses: 0,
      usedCount: 2,
      isRevoked: false,
      expiresAt: null,
      createdAt: new Date().toISOString(),
    },
  ]);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [activeInviteCode, setActiveInviteCode] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const match = window.location.pathname.match(/\/invite\/([a-zA-Z0-9]+)/);
      return match ? match[1] : null;
    }
    return null;
  });
  const [viewMode, setViewMode] = useState<'app' | 'landing' | 'invite'>(() => {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/invite/')) {
      return 'invite';
    }
    return 'app';
  });

  // Active chat selection
  const [activeConversationId, setActiveConversationId] = useState<string>('conv_sarah');

  // UI States
  const [replyTo, setReplyTo] = useState<ReplyContext | null>(null);
  const [isPhoneMockup, setIsPhoneMockup] = useState<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxCaption, setLightboxCaption] = useState<string | undefined>(undefined);
  const [isAutoResponderEnabled, setIsAutoResponderEnabled] = useState<boolean>(true);

  // Ephemeral Typing Indicators
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});

  // Mobile navigation state
  const [mobileView, setMobileView] = useState<'inbox' | 'chat'>('chat');
  const [isMobileScreen, setIsMobileScreen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobileScreen(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync theme attribute to documentElement
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Load backend invites if available
  useEffect(() => {
    const fetchInvites = async () => {
      try {
        const loginRes = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'micheal@gateway.local', password: 'password123' }),
        });
        if (loginRes.ok) {
          const { token } = await loginRes.json();
          const invitesRes = await fetch(`${API_BASE}/invites`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (invitesRes.ok) {
            const data = await invitesRes.json();
            if (data.invites) {
              setInvites(data.invites);
            }
          }
        }
      } catch {
        // Local fallback
      }
    };
    fetchInvites();
  }, []);

  // Determine current conversation safely
  const activeConversation = conversations.find((c) => c.id === activeConversationId) || conversations[0] || null;

  // Resolve the contact user based on who is currently logged in
  const getContactUser = (): User => {
    if (!currentUser) return OWNER_USER;
    if (currentUser.role === 'owner') {
      return activeConversation ? activeConversation.guestUser : {
        id: 'no_contact',
        name: 'No active chat',
        email: '',
        role: 'guest',
        avatar: '',
        statusMessage: '',
        isOnline: false,
        lastSeen: 'offline',
      };
    }
    // Guest always and strictly communicates with the Owner (Micheal)
    return OWNER_USER;
  };

  const contactUser = getContactUser();

  // Switch role handler
  const handleSelectUser = (userId: string | 'onboarding' | 'landing') => {
    if (userId === 'landing') {
      setViewMode('landing');
      return;
    }
    if (userId === 'onboarding') {
      setCurrentUser(null);
      setViewMode('app');
      return;
    }

    setViewMode('app');
    if (userId === OWNER_USER.id) {
      setCurrentUser(OWNER_USER);
      setMobileView('chat');
    } else {
      const selectedGuest = guestUsers[userId];
      if (selectedGuest) {
        setCurrentUser(selectedGuest);
        const guestConv = conversations.find((c) => c.guestUser.id === selectedGuest.id);
        if (guestConv) {
          setActiveConversationId(guestConv.id);
        }
        setMobileView('chat');
      }
    }
    setReplyTo(null);
  };

  // Generate an invitation via backend API
  const handleGenerateInvite = async (params: {
    recipientName?: string;
    note?: string;
    maxUses: number;
    expiresInHours?: number | null;
  }): Promise<InviteData> => {
    try {
      const loginRes = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'micheal@gateway.local', password: 'password123' }),
      });
      const { token } = await loginRes.json();

      const res = await fetch(`${API_BASE}/invites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(params),
      });

      const invite = await res.json();
      setInvites((prev) => [invite, ...prev]);
      return invite;
    } catch {
      // Local fallback
      const code = Math.random().toString(36).substring(2, 9).toUpperCase();
      const localInvite: InviteData = {
        id: `inv_${Date.now()}`,
        code,
        recipientName: params.recipientName,
        note: params.note,
        maxUses: params.maxUses,
        usedCount: 0,
        isRevoked: false,
        expiresAt: params.expiresInHours ? new Date(Date.now() + params.expiresInHours * 3600 * 1000).toISOString() : null,
        createdAt: new Date().toISOString(),
      };
      setInvites((prev) => [localInvite, ...prev]);
      return localInvite;
    }
  };

  // Revoke an invitation
  const handleRevokeInvite = async (id: string) => {
    try {
      const loginRes = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'micheal@gateway.local', password: 'password123' }),
      });
      const { token } = await loginRes.json();
      await fetch(`${API_BASE}/invites/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Fallback
    }
    setInvites((prev) =>
      prev.map((i) => (i.id === id ? { ...i, isRevoked: true } : i))
    );
  };

  // Sending a message
  const handleSendMessage = (
    content: string,
    type: 'text' | 'image' | 'file' | 'audio' = 'text',
    fileData?: { url: string; fileName: string; fileSize: number; duration?: number }
  ) => {
    if (!currentUser) return;

    const convId = currentUser.role === 'owner'
      ? activeConversationId
      : (conversations.find((c) => c.guestUser.id === currentUser.id)?.id || activeConversationId);

    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      conversationId: convId,
      senderId: currentUser.id,
      type: type,
      content: content,
      attachments: fileData
        ? [
            {
              id: `att_${Date.now()}`,
              type: type as 'image' | 'video' | 'audio' | 'file',
              url: fileData.url,
              fileName: fileData.fileName,
              fileSize: fileData.fileSize,
              mimeType: type === 'image' ? 'image/jpeg' : type === 'audio' ? 'audio/mp4' : 'application/octet-stream',
              duration: fileData.duration,
            },
          ]
        : undefined,
      replyTo: replyTo || undefined,
      status: 'sent',
      reactions: [],
      createdAt: new Date().toISOString(),
    };

    // Optimistic UI update
    setMessages((prev) => ({
      ...prev,
      [convId]: [...(prev[convId] || []), newMessage],
    }));

    // Update conversation timestamp
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, updatedAt: newMessage.createdAt } : c))
    );

    // Simulate transition: sent -> delivered -> read
    setTimeout(() => {
      setMessages((prev) => ({
        ...prev,
        [convId]: prev[convId]?.map((m) => (m.id === newMessage.id ? { ...m, status: 'delivered' } : m)) || [],
      }));
    }, 600);

    setTimeout(() => {
      setMessages((prev) => ({
        ...prev,
        [convId]: prev[convId]?.map((m) => (m.id === newMessage.id ? { ...m, status: 'read' } : m)) || [],
      }));
    }, 1400);

    // Auto-Responder simulation if enabled
    if (isAutoResponderEnabled) {
      simulateAutoResponse(convId, currentUser);
    }
  };

  // Simulate realistic counterpart response with typing indicator & sound
  const simulateAutoResponse = (convId: string, sender: User) => {
    const isSenderOwner = sender.role === 'owner';
    const targetUserId = isSenderOwner ? contactUser.id : OWNER_USER.id;

    // Start typing indicator after 1 second
    setTimeout(() => {
      setTypingUsers((prev) => ({ ...prev, [targetUserId]: true }));
    }, 1000);

    // Deliver reply after 2.5 seconds
    setTimeout(() => {
      setTypingUsers((prev) => ({ ...prev, [targetUserId]: false }));

      const responses = isSenderOwner
        ? [
            `Thanks for updating me, Micheal! I'll review and get back to you shortly.`,
            `Sounds great Micheal! Let me know when you'd like to jump on the next sync.`,
            `Received! Everything aligns with our project requirements.`,
          ]
        : [
            `Hey ${sender.name.split(' ')[0]}, thanks for reaching out! Reviewing this right now.`,
            `Great to hear from you. The isolated gateway architecture guarantees complete privacy.`,
            `Got your message! Let's follow up on this shortly.`,
          ];

      const replyContent = responses[Math.floor(Math.random() * responses.length)];

      const autoMsg: Message = {
        id: `msg_auto_${Date.now()}`,
        conversationId: convId,
        senderId: targetUserId,
        type: 'text',
        content: replyContent,
        status: 'delivered',
        reactions: [],
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => ({
        ...prev,
        [convId]: [...(prev[convId] || []), autoMsg],
      }));

      soundFX.playReceive();

      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId
            ? {
                ...c,
                updatedAt: autoMsg.createdAt,
                unreadCount: currentUser?.id === OWNER_USER.id && c.id !== activeConversationId ? c.unreadCount + 1 : c.unreadCount,
              }
            : c
        )
      );
    }, 2600);
  };

  // Message Reactions
  const handleReact = (messageId: string, emoji: string) => {
    if (!currentUser) return;
    const convId = activeConversationId;

    setMessages((prev) => {
      const list = prev[convId] || [];
      return {
        ...prev,
        [convId]: list.map((msg) => {
          if (msg.id !== messageId) return msg;

          const existingIdx = msg.reactions.findIndex((r) => r.userId === currentUser.id && r.emoji === emoji);
          let newReactions = [...msg.reactions];

          if (existingIdx >= 0) {
            newReactions.splice(existingIdx, 1);
          } else {
            newReactions.push({
              emoji,
              userId: currentUser.id,
              userName: currentUser.name,
            });
          }
          return { ...msg, reactions: newReactions };
        }),
      };
    });
  };

  // Message Editing
  const handleEdit = (message: Message) => {
    const updated = prompt('Edit your message:', message.content);
    if (updated === null || updated.trim() === '' || updated === message.content) return;

    setMessages((prev) => ({
      ...prev,
      [message.conversationId]: prev[message.conversationId].map((m) =>
        m.id === message.id ? { ...m, content: updated.trim(), isEdited: true, updatedAt: new Date().toISOString() } : m
      ),
    }));
  };

  // Message Deletion
  const handleDelete = (messageId: string, forEveryone: boolean) => {
    if (!currentUser) return;
    setMessages((prev) => ({
      ...prev,
      [activeConversationId]: prev[activeConversationId].map((m) => {
        if (m.id !== messageId) return m;
        if (forEveryone) {
          return { ...m, isDeletedForEveryone: true };
        } else {
          return {
            ...m,
            deletedForUserIds: [...(m.deletedForUserIds || []), currentUser.id],
          };
        }
      }),
    }));
  };

  // Blocking / Unblocking user
  const handleToggleBlockUser = (userId: string) => {
    setGuestUsers((prev) => {
      const user = prev[userId];
      if (!user) return prev;
      return {
        ...prev,
        [userId]: { ...user, isBlocked: !user.isBlocked },
      };
    });
  };

  // Clear chat
  const handleClearChat = () => {
    if (confirm('Are you sure you want to clear this conversation history?')) {
      setMessages((prev) => ({ ...prev, [activeConversationId]: [] }));
      setIsDrawerOpen(false);
    }
  };

  // Reset to initial mock state
  const handleResetData = () => {
    setConversations(INITIAL_CONVERSATIONS);
    setMessages(INITIAL_MESSAGES);
    setGuestUsers(GUEST_USERS);
    setActiveConversationId('conv_sarah');
    setCurrentUser(OWNER_USER);
    setViewMode('app');
  };

  // Onboarding complete
  const handleOnboardingComplete = (newUser: User) => {
    confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    const newConvId = `conv_${newUser.id}`;
    const newConversation: Conversation = {
      id: newConvId,
      guestUser: newUser,
      ownerUser: OWNER_USER,
      unreadCount: 0,
      isArchived: false,
      isPinned: false,
      updatedAt: new Date().toISOString(),
    };

    const initialWelcomeMessage: Message = {
      id: `msg_welcome_${Date.now()}`,
      conversationId: newConvId,
      senderId: OWNER_USER.id,
      type: 'text',
      content: `Welcome to Gateway, ${newUser.name}! This is your private, direct channel with Micheal.`,
      status: 'read',
      reactions: [{ emoji: '👍', userId: OWNER_USER.id, userName: 'Micheal' }],
      createdAt: new Date().toISOString(),
    };

    setGuestUsers((prev) => ({ ...prev, [newUser.id]: newUser }));
    setConversations((prev) => [newConversation, ...prev]);
    setMessages((prev) => ({ ...prev, [newConvId]: [initialWelcomeMessage] }));
    setActiveConversationId(newConvId);
    setCurrentUser(newUser);
    setViewMode('app');
  };

  const currentMessages = messages[activeConversationId] || [];

  // Content render
  const renderWorkspace = () => {
    // If viewing personalized invitation page
    if (viewMode === 'invite' && activeInviteCode) {
      return (
        <InviteLandingView
          inviteCode={activeInviteCode}
          onSuccess={(newUser, convId) => {
            confetti({ particleCount: 90, spread: 70 });
            setGuestUsers((prev) => ({ ...prev, [newUser.id]: newUser }));
            const newConv: Conversation = {
              id: convId,
              guestUser: newUser,
              ownerUser: OWNER_USER,
              unreadCount: 0,
              isArchived: false,
              isPinned: false,
              updatedAt: new Date().toISOString(),
            };
            setConversations((prev) => [newConv, ...prev]);
            setActiveConversationId(convId);
            setCurrentUser(newUser);
            setViewMode('app');
          }}
          onGoHome={() => setViewMode('landing')}
        />
      );
    }

    // If viewing general landing page
    if (viewMode === 'landing') {
      return (
        <LandingPageView
          ownerName={OWNER_USER.name}
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            setViewMode('app');
          }}
          onOpenInvitePrompt={() => {
            const code = prompt('Enter your 7-character invitation code (e.g. A8K29Lm or OPEN99X):');
            if (code && code.trim()) {
              setActiveInviteCode(code.trim());
              setViewMode('invite');
            }
          }}
        />
      );
    }

    // If viewing onboarding register screen
    if (!currentUser) {
      return (
        <OnboardingModal
          ownerName={OWNER_USER.name}
          onComplete={handleOnboardingComplete}
          onCancel={() => setCurrentUser(OWNER_USER)}
        />
      );
    }

    const isOwner = currentUser.role === 'owner';
    const isOtherPartyTyping = !!typingUsers[contactUser.id];

    // Responsive screen conditions
    const showSidebar = isOwner && (!isMobileScreen || mobileView === 'inbox');
    const showChat = !isOwner || (!isMobileScreen || mobileView === 'chat');

    return (
      <div className="main-workspace">
        {/* Owner Unified Inbox */}
        {showSidebar && (
          <OwnerInbox
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelectConversation={(id) => {
              setActiveConversationId(id);
              setConversations((prev) =>
                prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c))
              );
              setMobileView('chat');
            }}
            lastMessages={Object.fromEntries(
              conversations.map((c) => [c.id, messages[c.id]?.[messages[c.id]?.length - 1]])
            )}
            typingUsers={typingUsers}
            onOpenInviteModal={() => setIsInviteModalOpen(true)}
          />
        )}

        {/* Chat View */}
        {showChat && (
          activeConversation ? (
            <div className="chat-view">
              <ChatHeader
                contactUser={contactUser}
                isTyping={isOtherPartyTyping}
                onToggleDrawer={() => setIsDrawerOpen(!isDrawerOpen)}
                showBackButton={isOwner && isMobileScreen}
                onBack={() => setMobileView('inbox')}
              />

              <MessageList
                messages={currentMessages}
                currentUser={currentUser}
                contactUser={contactUser}
                isOtherPartyTyping={isOtherPartyTyping}
                onReply={(msg) =>
                  setReplyTo({
                    id: msg.id,
                    senderId: msg.senderId,
                    senderName: msg.senderId === currentUser.id ? 'You' : contactUser.name,
                    content: msg.content,
                    type: msg.type,
                  })
                }
                onReact={handleReact}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onOpenImage={(url, caption) => {
                  setLightboxUrl(url);
                  setLightboxCaption(caption);
                }}
              />

              <MessageComposer
                onSendMessage={handleSendMessage}
                replyTo={replyTo}
                onClearReply={() => setReplyTo(null)}
                onTypingStart={() => {}}
                onTypingStop={() => {}}
                isOtherPartyBlocked={guestUsers[contactUser.id]?.isBlocked}
              />
            </div>
          ) : (
            <div className="chat-view" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24 }}>
              <div style={{ maxWidth: 360, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <div className="empty-inbox-icon" style={{ width: 64, height: 64 }}>
                  <ShieldCheck size={32} />
                </div>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Personal Gateway</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Your communication channel is isolated and ready. Create an invitation link to invite guests to chat with you.
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

        {/* Side Info & Media Drawer */}
        {isDrawerOpen && (
          <InfoDrawer
            user={contactUser}
            messages={currentMessages}
            onClose={() => setIsDrawerOpen(false)}
            onToggleBlockUser={handleToggleBlockUser}
            onClearChat={handleClearChat}
            onOpenImage={(url) => setLightboxUrl(url)}
            isCurrentUserOwner={isOwner}
          />
        )}
      </div>
    );
  };

  const handleToggleLiveDbMode = () => {
    if (!isLiveDbMode) {
      // Switch to Clean Live DB mode (empty inbox until real guest accepts invite)
      setIsLiveDbMode(true);
      setConversations([]);
      setMessages({});
      setActiveConversationId('');
      setCurrentUser(OWNER_USER);
      setIsAutoResponderEnabled(false);
    } else {
      // Switch back to Demo Mock Mode
      setIsLiveDbMode(false);
      setConversations(INITIAL_CONVERSATIONS);
      setMessages(INITIAL_MESSAGES);
      setGuestUsers(GUEST_USERS);
      setActiveConversationId('conv_sarah');
      setCurrentUser(OWNER_USER);
      setIsAutoResponderEnabled(true);
    }
  };

  return (
    <div className="app-container">
      {/* Top Role Switcher & Invitation Tester */}
      <RoleSwitcher
        currentUser={currentUser}
        guestUsers={guestUsers}
        onSelectUser={handleSelectUser}
        isAutoResponderEnabled={isAutoResponderEnabled}
        onToggleAutoResponder={() => setIsAutoResponderEnabled(!isAutoResponderEnabled)}
        isPhoneMockup={isPhoneMockup}
        onTogglePhoneMockup={() => setIsPhoneMockup(!isPhoneMockup)}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : theme === 'light' ? 'midnight' : 'dark')}
        onResetData={handleResetData}
        isLiveDbMode={isLiveDbMode}
        onToggleLiveDbMode={handleToggleLiveDbMode}
      />

      {/* Main Container: Either Phone Frame or Full-Width Desktop */}
      {isPhoneMockup ? (
        <div className="phone-mockup-wrapper">
          <div className="phone-mockup-frame">
            <div className="phone-notch">
              <div className="phone-camera" />
              <div className="phone-speaker" />
            </div>
            <div className="phone-content">{renderWorkspace()}</div>
          </div>
        </div>
      ) : (
        renderWorkspace()
      )}

      {/* Invite Modal for Owner */}
      {isInviteModalOpen && (
        <InviteModal
          ownerName={OWNER_USER.name}
          onClose={() => setIsInviteModalOpen(false)}
          onGenerateInvite={handleGenerateInvite}
          existingInvites={invites}
          onRevokeInvite={handleRevokeInvite}
        />
      )}

      {/* Fullscreen Media Lightbox Modal */}
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

export default App;
