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
      const host = typeof window !== 'undefined' && window.location.host 
        ? window.location.host 
        : '127.0.0.1:4000';

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

          // Handle notifications
          if (parsed.event === 'message.created') {
            soundFX.playReceive();
            this.showPushNotification(parsed.data);
          }
        } catch (e) {
          console.error('[Realtime] Message parse error:', e);
        }
      };

      this.socket.onclose = () => {
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

  public sendTyping(conversationId: string, isTyping: boolean) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({
          event: isTyping ? 'typing.started' : 'typing.stopped',
          data: { conversationId },
        })
      );
    }
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
