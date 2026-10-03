export type UserRole = 'owner' | 'guest';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  statusMessage?: string;
  isOnline: boolean;
  lastSeen: string;
  isBlocked?: boolean;
}

export interface Attachment {
  id: string;
  type: 'image' | 'video' | 'audio' | 'file';
  url: string;
  fileName: string;
  fileSize: number;
  mimeType?: string;
  duration?: number; // seconds for audio / video
  thumbnailUrl?: string;
}

export interface Reaction {
  emoji: string;
  userId: string;
  userName: string;
}

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read';
export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'file' | 'system';

export interface ReplyContext {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  type: MessageType;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  content: string;
  attachments?: Attachment[];
  replyTo?: ReplyContext;
  status: MessageStatus;
  reactions: Reaction[];
  isEdited?: boolean;
  isDeletedForEveryone?: boolean;
  deletedForUserIds?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface Conversation {
  id: string;
  guestUser: User;
  ownerUser: User;
  unreadCount: number;
  isArchived: boolean;
  isPinned?: boolean;
  draft?: string;
  updatedAt: string;
}

export type ThemeMode = 'dark' | 'light' | 'midnight';
