import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { DatabaseSchema, UserRecord, InviteRecord, ConversationRecord, MessageRecord } from './schema.js';

const DB_FILE = path.join(process.cwd(), 'data', 'gateway.db.json');

class DatabaseEngine {
  private data: DatabaseSchema = {
    users: [],
    invites: [],
    conversations: [],
    messages: [],
  };

  constructor() {
    this.init();
  }

  private init() {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
      } catch (e) {
        console.error('Failed to load existing DB file, creating fresh seed...', e);
        this.seed();
      }
    } else {
      this.seed();
    }
  }

  public save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to write database file:', e);
    }
  }

  private seed() {
    const ownerName = process.env.OWNER_NAME?.replace(/"/g, '') || 'Micheal';
    const ownerEmail = process.env.OWNER_EMAIL?.replace(/"/g, '') || 'micheal@gateway.local';
    const ownerPassword = process.env.OWNER_PASSWORD?.replace(/"/g, '') || 'password123';
    const defaultPasswordHash = bcrypt.hashSync(ownerPassword, 10);
    const now = new Date().toISOString();

    const owner: UserRecord = {
      id: 'user_micheal',
      name: ownerName,
      email: ownerEmail,
      passwordHash: defaultPasswordHash,
      role: 'owner',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      statusMessage: 'Available for private 1-on-1 briefings & discussions',
      isBlocked: false,
      isOnline: true,
      lastSeen: 'online',
      createdAt: now,
      updatedAt: now,
    };

    const sarah: UserRecord = {
      id: 'user_sarah',
      name: 'Sarah Jenkins',
      email: 'sarah.j@example.com',
      passwordHash: defaultPasswordHash,
      role: 'guest',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
      statusMessage: 'Product design & UI architecture',
      isBlocked: false,
      isOnline: true,
      lastSeen: 'online',
      createdAt: now,
      updatedAt: now,
    };

    const david: UserRecord = {
      id: 'user_david',
      name: 'David Chen',
      email: 'david.chen@example.com',
      passwordHash: defaultPasswordHash,
      role: 'guest',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
      statusMessage: 'Lead Frontend Engineer',
      isBlocked: false,
      isOnline: false,
      lastSeen: 'today at 14:15',
      createdAt: now,
      updatedAt: now,
    };

    const tobi: UserRecord = {
      id: 'user_tobi',
      name: 'Tobi Adeleke',
      email: 'tobi.a@example.com',
      passwordHash: defaultPasswordHash,
      role: 'guest',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
      statusMessage: 'Founder @ Apex Labs',
      isBlocked: false,
      isOnline: true,
      lastSeen: 'online',
      createdAt: now,
      updatedAt: now,
    };

    const sampleInvite: InviteRecord = {
      id: 'inv_vip_sarah',
      code: 'A8K29Lm',
      recipientName: 'Sarah',
      note: 'Direct VIP invitation link for design collaboration',
      createdById: owner.id,
      maxUses: 1,
      usedCount: 1,
      isRevoked: false,
      expiresAt: null,
      createdAt: now,
      usedByUserIds: [sarah.id],
    };

    const convSarah: ConversationRecord = {
      id: 'conv_sarah',
      guestId: sarah.id,
      ownerId: owner.id,
      unreadCountOwner: 1,
      unreadCountGuest: 0,
      isArchived: false,
      isPinned: true,
      lastMessageAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      createdAt: now,
      updatedAt: now,
    };

    const convDavid: ConversationRecord = {
      id: 'conv_david',
      guestId: david.id,
      ownerId: owner.id,
      unreadCountOwner: 0,
      unreadCountGuest: 0,
      isArchived: false,
      isPinned: false,
      lastMessageAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
      createdAt: now,
      updatedAt: now,
    };

    const convTobi: ConversationRecord = {
      id: 'conv_tobi',
      guestId: tobi.id,
      ownerId: owner.id,
      unreadCountOwner: 2,
      unreadCountGuest: 0,
      isArchived: false,
      isPinned: false,
      lastMessageAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
      createdAt: now,
      updatedAt: now,
    };

    const msgs: MessageRecord[] = [
      {
        id: 'msg_s_1',
        conversationId: convSarah.id,
        senderId: owner.id,
        type: 'text',
        content: 'Hey Sarah! Welcome to our private communication channel. No algorithms, no third parties — just direct 1-on-1 contact.',
        status: 'read',
        reactions: [{ emoji: '❤️', userId: sarah.id, userName: 'Sarah', createdAt: now }],
        isEdited: false,
        isDeletedForEveryone: false,
        deletedForUserIds: [],
        createdAt: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
        updatedAt: now,
      },
      {
        id: 'msg_s_2',
        conversationId: convSarah.id,
        senderId: sarah.id,
        type: 'text',
        content: 'Hi Micheal! This is so refreshing. It feels just like a private direct messenger. I just finished the new design system draft!',
        status: 'read',
        reactions: [{ emoji: '👍', userId: owner.id, userName: 'Micheal', createdAt: now }],
        isEdited: false,
        isDeletedForEveryone: false,
        deletedForUserIds: [],
        createdAt: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
        updatedAt: now,
      },
      {
        id: 'msg_s_3',
        conversationId: convSarah.id,
        senderId: sarah.id,
        type: 'image',
        content: 'Here is the preliminary mobile UI preview.',
        attachments: [
          {
            id: 'att_s_img',
            type: 'image',
            url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80',
            fileName: 'Gateway_Mobile_Concept_v1.png',
            fileSize: 1420000,
            mimeType: 'image/png',
          },
        ],
        status: 'read',
        reactions: [{ emoji: '😮', userId: owner.id, userName: 'Micheal', createdAt: now }],
        isEdited: false,
        isDeletedForEveryone: false,
        deletedForUserIds: [],
        createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        updatedAt: now,
      },
    ];

    this.data = {
      users: [owner, sarah, david, tobi],
      invites: [sampleInvite],
      conversations: [convSarah, convDavid, convTobi],
      messages: msgs,
    };

    this.save();
  }

  // --- Users ---
  public getUsers(): UserRecord[] {
    return this.data.users;
  }

  public findUserById(id: string): UserRecord | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  public findUserByEmail(email: string): UserRecord | undefined {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  public createUser(user: UserRecord): UserRecord {
    this.data.users.push(user);
    this.save();
    return user;
  }

  public updateUser(id: string, updates: Partial<UserRecord>): UserRecord | undefined {
    const user = this.findUserById(id);
    if (!user) return undefined;
    Object.assign(user, updates, { updatedAt: new Date().toISOString() });
    this.save();
    return user;
  }

  // --- Invites ---
  public getInvites(): InviteRecord[] {
    return this.data.invites;
  }

  public findInviteByCode(code: string): InviteRecord | undefined {
    return this.data.invites.find((i) => i.code === code);
  }

  public findInviteById(id: string): InviteRecord | undefined {
    return this.data.invites.find((i) => i.id === id);
  }

  public createInvite(invite: InviteRecord): InviteRecord {
    this.data.invites.push(invite);
    this.save();
    return invite;
  }

  public updateInvite(id: string, updates: Partial<InviteRecord>): InviteRecord | undefined {
    const invite = this.findInviteById(id);
    if (!invite) return undefined;
    Object.assign(invite, updates);
    this.save();
    return invite;
  }

  public deleteInvite(id: string): boolean {
    const idx = this.data.invites.findIndex((i) => i.id === id);
    if (idx === -1) return false;
    this.data.invites.splice(idx, 1);
    this.save();
    return true;
  }

  // --- Conversations ---
  public getConversations(): ConversationRecord[] {
    return this.data.conversations;
  }

  public findConversationById(id: string): ConversationRecord | undefined {
    return this.data.conversations.find((c) => c.id === id);
  }

  public findConversationBetween(guestId: string, ownerId: string): ConversationRecord | undefined {
    return this.data.conversations.find((c) => c.guestId === guestId && c.ownerId === ownerId);
  }

  public createConversation(conv: ConversationRecord): ConversationRecord {
    this.data.conversations.push(conv);
    this.save();
    return conv;
  }

  public updateConversation(id: string, updates: Partial<ConversationRecord>): ConversationRecord | undefined {
    const conv = this.findConversationById(id);
    if (!conv) return undefined;
    Object.assign(conv, updates, { updatedAt: new Date().toISOString() });
    this.save();
    return conv;
  }

  // --- Messages ---
  public getMessagesByConversation(conversationId: string): MessageRecord[] {
    return this.data.messages.filter((m) => m.conversationId === conversationId);
  }

  public findMessageById(id: string): MessageRecord | undefined {
    return this.data.messages.find((m) => m.id === id);
  }

  public createMessage(msg: MessageRecord): MessageRecord {
    this.data.messages.push(msg);
    this.save();
    return msg;
  }

  public updateMessage(id: string, updates: Partial<MessageRecord>): MessageRecord | undefined {
    const msg = this.findMessageById(id);
    if (!msg) return undefined;
    Object.assign(msg, updates, { updatedAt: new Date().toISOString() });
    this.save();
    return msg;
  }
}

export const db = new DatabaseEngine();
