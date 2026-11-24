import { DestroyRef, Injectable, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import { InterestService } from '../../../services/interest.service';
import { UserProfile } from '../../../models/user.model';
import {
  DEFAULT_INTERACTION_QUERY, InteractionDashboard, InteractionItem, InteractionQuery,
} from '../models/member-interaction.model';

/** Header badge refresh while signed in (there is no real-time push for interests yet). */
const DASHBOARD_REFRESH_MS = 3 * 60 * 1000;

/**
 * "My Interests" state: dashboard counts (also drives the header badge), current filters and the
 * paginated interaction list. All status changes go through the existing /interests and /user
 * endpoints; after each one the list and counts are reloaded from the server.
 */
@Injectable({ providedIn: 'root' })
export class MemberInteractionsService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly interests = inject(InterestService);

  private readonly _dashboard = signal<InteractionDashboard | null>(null);
  private readonly _items = signal<InteractionItem[]>([]);
  private readonly _total = signal(0);
  private readonly _totalPages = signal(0);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _query = signal<InteractionQuery>({ ...DEFAULT_INTERACTION_QUERY });
  /** Interaction keys with an action in flight (disables that card's buttons). */
  private readonly _busy = signal<ReadonlySet<string>>(new Set());

  readonly dashboard = this._dashboard.asReadonly();
  readonly items = this._items.asReadonly();
  readonly total = this._total.asReadonly();
  readonly totalPages = this._totalPages.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly query = this._query.asReadonly();
  readonly busy = this._busy.asReadonly();

  /** New (unopened) received interests — the header badge. */
  readonly newInterestCount = computed(() => this._dashboard()?.newInterests ?? 0);
  readonly newMessageCount = computed(() => this._dashboard()?.newMessages ?? 0);

  private listRequest = 0;

  constructor() {
    const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
    // Counts follow the session: load on sign-in, refresh periodically, clear on sign-out.
    effect(onCleanup => {
      if (!this.auth.authenticated()) {
        this.reset();
        return;
      }
      void this.refreshDashboard();
      if (!isBrowser) return;
      const timer = setInterval(() => void this.refreshDashboard(), DASHBOARD_REFRESH_MS);
      onCleanup(() => clearInterval(timer));
    });
    inject(DestroyRef).onDestroy(() => this.reset());
  }

  async refreshDashboard(): Promise<void> {
    if (!this.auth.authenticated()) return;
    try {
      this._dashboard.set(await firstValueFrom(this.api.getInteractionDashboard()));
    } catch {
      /* keep the last known counts; the badge is not critical */
    }
  }

  /** Change filters. Any change other than the page itself goes back to page 1. */
  setQuery(patch: Partial<InteractionQuery>): void {
    const pageOnly = Object.keys(patch).every(k => k === 'page');
    this._query.update(q => ({ ...q, ...patch, page: pageOnly ? patch.page ?? q.page : 1 }));
    void this.load();
  }

  async load(): Promise<void> {
    const request = ++this.listRequest;
    this._loading.set(true);
    this._error.set(null);
    try {
      const res = await firstValueFrom(this.api.getInteractions(this._query()));
      if (request !== this.listRequest) return; // a newer filter change won
      this._items.set(res?.data ?? []);
      this._total.set(res?.total ?? 0);
      this._totalPages.set(res?.totalPages ?? 0);
    } catch (err: any) {
      if (request !== this.listRequest) return;
      this._error.set(err?.error?.message ?? 'We could not load your interests. Please try again.');
    } finally {
      if (request === this.listRequest) this._loading.set(false);
    }
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  /** Opening a new received interest marks it "Viewed" (optimistic; reverted on failure). */
  async markRead(item: InteractionItem): Promise<void> {
    if (item.type !== 'INTEREST' || item.direction !== 'received' || item.status !== 'new' || !item.interestId) return;
    this.patchItem(item.key, { status: 'viewed' });
    try {
      await firstValueFrom(this.api.markInterestRead(item.interestId));
      void this.refreshDashboard();
    } catch {
      this.patchItem(item.key, { status: 'new' });
    }
  }

  accept(item: InteractionItem): Promise<void> {
    return this.run(item, () => firstValueFrom(this.api.acceptInterest(item.interestId!)));
  }

  decline(item: InteractionItem): Promise<void> {
    return this.run(item, () => firstValueFrom(this.api.declineInterest(item.interestId!)));
  }

  withdraw(item: InteractionItem): Promise<void> {
    return this.run(item, () => firstValueFrom(this.api.withdrawInterest(item.interestId!)));
  }

  sendInterest(item: InteractionItem): Promise<void> {
    const p = item.partner;
    const message = this.interests.buildDefaultMessage({
      firstName: p.name.split(' ')[0],
      occupation: { title: p.occupation ?? '' },
      location: { city: p.city ?? '' },
    } as UserProfile);
    return this.run(item, () => this.interests.sendInterest(p.userId, message, 'MY_INTERESTS'));
  }

  block(item: InteractionItem): Promise<void> {
    return this.run(item, () => firstValueFrom(this.api.blockUser(item.partner.userId)));
  }

  report(item: InteractionItem, reason: string): Promise<void> {
    return this.run(item, () => firstValueFrom(this.api.reportUser(item.partner.userId, reason)), false);
  }

  // ── internals ────────────────────────────────────────────────────────────

  /** Runs an action for one card, then reloads list + counts. Errors propagate to the page (snackbar). */
  private async run(item: InteractionItem, action: () => Promise<unknown>, reload = true): Promise<void> {
    this._busy.update(s => new Set(s).add(item.key));
    try {
      await action();
      if (reload) await Promise.all([this.load(), this.refreshDashboard()]);
    } finally {
      this._busy.update(s => {
        const next = new Set(s);
        next.delete(item.key);
        return next;
      });
    }
  }

  private patchItem(key: string, patch: Partial<InteractionItem>): void {
    this._items.update(list => list.map(i => (i.key === key ? { ...i, ...patch } : i)));
  }

  private reset(): void {
    this._dashboard.set(null);
    this._items.set([]);
    this._total.set(0);
    this._totalPages.set(0);
    this._query.set({ ...DEFAULT_INTERACTION_QUERY });
  }
}
