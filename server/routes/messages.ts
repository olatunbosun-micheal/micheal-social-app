import { Router, Response } from 'express';
import { z } from 'zod';
import { chatService } from '../services/chatService.js';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

const EditMessageSchema = z.object({
  content: z.string().min(1, 'Content cannot be empty'),
});

const ReactSchema = z.object({
  emoji: z.string().min(1, 'Emoji is required'),
});

// Edit message
router.patch('/:id', authenticateJWT, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validated = EditMessageSchema.parse(req.body);
    const updated = chatService.editMessage(id, req.user!, validated.content);
    res.json({ message: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to edit message';
    res.status(400).json({ error: message });
  }
});

// Delete message
router.delete('/:id', authenticateJWT, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const forEveryone = req.query.forEveryone === 'true';
    chatService.deleteMessage(id, req.user!, forEveryone);
    res.json({ success: true, messageId: id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete message';
    res.status(400).json({ error: message });
  }
});

// Toggle reaction
router.post('/:id/reactions', authenticateJWT, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validated = ReactSchema.parse(req.body);
    const updated = chatService.reactToMessage(id, req.user!, validated.emoji);
    res.json({ message: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to react to message';
    res.status(400).json({ error: message });
  }
});

export default router;
