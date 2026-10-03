import { Router, Response } from 'express';
import { z } from 'zod';
import { authService } from '../services/authService.js';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

const RegisterInviteSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  inviteCode: z.string().min(1, 'Invite code is required'),
});

const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Register with personal invitation code
router.post('/register-invite', async (req, res: Response) => {
  try {
    const validated = RegisterInviteSchema.parse(req.body);
    const result = await authService.registerWithInvite(validated);
    res.status(201).json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Registration failed';
    res.status(400).json({ error: message });
  }
});

// Login
router.post('/login', async (req, res: Response) => {
  try {
    const validated = LoginSchema.parse(req.body);
    const result = await authService.login(validated.email, validated.password);
    res.status(200).json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Login failed';
    res.status(400).json({ error: message });
  }
});

// Get current authenticated user
router.get('/me', authenticateJWT, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const { passwordHash: _, ...sanitized } = req.user;
  res.json({ user: sanitized });
});

export default router;
