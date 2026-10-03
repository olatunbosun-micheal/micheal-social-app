import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';
import { UserRecord } from '../db/schema.js';
import { JWT_SECRET } from '../middleware/auth.js';
import { inviteService } from './inviteService.js';

export class AuthService {
  // Register a new user via invite code
  public async registerWithInvite(params: {
    name: string;
    email: string;
    password: string;
    inviteCode: string;
  }): Promise<{ user: Omit<UserRecord, 'passwordHash'>; token: string; conversationId: string }> {
    const { name, email, password, inviteCode } = params;

    // Validate invite first
    const inviteValidation = inviteService.validateInvite(inviteCode);
    if (!inviteValidation.valid) {
      throw new Error(inviteValidation.error || 'Invalid invitation.');
    }

    // Check if email already registered
    const existing = db.findUserByEmail(email);
    if (existing) {
      throw new Error('An account with this email address already exists.');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();

    const newUser: UserRecord = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      role: 'guest',
      avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80`,
      statusMessage: 'Joined via personal invitation',
      isBlocked: false,
      isOnline: true,
      lastSeen: 'online',
      createdAt: now,
      updatedAt: now,
    };

    db.createUser(newUser);

    // Consume invite and link 1-on-1 conversation
    const conv = inviteService.consumeInvite(inviteCode, newUser);

    const token = jwt.sign({ userId: newUser.id, role: newUser.role }, JWT_SECRET, {
      expiresIn: '30d',
    });

    const { passwordHash: _, ...sanitizedUser } = newUser;
    return { user: sanitizedUser, token, conversationId: conv.id };
  }

  // Regular login
  public async login(email: string, password: string): Promise<{ user: Omit<UserRecord, 'passwordHash'>; token: string }> {
    const user = db.findUserByEmail(email);
    if (!user) {
      throw new Error('Invalid email or password.');
    }

    if (user.isBlocked) {
      throw new Error('This account has been blocked.');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new Error('Invalid email or password.');
    }

    // Mark online
    db.updateUser(user.id, { isOnline: true, lastSeen: 'online' });

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: '30d',
    });

    const { passwordHash: _, ...sanitizedUser } = user;
    return { user: sanitizedUser, token };
  }
}

export const authService = new AuthService();
