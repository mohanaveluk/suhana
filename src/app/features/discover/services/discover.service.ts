import { Injectable, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import {
  CreateReviewRequest, DiscoverCategory, DiscoverReview, DiscoverReviewList, DiscoverSearchQuery, Paged, ProviderCard,
  ProviderContact, ProviderDetail, ProviderSearchResponse,
} from '../models/discover.model';
import { apiErrorMessage, coarsen } from '../utils/discover.utils';

/**
 * Aurora Discover member state. All endpoints require a signed-in member
 * (routes are behind authGuard). Device coordinates live only in memory here —
 * never in the URL, never in storage.
 */
@Injectable({ providedIn: 'root' })
export class DiscoverService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  private readonly _categories = signal<DiscoverCategory[] | null>(null);
  readonly categories = this._categories.asReadonly();

  private readonly _results = signal<ProviderSearchResponse | null>(null);
  readonly results = this._results.asReadonly();
  private readonly _loading = signal(false);
  readonly loading = this._loading.asReadonly();
  private readonly _error = signal<string | null>(null);
  readonly error = this._error.asReadonly();

  /** "Use my location" result for this session only (rounded to ~1 km). */
  private readonly _deviceLocation = signal<{ lat: number; lng: number } | null>(null);
  readonly deviceLocation = this._deviceLocation.asReadonly();

  private readonly contactCache = new Map<string, ProviderContact>();
  private searchSeq = 0;

  constructor() {
    // Per-member state must not leak across sign-outs / account switches.
    let lastUser: string | null | undefined;
    effect(() => {
      const id = this.auth.user()?.id ?? null;
      if (lastUser !== undefined && id !== lastUser) this.reset();
      lastUser = id;
    });
  }

  reset(): void {
    this._results.set(null);
    this._error.set(null);
    this._deviceLocation.set(null);
    this.contactCache.clear();
    this.lastQuery = null;
  }

  async loadCategories(force = false): Promise<DiscoverCategory[]> {
    if (this._categories() && !force) return this._categories()!;
    const rows = await firstValueFrom(this.api.getDiscoverCategories());
    this._categories.set(rows);
    return rows;
  }

  setDeviceLocation(lat: number, lng: number): void {
    this._deviceLocation.set({ lat: coarsen(lat), lng: coarsen(lng) });
  }

  clearDeviceLocation(): void {
    this._deviceLocation.set(null);
  }

  /** Runs a search; stale responses (from an earlier, slower request) are dropped. */
  /** Location part of the last search, so a detail page can show the same distance. */
  originQuery(): DiscoverSearchQuery {
    const q = this.lastQuery;
    if (!q) return {};
    return { country: q.country, postalCode: q.postalCode, unit: q.unit, lat: q.lat, lng: q.lng };
  }
  private lastQuery: DiscoverSearchQuery | null = null;

  /** Category the current `results` belong to (guards against showing one category's results on another's page). */
  private readonly _resultsCategory = signal<string | null>(null);
  readonly resultsCategory = this._resultsCategory.asReadonly();

  async search(category: string, query: DiscoverSearchQuery): Promise<void> {
    this.lastQuery = query;
    const seq = ++this.searchSeq;
    if (this._resultsCategory() !== category) this._results.set(null);
    this._loading.set(true);
    this._error.set(null);
    try {
      const res = await firstValueFrom(this.api.searchDiscoverProviders(category, query));
      if (seq === this.searchSeq) {
        this._results.set(res);
        this._resultsCategory.set(category);
      }
    } catch (err) {
      if (seq === this.searchSeq) {
        this._results.set(null);
        this._error.set(apiErrorMessage(err, 'Could not load results. Please try again.'));
      }
    } finally {
      if (seq === this.searchSeq) this._loading.set(false);
    }
  }

  getProvider(id: string, category: string, origin: DiscoverSearchQuery = {}): Promise<ProviderDetail> {
    return firstValueFrom(this.api.getDiscoverProvider(id, category, origin));
  }

  async getContact(id: string): Promise<ProviderContact> {
    const cached = this.contactCache.get(id);
    if (cached) return cached;
    const c = await firstValueFrom(this.api.getDiscoverProviderContact(id));
    this.contactCache.set(id, c);
    return c;
  }

  /**
   * Optimistic favorite toggle on the current results; rolls back on failure.
   * Returns the new state, or throws a readable Error.
   */
  async toggleFavorite(card: Pick<ProviderCard, 'id' | 'isFavorite'>): Promise<boolean> {
    const next = !card.isFavorite;
    this.patchResult(card.id, next);
    try {
      const res = await firstValueFrom(
        next ? this.api.addDiscoverFavorite(card.id) : this.api.removeDiscoverFavorite(card.id),
      );
      return res.isFavorite;
    } catch (err) {
      this.patchResult(card.id, !next);
      throw new Error(apiErrorMessage(err, 'Could not update your saved list.'));
    }
  }

  private patchResult(id: string, isFavorite: boolean): void {
    const r = this._results();
    if (!r) return;
    this._results.set({ ...r, items: r.items.map((i) => (i.id === id ? { ...i, isFavorite } : i)) });
  }

  getFavorites(page = 1, limit = 20): Promise<Paged<ProviderCard>> {
    return firstValueFrom(this.api.getDiscoverFavorites(page, limit));
  }

  getReviews(providerId: string, page = 1): Promise<DiscoverReviewList> {
    return firstValueFrom(this.api.getDiscoverReviews(providerId, page, 10));
  }

  createReview(providerId: string, dto: CreateReviewRequest): Promise<DiscoverReview> {
    return firstValueFrom(this.api.createDiscoverReview(providerId, dto));
  }
}
