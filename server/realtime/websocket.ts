import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';
import { JWT_SECRET } from '../middleware/auth.js';
import { assertConversationAccess } from '../middleware/authorization.js';

interface AuthenticatedSocket extends WebSocket {
  userId?: string;
  userRole?: string;
  isAlive?: boolean;
}

const clientRooms = new Map<string, Set<AuthenticatedSocket>>(); // conversationId -> Set of sockets
const userSockets = new Map<string, Set<AuthenticatedSocket>>(); // userId -> Set of sockets

export const initWebSocketServer = (wss: WebSocketServer): void => {
  wss.on('connection', (ws: AuthenticatedSocket, req) => {
    ws.isAlive = true;

    // Extract token from query params: ws://localhost:4000?token=...
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(4001, 'Unauthorized: Missing token');
      return;
    }

    try {
      const payload = jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
      const user = db.findUserById(payload.userId);
      if (!user || user.isBlocked) {
        ws.close(4003, 'Forbidden: User not found or blocked');
        return;
      }

      ws.userId = user.id;
      ws.userRole = user.role;

      // Track user socket
      if (!userSockets.has(user.id)) {
        userSockets.set(user.id, new Set());
      }
      userSockets.get(user.id)!.add(ws);

      // Update user online presence
      db.updateUser(user.id, { isOnline: true, lastSeen: 'online' });
      broadcastPresence(user.id, true);

      // Handle socket incoming messages
      ws.on('message', (messageRaw) => {
        try {
          const payload = JSON.parse(messageRaw.toString());
          handleSocketEvent(ws, payload);
        } catch (e) {
          console.error('WebSocket parse error:', e);
        }
      });

      // Handle disconnection
      ws.on('close', () => {
        if (ws.userId) {
          const sockets = userSockets.get(ws.userId);
          if (sockets) {
            sockets.delete(ws);
            if (sockets.size === 0) {
              userSockets.delete(ws.userId);
              const now = new Date().toISOString();
              db.updateUser(ws.userId, { isOnline: false, lastSeen: now });
              broadcastPresence(ws.userId, false);
            }
          }

          // Remove from rooms
          clientRooms.forEach((sockets) => sockets.delete(ws));
        }
      });
    } catch {
      ws.close(4001, 'Unauthorized: Invalid token');
    }
  });
};

const handleSocketEvent = (ws: AuthenticatedSocket, message: { event: string; data: unknown }) => {
  if (!ws.userId) return;

  const { event, data } = message;

  // Subscribe to conversation room (with strict authorization assertion!)
  if (event === 'join.conversation') {
    const { conversationId } = data as { conversationId: string };
    const conv = assertConversationAccess(conversationId, { id: ws.userId, role: ws.userRole! });
    if (!conv) {
      ws.send(JSON.stringify({ event: 'error', data: { message: 'Unauthorized room access' } }));
      return;
    }

    if (!clientRooms.has(conversationId)) {
      clientRooms.set(conversationId, new Set());
    }
    clientRooms.get(conversationId)!.add(ws);
  }

  // Ephemeral Typing Started / Stopped
  if (event === 'typing.started' || event === 'typing.stopped') {
    const { conversationId } = data as { conversationId: string };
    const conv = assertConversationAccess(conversationId, { id: ws.userId, role: ws.userRole! });
    if (conv) {
      broadcastToConversation(conversationId, {
        event,
        data: { conversationId, userId: ws.userId },
      }, ws);
    }
  }

  // WebRTC 1-on-1 Call Signaling (Audio & Video)
  if (
    event === 'call.start' ||
    event === 'call.accept' ||
    event === 'call.reject' ||
    event === 'call.end' ||
    event === 'call.signal'
  ) {
    const callData = data as { targetUserId?: string; conversationId?: string; [key: string]: unknown };
    if (callData.targetUserId) {
      const recipientSockets = userSockets.get(callData.targetUserId);
      if (recipientSockets) {
        const messageString = JSON.stringify({
          event,
          data: {
            ...callData,
            fromUserId: ws.userId,
          },
        });
        recipientSockets.forEach((s) => {
          if (s.readyState === WebSocket.OPEN) {
            s.send(messageString);
          }
        });
      }
    }
  }
};

export const broadcastToConversation = (
  conversationId: string,
  payload: { event: string; data: unknown },
  excludeSocket?: AuthenticatedSocket
): void => {
  const targetSockets = new Set<AuthenticatedSocket>();

  const roomSockets = clientRooms.get(conversationId);
  if (roomSockets) {
    roomSockets.forEach((s) => targetSockets.add(s));
  }

  // Also broadcast to the conversation's owner and guest directly via their user sockets
  const conv = db.findConversationById(conversationId);
  if (conv) {
    const ownerSockets = userSockets.get(conv.ownerId);
    if (ownerSockets) ownerSockets.forEach((s) => targetSockets.add(s));
    const guestSockets = userSockets.get(conv.guestId);
    if (guestSockets) guestSockets.forEach((s) => targetSockets.add(s));
  }

  if (targetSockets.size === 0) return;

  const serialized = JSON.stringify(payload);
  targetSockets.forEach((s) => {
    if (s !== excludeSocket && s.readyState === WebSocket.OPEN) {
      s.send(serialized);
    }
  });
};

const broadcastPresence = (userId: string, isOnline: boolean) => {
  const payload = JSON.stringify({
    event: 'presence.updated',
    data: { userId, isOnline, lastSeen: isOnline ? 'online' : new Date().toISOString() },
  });

  userSockets.forEach((sockets) => {
    sockets.forEach((s) => {
      if (s.readyState === WebSocket.OPEN) {
        s.send(payload);
      }
    });
  });
};
