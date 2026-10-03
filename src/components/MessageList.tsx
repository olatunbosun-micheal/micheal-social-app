import React, { useRef, useEffect } from 'react';
import type { Message, User } from '../types';
import { MessageBubble } from './MessageBubble';
import { ShieldCheck } from 'lucide-react';

interface MessageListProps {
  messages: Message[];
  currentUser: User;
  contactUser: User;
  isOtherPartyTyping: boolean;
  onReply: (message: Message) => void;
  onReact: (messageId: string, emoji: string) => void;
  onEdit: (message: Message) => void;
  onDelete: (messageId: string, forEveryone: boolean) => void;
  onOpenImage: (url: string, caption?: string) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUser,
  contactUser,
  isOtherPartyTyping,
  onReply,
  onReact,
  onEdit,
  onDelete,
  onOpenImage,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isOtherPartyTyping]);

  const handleScrollToMessage = (messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.style.transition = 'background-color 0.5s ease';
      el.style.backgroundColor = 'rgba(0, 168, 132, 0.2)';
      setTimeout(() => {
        el.style.backgroundColor = 'transparent';
      }, 1500);
    }
  };

  return (
    <div className="messages-container" ref={containerRef}>
      {/* Security Notice Pill */}
      <div className="security-notice-pill">
        <ShieldCheck size={16} style={{ flexShrink: 0 }} />
        <span>
          <strong>Personal Communication Gateway:</strong> Messages are strictly 1-on-1 between {currentUser.name} and {contactUser.name}. Zero third-party or user-to-user discovery.
        </span>
      </div>

      <div className="date-divider">Today</div>

      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          currentUser={currentUser}
          onReply={onReply}
          onReact={onReact}
          onEdit={onEdit}
          onDelete={onDelete}
          onOpenImage={onOpenImage}
          onScrollToMessage={handleScrollToMessage}
        />
      ))}

      {/* Ephemeral Typing Indicator Bubble */}
      {isOtherPartyTyping && (
        <div className="message-bubble-row incoming">
          <div className="typing-indicator-bubble">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};
