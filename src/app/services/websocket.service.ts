import { Injectable, OnDestroy } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface WsEvent<T = unknown> {
  type: string;
  data: T;
}

export const WS_EVENTS = {
  MESSAGE_NEW: 'message:new',
  MESSAGE_READ: 'message:read',
  MESSAGE_DELIVERED: 'message:delivered',
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',
  USER_ONLINE: 'user:online',
  USER_OFFLINE: 'user:offline',
  INTEREST_RECEIVED: 'interest:received',
  INTEREST_ACCEPTED: 'interest:accepted',
  CALL_INCOMING: 'call:incoming',
  CALL_ENDED: 'call:ended',
} as const;

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private readonly events$ = new Subject<WsEvent>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = false;
  private reconnectDelay = 3000;
  private consecutiveFailures = 0;
  private readonly MAX_RECONNECTS = 3;

  readonly events = this.events$.asObservable();
  isConnected = false;

  connect(token: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
    this.token = token;
    this.shouldReconnect = true;
    this.createConnection(token);
  }

  private createConnection(token: string): void {
    try {
      const wsBase = environment.apiUrl.replace(/^http/, 'ws').replace(/\/api$/, '');
      const wsUrl = `${wsBase}/ws?token=${encodeURIComponent(token)}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.reconnectDelay = 3000;
        this.consecutiveFailures = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data as string) as WsEvent;
          this.events$.next(parsed);
        } catch { /* ignore malformed frames */ }
      };

      this.ws.onerror = () => {
        this.isConnected = false;
        this.consecutiveFailures++;
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        if (this.shouldReconnect && this.consecutiveFailures < this.MAX_RECONNECTS) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 30000);
            this.createConnection(token);
          }, this.reconnectDelay);
        }
      };
    } catch {
      // WebSocket not available in test/SSR environments — silently skip
    }
  }

  send(type: string, data: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }));
    }
  }

  ofType<T>(eventType: string): Observable<T> {
    return this.events.pipe(
      filter(e => e.type === eventType),
      map(e => e.data as T),
    );
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
    this.isConnected = false;
  }

  ngOnDestroy(): void {
    this.disconnect();
    this.events$.complete();
  }
}
