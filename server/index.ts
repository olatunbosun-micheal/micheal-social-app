import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';

import authRoutes from './routes/auth.js';
import inviteRoutes from './routes/invites.js';
import conversationRoutes from './routes/conversations.js';
import messageRoutes from './routes/messages.js';
import mediaRoutes from './routes/media.js';
import { initWebSocketServer } from './realtime/websocket.js';

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static uploads folder
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/media', mediaRoutes);

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'online',
    gateway: 'Personal Communication Gateway',
    timestamp: new Date().toISOString(),
  });
});

// Serve frontend in production
const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));

app.get('{*path}', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

// Create HTTP Server & attach WebSocket server
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
initWebSocketServer(wss);

server.listen(PORT, () => {
  console.log(`Gateway Backend & WebSocket server running on http://localhost:${PORT}`);
});
