import { soundFX } from './soundEffects';

type EventCallback = (data: any) => void;

class RealtimeClient {
  private socket: WebSocket | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private token: string | null = null;
  private reconnectTimer: any = null;
  private activeRoom: string | null = null;

  public init(token: string) {
    this.token = token;
    this.connect();
    this.requestNotificationPermission();
  }

  public setToken(token: string) {
    this.token = token;
    if (this.socket) {
      this.socket.close();
    }
    this.connect();
  }

  private connect() {
    if (!this.token) return;

    try {
      const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
      const wsProtocol = isHttps ? 'wss:' : 'ws:';
      const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      const host = isLocal ? '127.0.0.1:4000' : (window.location.host || '127.0.0.1:4000');

      const wsUrl = `${wsProtocol}//${host}?token=${this.token}`;
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log('[Realtime] WebSocket connected');
        if (this.activeRoom) {
          this.joinConversation(this.activeRoom);
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          this.emit(parsed.event, parsed.data);

          // If session is revoked by the owner, immediately terminate session
          if (parsed.event === 'session.revoked') {
            localStorage.removeItem('gateway_token');
            alert(parsed.data?.reason || 'Your access has been revoked by the owner.');
            window.location.href = '/';
            return;
          }

          // Handle notifications
          if (parsed.event === 'message.created') {
            soundFX.playReceive();
            this.showPushNotification(parsed.data);
          }
        } catch (e) {
          console.error('[Realtime] Message parse error:', e);
        }
      };

      this.socket.onclose = (event) => {
        if (event.code === 4003) {
          localStorage.removeItem('gateway_token');
          window.location.href = '/';
          return;
        }
        console.log('[Realtime] WebSocket closed. Reconnecting in 3s...');
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => this.connect(), 3000);
      };

      this.socket.onerror = (err) => {
        console.warn('[Realtime] WebSocket error:', err);
      };
    } catch (err) {
      console.warn('[Realtime] Connection failed:', err);
    }
  }

  public joinConversation(conversationId: string) {
    this.activeRoom = conversationId;
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({
          event: 'join.conversation',
          data: { conversationId },
        })
      );
    }
  }

  public send(event: string, data: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ event, data }));
    }
  }

  public sendTyping(conversationId: string, isTyping: boolean) {
    this.send(isTyping ? 'typing.started' : 'typing.stopped', { conversationId });
  }

  public initiateCall(params: { targetUserId: string; conversationId: string; isVideo: boolean; callerName: string; callerAvatar?: string }) {
    this.send('call.start', params);
  }

  public acceptCall(params: { targetUserId: string; conversationId: string; isVideo?: boolean }) {
    this.send('call.accept', params);
  }

  public rejectCall(params: { targetUserId: string; conversationId: string; isVideo?: boolean; reason?: string }) {
    this.send('call.reject', params);
  }

  public endCall(params: {
    targetUserId: string;
    conversationId: string;
    duration?: number;
    isVideo?: boolean;
    status?: 'completed' | 'missed' | 'declined' | 'cancelled';
  }) {
    this.send('call.end', params);
  }

  public sendCallSignal(params: { targetUserId: string; signal: any }) {
    this.send('call.signal', params);
  }

  public on(event: string, cb: EventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(cb);
  }

  public off(event: string, cb: EventCallback) {
    const list = this.listeners.get(event);
    if (list) {
      list.delete(cb);
    }
  }

  private emit(event: string, data: any) {
    const list = this.listeners.get(event);
    if (list) {
      list.forEach((cb) => cb(data));
    }
  }

  public async requestNotificationPermission() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        try {
          await Notification.requestPermission();
        } catch {
          // ignore
        }
      }
    }
  }

  private showPushNotification(msg: any) {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const title = msg.senderName || 'New Message from Guest';
        const body = msg.content || (msg.type === 'audio' ? 'Sent a voice note' : 'Sent an attachment');
        new Notification(title, {
          body,
          icon: '/favicon.svg',
          badge: '/favicon.svg',
        });
      } catch {
        // Notification fallback
      }
    }
  }
}

export const realtimeClient = new RealtimeClient();
