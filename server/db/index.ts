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
        return;
      }
    } else {
      this.seed();
      return;
    }

    // Ensure system owner always matches configured credentials on every startup
    this.syncOwnerCredentials();
  }

  private syncOwnerCredentials() {
    const ownerName = process.env.OWNER_NAME?.replace(/"/g, '') || 'Micheal';
    const ownerEmail = (process.env.OWNER_EMAIL?.replace(/"/g, '') || 'kilogbede19@gmail.com').trim().toLowerCase();
    const ownerPassword = process.env.OWNER_PASSWORD?.replace(/"/g, '') || 'Micheal12/?';
    const ownerPasswordHash = bcrypt.hashSync(ownerPassword, 10);

    let owner = this.data.users.find((u) => u.role === 'owner' || u.id === 'user_micheal' || u.email.toLowerCase() === ownerEmail);
    if (owner) {
      owner.name = ownerName;
      owner.email = ownerEmail;
      owner.passwordHash = ownerPasswordHash;
      this.save();
      console.log(`[DB] System owner credentials synced for ${ownerEmail}`);
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
    const ownerEmail = (process.env.OWNER_EMAIL?.replace(/"/g, '') || 'kilogbede19@gmail.com').trim().toLowerCase();
    const ownerPassword = process.env.OWNER_PASSWORD?.replace(/"/g, '') || 'Micheal12/?';
    const ownerPasswordHash = bcrypt.hashSync(ownerPassword, 10);
    const now = new Date().toISOString();

    const owner: UserRecord = {
      id: 'user_micheal',
      name: ownerName,
      email: ownerEmail,
      passwordHash: ownerPasswordHash,
      role: 'owner',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      statusMessage: 'Available for private 1-on-1 briefings & discussions',
      isBlocked: false,
      isOnline: true,
      lastSeen: 'online',
      createdAt: now,
      updatedAt: now,
    };

    // Clean slate — no demo guests, no fake conversations, no sample messages
    this.data = {
      users: [owner],
      invites: [],
      conversations: [],
      messages: [],
    };

    this.save();
    console.log(`[DB] Seeded fresh database with owner ${ownerEmail}`);
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
