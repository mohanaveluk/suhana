import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { WebSocketService, WS_EVENTS } from './websocket.service';

export type NotificationType =
  | 'message'
  | 'interest_received'
  | 'interest_accepted'
  | 'email_sent'
  | 'profile_view';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: Date;
  isRead: boolean;
  linkUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly api  = inject(ApiService);
  private readonly _notifications = signal<AppNotification[]>([]);

  readonly notifications = this._notifications.asReadonly();
  readonly unreadCount   = computed(() => this._notifications().filter(n => !n.isRead).length);

  constructor() {
    const auth = inject(AuthService);
    const ws   = inject(WebSocketService);

    // Auto-load from API when user authenticates; clear on logout
    effect(() => {
      if (auth.authenticated()) {
        this.loadFromApi();
      } else {
        this._notifications.set([]);
      }
    });

    // Real-time: new chat message
    ws.ofType<any>(WS_EVENTS.MESSAGE_NEW).subscribe(data => {
      this.push({
        type: 'message',
        title: 'New Message',
        body: `${data?.senderName ?? 'Someone'} sent you a message`,
        linkUrl: '/chat',
      });
    });

    // Real-time: connection request received
    ws.ofType<any>(WS_EVENTS.INTEREST_RECEIVED).subscribe(data => {
      this.push({
        type: 'interest_received',
        title: 'Connection Request',
        body: `${data?.fromUserName ?? 'Someone'} sent you a connection request`,
        linkUrl: '/shortlist',
      });
    });

    // Real-time: connection request accepted
    ws.ofType<any>(WS_EVENTS.INTEREST_ACCEPTED).subscribe(data => {
      this.push({
        type: 'interest_accepted',
        title: 'Request Accepted',
        body: `${data?.byUserName ?? 'Someone'} accepted your connection request`,
        linkUrl: '/chat',
      });
    });
  }

  async loadFromApi(): Promise<void> {
    try {
      const res  = await firstValueFrom(this.api.getNotifications());
      const list = (res?.data ?? res ?? []).map((item: any): AppNotification => ({
        id:        item.id,
        type:      (item.type ?? 'email_sent') as NotificationType,
        title:     item.title ?? '',
        body:      item.body ?? item.message ?? '',
        createdAt: new Date(item.createdAt ?? item.created_at ?? Date.now()),
        isRead:    item.isRead ?? item.is_read ?? false,
        linkUrl:   item.linkUrl,
      }));
      if (Array.isArray(list) && list.length > 0) {
        this._notifications.set(list);
      }
    } catch {
      // Backend may not have a notifications endpoint yet — WS events still work
    }
  }

  markAsRead(id: string): void {
    this._notifications.update(list =>
      list.map(n => n.id === id ? { ...n, isRead: true } : n),
    );
    this.api.markNotificationRead(id).subscribe({ error: () => {} });
  }

  markAllAsRead(): void {
    this._notifications.update(list => list.map(n => ({ ...n, isRead: true })));
    this.api.markAllNotificationsRead().subscribe({ error: () => {} });
  }

  private push(partial: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>): void {
    const n: AppNotification = {
      id:        `local_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      createdAt: new Date(),
      isRead:    false,
      ...partial,
    };
    this._notifications.update(list => [n, ...list].slice(0, 50));
  }
}
