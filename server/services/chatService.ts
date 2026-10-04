import { db } from '../db/index.js';
import { UserRecord, ConversationRecord, MessageRecord } from '../db/schema.js';
import { assertConversationAccess, assertMessageAccess } from '../middleware/authorization.js';
import { broadcastToConversation, revokeUserSessions } from '../realtime/websocket.js';

export class ChatService {
  // Get conversations visible to the authenticated user
  public getConversationsForUser(user: UserRecord): Array<
    ConversationRecord & {
      guestUser: Omit<UserRecord, 'passwordHash'>;
      ownerUser: Omit<UserRecord, 'passwordHash'>;
      lastMessage?: MessageRecord;
    }
  > {
    const allConversations = db.getConversations();

    // Isolation filter: owner gets all, guest gets strictly their own
    const visibleConversations =
      user.role === 'owner'
        ? allConversations
        : allConversations.filter((c) => c.guestId === user.id);

    return visibleConversations.map((c) => {
      const guest = db.findUserById(c.guestId);
      const owner = db.findUserById(c.ownerId);
      const messages = db.getMessagesByConversation(c.id);
      const lastMessage = messages[messages.length - 1];

      const { passwordHash: _g, ...sanitizedGuest } = guest || { id: c.guestId, name: 'Guest', email: '', role: 'guest' as const, avatar: '', isBlocked: false, isOnline: false, lastSeen: '' };
      const { passwordHash: _o, ...sanitizedOwner } = owner || { id: c.ownerId, name: 'Micheal', email: '', role: 'owner' as const, avatar: '', isBlocked: false, isOnline: true, lastSeen: 'online' };

      return {
        ...c,
        guestUser: sanitizedGuest as Omit<UserRecord, 'passwordHash'>,
        ownerUser: sanitizedOwner as Omit<UserRecord, 'passwordHash'>,
        lastMessage,
      };
    });
  }

  // Get messages for a conversation with strict authorization assertion
  public getMessages(conversationId: string, user: UserRecord): MessageRecord[] {
    const conv = assertConversationAccess(conversationId, user);
    if (!conv) {
      throw new Error('Forbidden. You do not have access to this conversation.');
    }

    // Reset unread count for current user
    if (user.role === 'owner') {
      db.updateConversation(conversationId, { unreadCountOwner: 0 });
    } else {
      db.updateConversation(conversationId, { unreadCountGuest: 0 });
    }

    const messages = db.getMessagesByConversation(conversationId);
    return messages.filter((m) => !m.deletedForUserIds?.includes(user.id));
  }

  // Create & send a new message with realtime broadcast
  public sendMessage(params: {
    conversationId: string;
    sender: UserRecord;
    type?: 'text' | 'image' | 'video' | 'audio' | 'file' | 'system' | 'call';
    content: string;
    attachments?: Array<{
      id: string;
      type: 'image' | 'video' | 'audio' | 'file';
      url: string;
      fileName: string;
      fileSize: number;
      mimeType?: string;
      duration?: number;
    }>;
    replyToId?: string;
    clientTempId?: string;
    callLog?: {
      callType: 'audio' | 'video';
      status: 'completed' | 'missed' | 'declined' | 'cancelled';
      duration: number;
    };
  }): MessageRecord {
    const { conversationId, sender, type = 'text', content, attachments, replyToId, clientTempId, callLog } = params;

    const conv = assertConversationAccess(conversationId, sender);
    if (!conv) {
      throw new Error('Forbidden. You do not have access to this conversation.');
    }

    if (sender.isBlocked) {
      throw new Error('You are blocked from sending messages.');
    }

    let replyToContext = undefined;
    if (replyToId) {
      const originalMsg = db.findMessageById(replyToId);
      if (originalMsg) {
        const originalSender = db.findUserById(originalMsg.senderId);
        replyToContext = {
          id: originalMsg.id,
          senderId: originalMsg.senderId,
          senderName: originalSender?.name || 'User',
          content: originalMsg.content,
          type: originalMsg.type,
        };
      }
    }

    const now = new Date().toISOString();
    const newMessage: MessageRecord = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      conversationId,
      senderId: sender.id,
      type,
      content: content.trim(),
      attachments,
      replyTo: replyToContext,
      callLog,
      clientTempId,
      status: 'sent',
      reactions: [],
      isEdited: false,
      isDeletedForEveryone: false,
      deletedForUserIds: [],
      createdAt: now,
      updatedAt: now,
    };

    db.createMessage(newMessage);

    // Increment recipient unread count & timestamp
    if (sender.role === 'owner') {
      db.updateConversation(conversationId, {
        lastMessageAt: now,
        unreadCountGuest: conv.unreadCountGuest + 1,
      });
    } else {
      db.updateConversation(conversationId, {
        lastMessageAt: now,
        unreadCountOwner: conv.unreadCountOwner + 1,
      });
    }

    // Broadcast to WebSocket subscribers
    broadcastToConversation(conversationId, {
      event: 'message.created',
      data: newMessage,
    });

