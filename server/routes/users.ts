import { Router, Response } from 'express';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth.js';
import { assertOwner } from '../middleware/authorization.js';
import { chatService } from '../services/chatService.js';

const router = Router();

// Delete a user account and wipe their communication history (Owner Only)
router.delete('/:id', authenticateJWT, assertOwner, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    chatService.deleteUser(id, req.user!);
    res.json({
      success: true,
      userId: id,
      message: 'User account and all associated messages permanently deleted.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete user';
    res.status(403).json({ error: msg });
  }
});

export default router;
