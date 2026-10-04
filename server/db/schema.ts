export type UserRole = 'owner' | 'guest';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  avatar: string;
  statusMessage?: string;
  isBlocked: boolean;
  isOnline: boolean;
  lastSeen: string;
  createdAt: string;
  updatedAt: string;
}

export interface InviteRecord {
  id: string;
  code: string; // Unique token like "A8K29Lm"
  recipientName?: string; // Optional personalization (e.g. "Sarah")
  note?: string;
  createdById: string;
  maxUses: number; // 1 for single-use, 0 or N for multi-use
  usedCount: number;
  isRevoked: boolean;
  expiresAt?: string | null; // ISO timestamp or null for never
  createdAt: string;
  usedByUserIds: string[];
}

export interface ConversationRecord {
  id: string;
  guestId: string;
  ownerId: string;
  unreadCountOwner: number;
  unreadCountGuest: number;
  isArchived: boolean;
  isPinned: boolean;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageAttachmentRecord {
  id: string;
  type: 'image' | 'video' | 'audio' | 'file';
  url: string;
  fileName: string;
  fileSize: number;
  mimeType?: string;
  duration?: number;
}

export interface MessageReactionRecord {
  emoji: string;
  userId: string;
  userName: string;
  createdAt: string;
}

export interface MessageCallLogRecord {
  callType: 'audio' | 'video';
  status: 'completed' | 'missed' | 'declined' | 'cancelled';
  duration: number; // in seconds
}

export interface MessageRecord {
  id: string;
  conversationId: string;
  senderId: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'system' | 'call';
  content: string;
  attachments?: MessageAttachmentRecord[];
  replyTo?: {
    id: string;
    senderId: string;
    senderName: string;
    content: string;
    type: string;
  };
  callLog?: MessageCallLogRecord;
  clientTempId?: string;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  reactions: MessageReactionRecord[];
  isEdited: boolean;
  isDeletedForEveryone: boolean;
  deletedForUserIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseSchema {
  users: UserRecord[];
  invites: InviteRecord[];
  conversations: ConversationRecord[];
  messages: MessageRecord[];
}
