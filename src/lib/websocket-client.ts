type MessageHandler = (data: unknown) => void;
type ConnectionStateHandler = (state: ConnectionState) => void;

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

interface WebSocketClientOptions {
  maxReconnectAttempts?: number;
  reconnectIntervalMs?: number;
  heartbeatIntervalMs?: number;
}

const DEFAULT_OPTIONS: Required<WebSocketClientOptions> = {
  maxReconnectAttempts: 10,
  reconnectIntervalMs: 2000,
  heartbeatIntervalMs: 30000,
};

class RealtimeClient {
  private ws: WebSocket | null = null;
  private url: string;
  private token: string | null = null;
  private options: Required<WebSocketClientOptions>;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private channelHandlers: Map<string, Set<MessageHandler>> = new Map();
  private stateHandlers: Set<ConnectionStateHandler> = new Set();
  private subscribedChannels: Set<string> = new Set();
  private state: ConnectionState = 'disconnected';

  constructor(url: string, options?: WebSocketClientOptions) {
    this.url = url;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  connect(token: string): void {
    this.token = token;
    this.reconnectAttempts = 0;
    this.doConnect();
  }

  disconnect(): void {
    this.stopReconnect();
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.setState('disconnected');
  }

  subscribe(channel: string, handler: MessageHandler): () => void {
    if (!this.channelHandlers.has(channel)) {
      this.channelHandlers.set(channel, new Set());
    }
    this.channelHandlers.get(channel)!.add(handler);
    this.subscribedChannels.add(channel);

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendSubscribe(channel);
    }

    return () => {
      const handlers = this.channelHandlers.get(channel);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.channelHandlers.delete(channel);
          this.subscribedChannels.delete(channel);
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.sendUnsubscribe(channel);
          }
        }
      }
    };
  }

  onStateChange(handler: ConnectionStateHandler): () => void {
    this.stateHandlers.add(handler);
    handler(this.state);
    return () => {
      this.stateHandlers.delete(handler);
    };
  }

  getState(): ConnectionState {
    return this.state;
  }

  private doConnect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) {
      return;
    }

    this.setState(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting');

    const wsUrl = `${this.url}?token=${encodeURIComponent(this.token || '')}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.setState('connected');
      this.startHeartbeat();
      this.resubscribeAll();
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const channel = message.channel;
        if (channel && this.channelHandlers.has(channel)) {
          this.channelHandlers.get(channel)!.forEach((handler) => {
            try {
              handler(message.data);
            } catch (err) {
              console.error('WebSocket handler error:', err);
            }
          });
        }
      } catch {
        // Non-JSON message, ignore
      }
    };

    this.ws.onclose = () => {
      this.stopHeartbeat();
      this.setState('disconnected');
      this.attemptReconnect();
    };

    this.ws.onerror = () => {
      // onclose will fire after onerror
    };
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.options.reconnectIntervalMs * Math.pow(1.5, this.reconnectAttempts - 1),
      30000
    );

    this.reconnectTimer = setTimeout(() => {
      if (this.token) {
        this.doConnect();
      }
    }, delay);
  }

  private stopReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = this.options.maxReconnectAttempts;
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ action: 'ping' }));
      }
    }, this.options.heartbeatIntervalMs);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private sendSubscribe(channel: string): void {
    this.ws?.send(JSON.stringify({ action: 'subscribe', channel }));
  }

  private sendUnsubscribe(channel: string): void {
    this.ws?.send(JSON.stringify({ action: 'unsubscribe', channel }));
  }

  private resubscribeAll(): void {
    this.subscribedChannels.forEach((channel) => {
      this.sendSubscribe(channel);
    });
  }

  private setState(state: ConnectionState): void {
    this.state = state;
    this.stateHandlers.forEach((handler) => handler(state));
  }
}

let realtimeInstance: RealtimeClient | null = null;

export function getRealtimeClient(): RealtimeClient {
  if (!realtimeInstance) {
    const wsUrl = import.meta.env.VITE_WS_URL || '';
    realtimeInstance = new RealtimeClient(wsUrl);
  }
  return realtimeInstance;
}

export { RealtimeClient };
export type { ConnectionState, WebSocketClientOptions, MessageHandler, ConnectionStateHandler };
