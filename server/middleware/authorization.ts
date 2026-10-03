import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.js';
import { db } from '../db/index.js';
import { ConversationRecord, MessageRecord } from '../db/schema.js';

export const assertOwner = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user || req.user.role !== 'owner') {
    res.status(403).json({ error: 'Forbidden. Owner privileges required.' });
    return;
  }
  next();
};

export const assertConversationAccess = (conversationId: string, user: { id: string; role: string }): ConversationRecord | null => {
  const conv = db.findConversationById(conversationId);
  if (!conv) return null;

  if (user.role === 'owner') return conv;
  if (conv.guestId === user.id) return conv;

  // Strict isolation: User is neither owner nor the assigned guest
  return null;
};

export const assertMessageAccess = (messageId: string, user: { id: string; role: string }): MessageRecord | null => {
  const msg = db.findMessageById(messageId);
  if (!msg) return null;

  const conv = assertConversationAccess(msg.conversationId, user);
  if (!conv) return null;

  return msg;
};
