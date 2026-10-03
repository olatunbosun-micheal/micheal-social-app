import { Router, Response } from 'express';
import { z } from 'zod';
import { inviteService } from '../services/inviteService.js';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth.js';
import { assertOwner } from '../middleware/authorization.js';
import { db } from '../db/index.js';

const router = Router();

const CreateInviteSchema = z.object({
  recipientName: z.string().optional(),
  note: z.string().optional(),
  maxUses: z.number().int().min(0).default(1),
  expiresInHours: z.number().nullable().optional(),
});

// Create Invitation (Owner Only)
router.post('/', authenticateJWT, assertOwner, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validated = CreateInviteSchema.parse(req.body);
    const result = await inviteService.createInvite({
      ...validated,
      createdById: req.user!.id,
    });
    res.status(201).json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create invite';
    res.status(400).json({ error: message });
  }
});

// List All Invitations (Owner Only)
router.get('/', authenticateJWT, assertOwner, (_req: AuthenticatedRequest, res: Response) => {
  const invites = db.getInvites();
  res.json({ invites });
});

// Public: Validate Invitation Link Token (e.g. /invite/A8K29Lm)
router.get('/validate/:code', (req, res: Response) => {
  const { code } = req.params;
  const validation = inviteService.validateInvite(code);
  if (!validation.valid) {
    res.status(400).json(validation);
    return;
  }
  res.json(validation);
});

// Revoke Invitation (Owner Only)
router.delete('/:id', authenticateJWT, assertOwner, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const updated = db.updateInvite(id, { isRevoked: true });
  if (!updated) {
    res.status(404).json({ error: 'Invite not found.' });
    return;
  }
  res.json({ success: true, message: 'Invitation revoked.' });
});

export default router;
