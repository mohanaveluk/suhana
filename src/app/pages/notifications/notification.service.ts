import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

// ── Types ────────────────────────────────────────────────────────────────────

export type EmailType =
  | 'INTEREST_SENT'
  | 'INTEREST_ACCEPTED'
  | 'INTEREST_REJECTED'
  | 'OFFLINE_MESSAGE_SENT'
  | 'PARTNER_RECOMMENDATION'
  | 'PROFILE_VIEWED'
  | 'PASSWORD_RESET'
  | 'SYSTEM_NOTIFICATION'
  | 'EMAIL_VERIFICATION';

export interface EmailNotification {
  id: string;
  guid: string;
  emailType: EmailType;
  subject: string;
  sentAt: string;         // ISO date string
  openedAt: string | null;
  readAt: string | null;
}

export interface EmailNotificationDetail extends EmailNotification {
  htmlContent: string;
}

// ── Lookup maps (static, no module needed) ────────────────────────────────────

const TYPE_ICONS: Record<string, string> = {
  INTEREST_SENT:          'favorite_border',
  INTEREST_ACCEPTED:      'favorite',
  INTEREST_REJECTED:      'heart_broken',
  OFFLINE_MESSAGE_SENT:   'mail',
  PARTNER_RECOMMENDATION: 'recommend',
  PROFILE_VIEWED:         'visibility',
  PASSWORD_RESET:         'lock_reset',
  SYSTEM_NOTIFICATION:    'notifications',
  EMAIL_VERIFICATION:     'verified',
};

const TYPE_TITLES: Record<string, string> = {
  INTEREST_SENT:          'Interest Request Sent',
  INTEREST_ACCEPTED:      'Interest Request Accepted ❤️',
  INTEREST_REJECTED:      'Interest Request Declined',
  OFFLINE_MESSAGE_SENT:   'New Offline Message',
  PARTNER_RECOMMENDATION: 'Recommended Partner Match',
  PROFILE_VIEWED:         'Someone Viewed Your Profile',
  PASSWORD_RESET:         'Password Reset Request',
  SYSTEM_NOTIFICATION:    'System Notification',
  EMAIL_VERIFICATION:     'Verify Your Email Address',
};

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class EmailHistoryService {
  private readonly api = inject(ApiService);

  private readonly _notifications = signal<EmailNotification[]>([]);
  private readonly _isLoading     = signal(false);
  private readonly _error         = signal<string | null>(null);
  private refreshTimer: ReturnType<typeof setInterval> | undefined;

  readonly notifications = this._notifications.asReadonly();
  readonly isLoading     = this._isLoading.asReadonly();
  readonly error         = this._error.asReadonly();
  readonly unreadCount   = computed(() =>
    this._notifications().filter(n => !n.readAt).length,
  );

  constructor() {
    const auth = inject(AuthService);
    effect(() => {
      if (auth.authenticated()) {
        this.load();
        this.startAutoRefresh();
      } else {
        this.stopAutoRefresh();
        this._notifications.set([]);
        this._error.set(null);
      }
    });
  }

  async load(): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);
    try {
      const res  = await firstValueFrom(this.api.getEmailNotifications());
      const list: EmailNotification[] = Array.isArray(res) ? res : (res?.data ?? []);
      list.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
      this._notifications.set(list);
    } catch {
      this._error.set('Unable to load notifications. Please try again.');
    } finally {
      this._isLoading.set(false);
    }
  }

  async getDetail(guid: string): Promise<EmailNotificationDetail> {
    const res = await firstValueFrom(this.api.getEmailNotificationDetail(guid));
    return res?.data ?? res;
  }

  async markOpened(id: string): Promise<void> {
    try {
      await firstValueFrom(this.api.markEmailOpened(id));
      this._notifications.update(list =>
        list.map(n => n.id === id ? { ...n, openedAt: new Date().toISOString() } : n),
      );
    } catch { /* silently fail */ }
  }

  async markRead(id: string): Promise<void> {
    try {
      await firstValueFrom(this.api.markEmailRead(id));
      this._notifications.update(list =>
        list.map(n => n.id === id ? { ...n, readAt: new Date().toISOString() } : n),
      );
    } catch { /* silently fail */ }
  }

  async markAllRead(): Promise<void> {
    try {
      await firstValueFrom(this.api.markAllEmailRead());
      const now = new Date().toISOString();
      this._notifications.update(list =>
        list.map(n => ({ ...n, readAt: n.readAt ?? now })),
      );
    } catch { /* silently fail */ }
  }

  getIcon(emailType: string): string {
    return TYPE_ICONS[emailType] ?? 'notifications';
  }

  getTitle(emailType: string): string {
    return TYPE_TITLES[emailType] ?? emailType.replace(/_/g, ' ');
  }

  timeAgo(dateStr: string): string {
    const diff    = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60_000);
    const hours   = Math.floor(diff / 3_600_000);
    const days    = Math.floor(diff / 86_400_000);

    if (minutes < 1)  return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24)   return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days === 1)   return 'Yesterday';
    if (days < 7)     return `${days} days ago`;
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  private startAutoRefresh(): void {
    this.stopAutoRefresh();
    this.refreshTimer = setInterval(() => { this.load(); }, 60_000);
  }

  private stopAutoRefresh(): void {
    if (this.refreshTimer !== undefined) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
    }
  }
}
