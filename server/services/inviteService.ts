import crypto from 'crypto';
import QRCode from 'qrcode';
import { db } from '../db/index.js';
import { InviteRecord, UserRecord, ConversationRecord } from '../db/schema.js';

export class InviteService {
  // Generate a random secure alphanumeric token
  private generateCode(length = 7): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Readable charset without confusing 0/O, 1/I
    let result = '';
    const randomBytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
      result += chars[randomBytes[i] % chars.length];
    }
    return result;
  }

  // Create a new invitation (Personalized or General)
  public async createInvite(params: {
    recipientName?: string;
    note?: string;
    createdById: string;
    maxUses?: number; // 1 for single-use, 0 for unlimited
    expiresInHours?: number | null; // null for never
  }): Promise<InviteRecord & { qrCodeSvg: string }> {
    let code = this.generateCode(7);
    while (db.findInviteByCode(code)) {
      code = this.generateCode(7);
    }

    const now = new Date();
    let expiresAt: string | null = null;
    if (params.expiresInHours && params.expiresInHours > 0) {
      expiresAt = new Date(now.getTime() + params.expiresInHours * 3600 * 1000).toISOString();
    }

    const invite: InviteRecord = {
      id: `inv_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      code,
      recipientName: params.recipientName?.trim() || undefined,
      note: params.note?.trim() || undefined,
      createdById: params.createdById,
      maxUses: params.maxUses ?? 1,
      usedCount: 0,
      isRevoked: false,
      expiresAt,
      createdAt: now.toISOString(),
      usedByUserIds: [],
    };

    db.createInvite(invite);

    // Generate QR Code data URL
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const inviteUrl = `${appUrl}/invite/${code}`;
    const qrCodeSvg = await QRCode.toDataURL(inviteUrl, {
      margin: 1,
      color: { dark: '#4f46e5', light: '#ffffff' },
    });

    return { ...invite, qrCodeSvg };
  }

  // Validate an invite token
  public validateInvite(code: string): {
    valid: boolean;
    error?: string;
    invite?: InviteRecord;
    owner?: { name: string; avatar: string; statusMessage?: string };
  } {
    const invite = db.findInviteByCode(code);
    if (!invite) {
      return { valid: false, error: 'Invitation not found or invalid link.' };
    }

    if (invite.isRevoked) {
      return { valid: false, error: 'This invitation has been revoked by the owner.' };
    }

    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      return { valid: false, error: 'This invitation link has expired.' };
    }

    if (invite.maxUses > 0 && invite.usedCount >= invite.maxUses) {
      return { valid: false, error: 'This invitation link has already been used.' };
    }

    const owner = db.findUserById(invite.createdById);

    return {
      valid: true,
      invite,
      owner: owner
        ? {
            name: owner.name,
            avatar: owner.avatar,
            statusMessage: owner.statusMessage,
          }
        : { name: 'Micheal', avatar: '' },
    };
  }

  // Consume invitation during registration and create isolated conversation
  public consumeInvite(code: string, newUser: UserRecord): ConversationRecord {
    const invite = db.findInviteByCode(code);
    if (!invite) {
      throw new Error('Invalid invitation code.');
    }

    const owner = db.findUserById(invite.createdById) || db.getUsers().find((u) => u.role === 'owner');
    if (!owner) {
      throw new Error('Owner account not configured.');
    }

    // Check if conversation already exists (uniqueness constraint)
    let conv = db.findConversationBetween(newUser.id, owner.id);
    if (!conv) {
      const now = new Date().toISOString();
      conv = db.createConversation({
        id: `conv_${newUser.id}`,
        guestId: newUser.id,
        ownerId: owner.id,
        unreadCountOwner: 0,
        unreadCountGuest: 0,
        isArchived: false,
        isPinned: false,
        lastMessageAt: now,
        createdAt: now,
        updatedAt: now,
      });

      // Send initial welcome message from owner
      db.createMessage({
        id: `msg_welcome_${Date.now()}`,
        conversationId: conv.id,
        senderId: owner.id,
        type: 'text',
        content: `Welcome to Gateway, ${newUser.name}! This is your private direct channel with ${owner.name}.`,
        status: 'read',
        reactions: [{ emoji: '👍', userId: owner.id, userName: owner.name, createdAt: now }],
        isEdited: false,
        isDeletedForEveryone: false,
        deletedForUserIds: [],
        createdAt: now,
        updatedAt: now,
      });
    }

    // Update invite usage
    invite.usedCount += 1;
    invite.usedByUserIds.push(newUser.id);
    db.updateInvite(invite.id, {
      usedCount: invite.usedCount,
      usedByUserIds: invite.usedByUserIds,
    });

    return conv;
  }
}

export const inviteService = new InviteService();