    return newMessage;
  }

  // Toggle Reaction on a message
  public reactToMessage(messageId: string, user: UserRecord, emoji: string): MessageRecord {
    const msg = assertMessageAccess(messageId, user);
    if (!msg) {
      throw new Error('Message not found or unauthorized.');
    }

    const existingIdx = msg.reactions.findIndex((r) => r.userId === user.id && r.emoji === emoji);
    const now = new Date().toISOString();

    if (existingIdx >= 0) {
      msg.reactions.splice(existingIdx, 1);
    } else {
      msg.reactions.push({
        emoji,
        userId: user.id,
        userName: user.name,
        createdAt: now,
      });
    }

    db.updateMessage(msg.id, { reactions: msg.reactions });

    broadcastToConversation(msg.conversationId, {
      event: 'reaction.updated',
      data: { messageId: msg.id, reactions: msg.reactions },
    });

    return msg;
  }

  // Edit message
  public editMessage(messageId: string, user: UserRecord, newContent: string): MessageRecord {
    const msg = assertMessageAccess(messageId, user);
    if (!msg) {
      throw new Error('Message not found or unauthorized.');
    }

    if (msg.senderId !== user.id) {
      throw new Error('Forbidden. You can only edit your own messages.');
    }

    const updated = db.updateMessage(messageId, {
      content: newContent.trim(),
      isEdited: true,
    });

    if (updated) {
      broadcastToConversation(msg.conversationId, {
        event: 'message.updated',
        data: updated,
      });
    }

    return updated!;
  }

  // Delete message
  public deleteMessage(messageId: string, user: UserRecord, forEveryone: boolean): boolean {
    const msg = assertMessageAccess(messageId, user);
    if (!msg) {
      throw new Error('Message not found or unauthorized.');
    }

    if (forEveryone) {
      if (msg.senderId !== user.id && user.role !== 'owner') {
        throw new Error('Forbidden. Only the sender or owner can delete for everyone.');
      }
      db.updateMessage(messageId, { isDeletedForEveryone: true });
      broadcastToConversation(msg.conversationId, {
        event: 'message.deleted',
        data: { messageId, forEveryone: true },
      });
    } else {
      const deletedFor = [...(msg.deletedForUserIds || []), user.id];
      db.updateMessage(messageId, { deletedForUserIds: deletedFor });
    }

    return true;
  }

  // Clear all messages in conversation
  public clearConversation(conversationId: string, user: UserRecord): boolean {
    const conv = assertConversationAccess(conversationId, user);
    if (!conv) {
      throw new Error('Forbidden. You do not have access to this conversation.');
    }

    db.clearMessagesByConversation(conversationId, user.id, user.role === 'owner');

    // Reset unread counts
    db.updateConversation(conversationId, {
      unreadCountOwner: 0,
      unreadCountGuest: 0,
    });

    broadcastToConversation(conversationId, {
      event: 'conversation.cleared',
      data: { conversationId, clearedBy: user.id },
    });

    return true;
  }

  // Update conversation settings (archive, pin, unread count)
  public updateConversationSettings(
    conversationId: string,
    user: UserRecord,
    updates: { isArchived?: boolean; isPinned?: boolean; unreadCount?: number }
  ): ConversationRecord {
    const conv = assertConversationAccess(conversationId, user);
    if (!conv) {
      throw new Error('Forbidden. You do not have access to this conversation.');
    }

    const dbUpdates: Partial<ConversationRecord> = {};
    if (updates.isArchived !== undefined) dbUpdates.isArchived = updates.isArchived;
    if (updates.isPinned !== undefined) dbUpdates.isPinned = updates.isPinned;
    if (updates.unreadCount !== undefined) {
      if (user.role === 'owner') {
        dbUpdates.unreadCountOwner = updates.unreadCount;
      } else {
        dbUpdates.unreadCountGuest = updates.unreadCount;
      }
    }

    const updated = db.updateConversation(conversationId, dbUpdates);
    return updated!;
  }

  // Delete conversation permanently
  public deleteConversation(conversationId: string, user: UserRecord): boolean {
    const conv = assertConversationAccess(conversationId, user);
    if (!conv) {
      throw new Error('Forbidden. You do not have access to this conversation.');
    }

    // Broadcast deletion event to participants before removal
    broadcastToConversation(conversationId, {
      event: 'conversation.deleted',
      data: { conversationId, deletedBy: user.id },
    });

    return db.deleteConversation(conversationId);
  }

  // Delete user account permanently (Owner Only)
  public deleteUser(userId: string, currentUser: UserRecord): boolean {
    if (currentUser.role !== 'owner') {
      throw new Error('Forbidden. Only the owner can delete users.');
    }

    const targetUser = db.findUserById(userId);
    if (!targetUser) {
      throw new Error('User not found.');
    }
    if (targetUser.role === 'owner') {
      throw new Error('Cannot delete owner account.');
    }

    // Broadcast conversation deletion to each conversation of this user
    const userConvs = db.getConversations().filter(
      (c) => c.guestId === userId || c.ownerId === userId
    );
    for (const conv of userConvs) {
      broadcastToConversation(conv.id, {
        event: 'conversation.deleted',
        data: { conversationId: conv.id, userId },
      });
    }

    // Revoke active sessions for target user
    revokeUserSessions(userId, 'Your account has been deleted by the owner.');

    return db.deleteUser(userId);
  }
}

export const chatService = new ChatService();
