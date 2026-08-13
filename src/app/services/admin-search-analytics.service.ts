import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ApiService } from './api.service';
import {
  DAY_RANGES, FacetCount, FailedSearch, FallbackRate, TrendFacet,
  fallbackLevel,
} from '../models/admin-search-analytics.model';

const TREND_LIMIT = 10;
const TRAIT_LIMIT = 15;
const FAILED_LIMIT = 25;

@Injectable({ providedIn: 'root' })
export class AdminSearchAnalyticsService {
  private readonly api = inject(ApiService);

  // ── State ───────────────────────────────────────────────────────────────────
  private readonly _selectedDays  = signal<number>(DAY_RANGES[1].value); // 30
  private readonly _selectedFacet = signal<TrendFacet>('profession');

  private readonly _fallbackRate   = signal<FallbackRate | null>(null);
  private readonly _trends         = signal<FacetCount[]>([]);
  private readonly _popularTraits  = signal<FacetCount[]>([]);
  private readonly _failedSearches = signal<FailedSearch[]>([]);

  private readonly _loadingFallback = signal(false);
  private readonly _loadingTrends   = signal(false);
  private readonly _loadingTraits   = signal(false);
  private readonly _loadingFailed   = signal(false);

  private readonly _error = signal<string | null>(null);

  readonly selectedDays   = this._selectedDays.asReadonly();
  readonly selectedFacet  = this._selectedFacet.asReadonly();
  readonly fallbackRate   = this._fallbackRate.asReadonly();
  readonly trends         = this._trends.asReadonly();
  readonly popularTraits  = this._popularTraits.asReadonly();
  readonly failedSearches = this._failedSearches.asReadonly();
  readonly error          = this._error.asReadonly();

  readonly loadingFallback = this._loadingFallback.asReadonly();
  readonly loadingTrends   = this._loadingTrends.asReadonly();
  readonly loadingTraits   = this._loadingTraits.asReadonly();
  readonly loadingFailed   = this._loadingFailed.asReadonly();

  readonly loading = computed(() =>
    this._loadingFallback() || this._loadingTrends() ||
    this._loadingTraits() || this._loadingFailed());

  // ── Derived KPIs ────────────────────────────────────────────────────────────
  readonly totalSearches   = computed(() => this._fallbackRate()?.total ?? 0);
  readonly fallbackCount   = computed(() => this._fallbackRate()?.fallback ?? 0);
  readonly successCount    = computed(() => Math.max(0, this.totalSearches() - this.fallbackCount()));
  readonly fallbackRatio   = computed(() => this._fallbackRate()?.ratio ?? 0);
  readonly fallbackLevel   = computed(() => fallbackLevel(this.fallbackRatio()));
  readonly topTrend        = computed<FacetCount | null>(() => this._trends()[0] ?? null);
  readonly topTrait        = computed<FacetCount | null>(() => this._popularTraits()[0] ?? null);
  readonly maxTrendCount   = computed(() => Math.max(0, ...this._trends().map(t => t.count)));
  readonly maxTraitCount   = computed(() => Math.max(0, ...this._popularTraits().map(t => t.count)));

  /**
   * Responses keyed by endpoint + params. The dashboard re-reads the same
   * window whenever a tab is revisited, so without this every tab click would
   * re-hit the API for data that cannot have changed.
   */
  private readonly cache = new Map<string, unknown>();
  /** In-flight requests, so two callers racing the same key share one call. */
  private readonly inFlight = new Map<string, Promise<unknown>>();

  private async cached<T>(key: string, load: () => Promise<T>): Promise<T> {
    if (this.cache.has(key)) return this.cache.get(key) as T;

    const pending = this.inFlight.get(key) as Promise<T> | undefined;
    if (pending) return pending;

    const promise = load()
      .then(value => {
        this.cache.set(key, value);
        return value;
      })
      .finally(() => this.inFlight.delete(key));

    this.inFlight.set(key, promise);
    return promise;
  }

  /** Drops every cached response — used by the manual refresh. */
  clearCache(): void {
    this.cache.clear();
  }

  // ── Loaders ─────────────────────────────────────────────────────────────────

  async getFallbackRate(days = this._selectedDays()): Promise<void> {
    this._loadingFallback.set(true);
    try {
      const data = await this.cached(`fallback:${days}`, () =>
        firstValueFrom(this.api.adminGetFallbackRate(days)));
      this._fallbackRate.set(data);
    } catch {
      this._error.set('Unable to load AI fallback statistics.');
    } finally {
      this._loadingFallback.set(false);
    }
  }

  async getTrends(
    facet = this._selectedFacet(),
    limit = TREND_LIMIT,
    days = this._selectedDays(),
  ): Promise<void> {
    this._loadingTrends.set(true);
    try {
      const data = await this.cached(`trends:${facet}:${limit}:${days}`, () =>
        firstValueFrom(this.api.adminGetSearchTrends(facet, limit, days)));
      this._trends.set(data ?? []);
    } catch {
      this._error.set('Unable to load search trends.');
      this._trends.set([]);
    } finally {
      this._loadingTrends.set(false);
    }
  }

  async getPopularTraits(limit = TRAIT_LIMIT, days = this._selectedDays()): Promise<void> {
    this._loadingTraits.set(true);
    try {
      const data = await this.cached(`traits:${limit}:${days}`, () =>
        firstValueFrom(this.api.adminGetPopularTraits(limit, days)));
      this._popularTraits.set(data ?? []);
    } catch {
      this._error.set('Unable to load personality trait data.');
      this._popularTraits.set([]);
    } finally {
      this._loadingTraits.set(false);
    }
  }

  async getFailedSearches(limit = FAILED_LIMIT, days = this._selectedDays()): Promise<void> {
    this._loadingFailed.set(true);
    try {
      const data = await this.cached(`failed:${limit}:${days}`, () =>
        firstValueFrom(this.api.adminGetFailedSearches(limit, days)));
      this._failedSearches.set(data ?? []);
    } catch {
      this._error.set('Unable to load failed searches.');
      this._failedSearches.set([]);
    } finally {
      this._loadingFailed.set(false);
    }
  }

  // ── Orchestration ───────────────────────────────────────────────────────────

  /** Loads every widget for the current window, in parallel. */
  async loadAll(): Promise<void> {
    this._error.set(null);
    await Promise.allSettled([
      this.getFallbackRate(),
      this.getTrends(),
      this.getPopularTraits(),
      this.getFailedSearches(),
    ]);
  }

  async setDays(days: number): Promise<void> {
    if (days === this._selectedDays()) return;
    this._selectedDays.set(days);
    await this.loadAll();
  }

  async setFacet(facet: TrendFacet): Promise<void> {
    if (facet === this._selectedFacet()) return;
    this._selectedFacet.set(facet);
    await this.getTrends(facet);
  }

  async refresh(): Promise<void> {
    this.clearCache();
    await this.loadAll();
  }

  dismissError(): void { this._error.set(null); }
}
