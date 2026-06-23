import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from '../../shared/modules/material.module';
import { EmailHistoryService, EmailNotification } from './notification.service';

type FilterTab = 'all' | 'unread' | 'messages' | 'interests' | 'system';

interface DetailState {
  loading: boolean;
  safeHtml: SafeHtml | null;
  error: boolean;
}

@Component({
  selector: 'app-notification',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FormsModule, MaterialModule, DatePipe],
  templateUrl: './notification.component.html',
  styleUrl:    './notification.component.scss',
})
export class NotificationComponent implements OnInit {
  protected readonly svc       = inject(EmailHistoryService);
  private   readonly sanitizer = inject(DomSanitizer);

  protected readonly activeFilter  = signal<FilterTab>('all');
  protected readonly searchQuery   = signal('');
  protected readonly pageSize      = signal(20);
  protected readonly markingAll    = signal(false);

  // Per-notification detail state (populated lazily on panel open)
  private readonly _detailMap = signal<Record<string, DetailState>>({});
  protected readonly detailMap = this._detailMap.asReadonly();

  readonly filterTabs: { value: FilterTab; label: string }[] = [
    { value: 'all',       label: 'All'       },
    { value: 'unread',    label: 'Unread'    },
    { value: 'messages',  label: 'Messages'  },
    { value: 'interests', label: 'Interests' },
    { value: 'system',    label: 'System'    },
  ];

  protected readonly filteredNotifications = computed(() => {
    const all    = this.svc.notifications();
    const filter = this.activeFilter();
    const query  = this.searchQuery().toLowerCase().trim();

    let list = all;

    switch (filter) {
      case 'unread':
        list = list.filter(n => !n.readAt);
        break;
      case 'messages':
        list = list.filter(n => n.emailType === 'OFFLINE_MESSAGE_SENT');
        break;
      case 'interests':
        list = list.filter(n =>
          ['INTEREST_SENT', 'INTEREST_ACCEPTED', 'INTEREST_REJECTED'].includes(n.emailType),
        );
        break;
      case 'system':
        list = list.filter(n =>
          ['PASSWORD_RESET', 'SYSTEM_NOTIFICATION', 'EMAIL_VERIFICATION',
           'PARTNER_RECOMMENDATION', 'PROFILE_VIEWED'].includes(n.emailType),
        );
        break;
    }

    if (query) {
      list = list.filter(n =>
        n.subject.toLowerCase().includes(query) ||
        this.svc.getTitle(n.emailType).toLowerCase().includes(query),
      );
    }

    return list;
  });

  protected readonly displayedNotifications = computed(() =>
    this.filteredNotifications().slice(0, this.pageSize()),
  );

  protected readonly hasMore = computed(() =>
    this.filteredNotifications().length > this.pageSize(),
  );

  protected readonly filterCount = computed(() => ({
    all:       this.svc.notifications().length,
    unread:    this.svc.unreadCount(),
    messages:  this.svc.notifications().filter(n => n.emailType === 'OFFLINE_MESSAGE_SENT').length,
    interests: this.svc.notifications().filter(n =>
      ['INTEREST_SENT', 'INTEREST_ACCEPTED', 'INTEREST_REJECTED'].includes(n.emailType)).length,
    system:    this.svc.notifications().filter(n =>
      ['PASSWORD_RESET', 'SYSTEM_NOTIFICATION', 'EMAIL_VERIFICATION',
       'PARTNER_RECOMMENDATION', 'PROFILE_VIEWED'].includes(n.emailType)).length,
  }));

  async ngOnInit(): Promise<void> {
    // Force a fresh load when the page is visited
    await this.svc.load();
  }

  setFilter(tab: FilterTab): void {
    this.activeFilter.set(tab);
    this.pageSize.set(20);
  }

  onSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
    this.pageSize.set(20);
  }

  loadMore(): void {
    this.pageSize.update(n => n + 20);
  }

  async refresh(): Promise<void> {
    this._detailMap.set({});  // clear cached detail panels
    await this.svc.load();
  }

  async markAllRead(): Promise<void> {
    this.markingAll.set(true);
    await this.svc.markAllRead();
    this.markingAll.set(false);
  }

  async onPanelOpened(notif: EmailNotification): Promise<void> {
    // Return if detail already loaded (even on error — retry via button)
    if (this._detailMap()[notif.id]) return;

    // Mark opened (once)
    if (!notif.openedAt) {
      this.svc.markOpened(notif.id);
    }

    // Start loading detail
    this._detailMap.update(m => ({
      ...m,
      [notif.id]: { loading: true, safeHtml: null, error: false },
    }));

    try {
      const detail  = await this.svc.getDetail(notif.guid);
      const html    = detail.htmlContent ?? '<p style="padding:16px;color:#666">No content available.</p>';
      const safeHtml = this.sanitizer.bypassSecurityTrustHtml(html);
      this._detailMap.update(m => ({
        ...m,
        [notif.id]: { loading: false, safeHtml, error: false },
      }));

      // Mark read after content is viewed
      if (!notif.readAt) {
        this.svc.markRead(notif.id);
      }
    } catch {
      this._detailMap.update(m => ({
        ...m,
        [notif.id]: { loading: false, safeHtml: null, error: true },
      }));
    }
  }

  async retryDetail(notif: EmailNotification): Promise<void> {
    // Clear cached error so onPanelOpened re-fetches
    this._detailMap.update(m => {
      const next = { ...m };
      delete next[notif.id];
      return next;
    });
    await this.onPanelOpened(notif);
  }

  trackById(_i: number, n: EmailNotification): string {
    return n.id;
  }
}
