import React, { useState } from 'react';
import type { Message, User } from '../types';
import { Reply, Heart, MoreVertical, Trash2, Edit3, Download, FileText } from 'lucide-react';
import { VoicePlayer } from './VoicePlayer';
import { soundFX } from '../services/soundEffects';

// Resolve relative server media paths to absolute URLs
const resolveMediaUrl = (url: string): string => {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) return url;
  // Relative path from server (e.g. /api/media/files/...)
  const base = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://127.0.0.1:4000');
  return `${base}${url}`;
};

interface MessageBubbleProps {
  message: Message;
  currentUser: User;
  onReply: (message: Message) => void;
  onReact: (messageId: string, emoji: string) => void;
  onEdit: (message: Message) => void;
  onDelete: (messageId: string, forEveryone: boolean) => void;
  onOpenImage: (url: string, caption?: string) => void;
  onScrollToMessage: (id: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  currentUser,
  onReply,
  onReact,
  onEdit,
  onDelete,
  onOpenImage,
  onScrollToMessage,
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const isOutgoing = message.senderId === currentUser.id;
  const isDeletedForMe = message.deletedForUserIds?.includes(currentUser.id);

  if (isDeletedForMe) return null;

  const quickEmojis = ['❤️', '😂', '👍', '😮', '😢', '🙏'];

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const handleQuickReact = (emoji: string) => {
    soundFX.playReaction();
    onReact(message.id, emoji);
    setShowEmojiPicker(false);
  };

  if (message.isDeletedForEveryone) {
    return (
      <div className={`message-bubble-row ${isOutgoing ? 'outgoing' : 'incoming'}`}>
        <div className="message-bubble" style={{ fontStyle: 'italic', opacity: 0.65 }}>
          <span style={{ fontSize: '13px' }}>This message was deleted</span>
          <div className="bubble-meta-footer">
            <span>{formatTime(message.createdAt)}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      id={`msg-${message.id}`}
      className={`message-bubble-row ${isOutgoing ? 'outgoing' : 'incoming'}`}
    >
      {/* Floating Hover Actions */}
      <div className="bubble-hover-actions">
        <button
          className="hover-action-btn"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          title="React"
        >
          <Heart size={14} strokeWidth={1.75} />
        </button>
        <button
          className="hover-action-btn"
          onClick={() => onReply(message)}
          title="Reply"
        >
          <Reply size={14} />
        </button>
        <button
          className="hover-action-btn"
          onClick={() => setShowMenu(!showMenu)}
          title="More options"
        >
          <MoreVertical size={14} />
        </button>
      </div>

      {/* Floating Quick Reaction Picker */}
      {showEmojiPicker && (
        <div
          className="emoji-popover"
          style={{
            position: 'absolute',
            top: -48,
            [isOutgoing ? 'right' : 'left']: 0,
            zIndex: 30,
          }}
        >
          {quickEmojis.map((emoji) => (
            <button
              key={emoji}
              className="emoji-btn"
              onClick={() => handleQuickReact(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Context Menu Dropdown */}
      {showMenu && (
        <div
          style={{
            position: 'absolute',
            top: 24,
            [isOutgoing ? 'right' : 'left']: 0,
            background: 'var(--bg-modal)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 40,
            padding: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            minWidth: 150,
          }}
        >
          {isOutgoing && message.type === 'text' && (
            <button
              className="control-btn"
              style={{ justifyContent: 'flex-start', border: 'none', background: 'transparent' }}
              onClick={() => {
                setShowMenu(false);
                onEdit(message);
              }}
            >
              <Edit3 size={13} />
              <span>Edit message</span>
            </button>
          )}

          <button
            className="control-btn"
            style={{ justifyContent: 'flex-start', border: 'none', background: 'transparent' }}
            onClick={() => {
              setShowMenu(false);
              onDelete(message.id, false);
            }}
          >
            <Trash2 size={13} />
            <span>Delete for me</span>
          </button>

          {isOutgoing && (
            <button
              className="control-btn"
              style={{
                justifyContent: 'flex-start',
                border: 'none',
                background: 'transparent',
                color: 'var(--accent-danger)',
              }}
              onClick={() => {
                setShowMenu(false);
                onDelete(message.id, true);
              }}
            >
              <Trash2 size={13} />
              <span>Delete for everyone</span>
            </button>
          )}
        </div>
      )}

      {/* Main Message Bubble */}
      <div className="message-bubble">
        {/* Quoted Reply Banner */}
        {message.replyTo && (
          <div
            className="bubble-quoted-reply"
            onClick={() => onScrollToMessage(message.replyTo!.id)}
            title="Click to jump to quoted message"
          >
            <div className="quoted-sender">{message.replyTo.senderName}</div>
            <div className="quoted-text">
              {message.replyTo.type === 'image' ? 'Photo' :
               message.replyTo.type === 'audio' ? 'Voice message' :
               message.replyTo.type === 'file' ? 'Document' :
               message.replyTo.content}
            </div>
          </div>
        )}

        {/* Media Attachments */}
        {message.attachments?.map((att) => {
          if (att.type === 'image') {
            const imgSrc = resolveMediaUrl(att.url);
            return (
              <div
                key={att.id}
                className="bubble-image-wrapper"
                onClick={() => onOpenImage(imgSrc, message.content)}
              >
                <img
                  src={imgSrc}
                  alt={att.fileName}
                  className="bubble-image"
                  onError={(e) => {
                    // If image fails to load, show a placeholder
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            );
          }

          if (att.type === 'audio') {
            return (
              <VoicePlayer
                key={att.id}
                url={resolveMediaUrl(att.url)}
                duration={att.duration || 14}
                messageId={message.id}
              />
            );
          }

          if (att.type === 'file') {
            const fileUrl = resolveMediaUrl(att.url);
            const fileSizeMb = att.fileSize ? (att.fileSize / (1024 * 1024)).toFixed(1) : '?';
            const ext = att.fileName?.split('.').pop()?.toUpperCase() || 'FILE';
            return (
              <div key={att.id} className="bubble-file-attachment">
                <div className="file-icon-box">
                  <FileText size={22} />
                </div>
                <div className="file-meta-box">
                  <div className="file-name">{att.fileName}</div>
                  <div className="file-size">
                    {fileSizeMb} MB • {ext}
                  </div>
                </div>
                <a
                  href={fileUrl}
                  download={att.fileName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="icon-action-btn"
                  title="Download File"
                  style={{ textDecoration: 'none' }}
                >
                  <Download size={16} />
                </a>
              </div>
            );
          }

          return null;
        })}

        {/* Text Content */}
        {message.type !== 'audio' && message.content && (
          <div className="message-text">{message.content}</div>
        )}

        {/* Bubble Meta Footer */}
        <div className="bubble-meta-footer">
          {message.isEdited && <span className="edited-tag">edited</span>}
          <span>{formatTime(message.createdAt)}</span>

          {isOutgoing && (
            <span className={`message-status-pill ${message.status}`}>
              {message.status === 'sending' && 'SENDING'}
              {message.status === 'sent' && 'SENT'}
              {message.status === 'delivered' && 'DELIV'}
              {message.status === 'read' && 'READ'}
            </span>
          )}
        </div>
      </div>

      {/* Bubble Reactions Row */}
      {message.reactions && message.reactions.length > 0 && (
        <div className="bubble-reactions-row">
          {Array.from(
            message.reactions.reduce((acc, r) => {
              acc.set(r.emoji, (acc.get(r.emoji) || 0) + 1);
              return acc;
            }, new Map<string, number>())
          ).map(([emoji, count]) => (
            <button
              key={emoji}
              className="reaction-pill"
              onClick={() => handleQuickReact(emoji)}
              title={`${count} reactions`}
            >
              <span>{emoji}</span>
              {count > 1 && <span className="reaction-count">{count}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
