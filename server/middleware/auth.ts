import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';
import { UserRecord } from '../db/schema.js';

export const JWT_SECRET = process.env.AUTH_SECRET || 'personal-gateway-jwt-super-secret-key-2026';

export interface AuthenticatedRequest extends Request {
  user?: UserRecord;
}

export const authenticateJWT = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized. Authentication token required.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = db.findUserById(payload.userId);

    if (!user) {
      res.status(401).json({ error: 'User not found or session expired.' });
      return;
    }

    if (user.isBlocked) {
      res.status(403).json({ error: 'Your account is blocked from accessing this gateway.' });
      return;
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
};
