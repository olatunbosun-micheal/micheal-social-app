import { Router, Response } from 'express';
import { z } from 'zod';
import { chatService } from '../services/chatService.js';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

const SendMessageSchema = z.object({
  type: z.enum(['text', 'image', 'video', 'audio', 'file', 'system']).default('text'),
  content: z.string().min(1, 'Message content cannot be empty'),
  attachments: z.array(z.object({
    id: z.string(),
    type: z.enum(['image', 'video', 'audio', 'file']),
    url: z.string(),
    fileName: z.string(),
    fileSize: z.number(),
    mimeType: z.string().optional(),
    duration: z.number().optional(),
  })).optional(),
  replyToId: z.string().optional(),
});

// List conversations visible to authenticated user
router.get('/', authenticateJWT, (req: AuthenticatedRequest, res: Response) => {
  try {
    const list = chatService.getConversationsForUser(req.user!);
    res.json({ conversations: list });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error fetching conversations';
    res.status(500).json({ error: message });
  }
});

// Get messages for a specific conversation (Strictly Authorized)
router.get('/:id/messages', authenticateJWT, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const messages = chatService.getMessages(id, req.user!);
    res.json({ messages });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error fetching messages';
    res.status(403).json({ error: message });
  }
});

// Send message to conversation
router.post('/:id/messages', authenticateJWT, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validated = SendMessageSchema.parse(req.body);
    const message = chatService.sendMessage({
      conversationId: id,
      sender: req.user!,
      ...validated,
    });
    res.status(201).json({ message });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to send message';
    res.status(400).json({ error: msg });
  }
});

export default router;
