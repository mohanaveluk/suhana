import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, switchMap } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';

import { ApiService } from './api.service';
import { UserProfile } from '../models/user.model';
import {
  AiSearchResponse, IntentChip, SearchIntent, SearchMode, SuggestionItem,
  buildQueryFromIntent, confidenceLevel, intentToChips, removeIntentChip, toUserProfile,
} from '../models/ai-search.model';

/** Below this, typing is too vague to suggest against — and we skip the call. */
export const MIN_SUGGEST_CHARS = 3;
const SUGGEST_DEBOUNCE_MS = 400;
const DEFAULT_LIMIT = 20;

@Injectable({ providedIn: 'root' })
export class AiSearchService {
  private readonly api = inject(ApiService);

  // ── State ───────────────────────────────────────────────────────────────────
  private readonly _query        = signal('');
  private readonly _suggestions  = signal<SuggestionItem[]>([]);
  private readonly _result       = signal<AiSearchResponse | null>(null);
  private readonly _intent       = signal<SearchIntent | null>(null);
  private readonly _profiles     = signal<UserProfile[]>([]);
  private readonly _isSearching  = signal(false);
  private readonly _isSuggesting = signal(false);
  private readonly _searchError  = signal<string | null>(null);
  private readonly _suggestError = signal<string | null>(null);
  /** True once an AI search has run and has not been cleared. */
  private readonly _aiActive     = signal(false);
  private readonly _traditionalActive = signal(false);

  readonly query        = this._query.asReadonly();
  readonly suggestions  = this._suggestions.asReadonly();
  readonly result       = this._result.asReadonly();
  readonly searchIntent = this._intent.asReadonly();
  readonly profiles     = this._profiles.asReadonly();
  readonly isSearching  = this._isSearching.asReadonly();
  readonly isSuggesting = this._isSuggesting.asReadonly();
  readonly searchError  = this._searchError.asReadonly();
  readonly suggestError = this._suggestError.asReadonly();
  readonly aiActive     = this._aiActive.asReadonly();

  readonly confidence      = computed(() => this._result()?.confidence ?? 0);
  readonly confidenceLevel = computed(() => confidenceLevel(this.confidence()));
  readonly searchTimeMs    = computed(() => this._result()?.searchTimeMs ?? 0);
  readonly totalResults    = computed(() => this._result()?.totalResults ?? 0);
  readonly intentSource    = computed(() => this._result()?.intentSource ?? null);
  readonly chips           = computed(() => intentToChips(this._intent()));
  readonly followUps       = computed(() => this._result()?.suggestions ?? []);
  readonly corrections     = computed(() => Object.entries(this._result()?.corrections ?? {}));
  readonly hasMore = computed(() => {
    const r = this._result();
    return !!r && r.page < r.totalPages;
  });

  readonly searchMode = computed<SearchMode>(() => {
    const ai = this._aiActive();
    const trad = this._traditionalActive();
    if (ai && trad) return SearchMode.HYBRID;
    if (ai) return SearchMode.AI;
    return SearchMode.TRADITIONAL;
  });

  // ── Typeahead pipeline ──────────────────────────────────────────────────────
  private readonly suggestInput$ = new Subject<string>();

  constructor() {
    this.suggestInput$
      .pipe(
        map(q => q.trim()),
        debounceTime(SUGGEST_DEBOUNCE_MS),
        distinctUntilChanged(),
        switchMap(q => {
          if (q.length < MIN_SUGGEST_CHARS) {
            this._isSuggesting.set(false);
            return of<SuggestionItem[]>([]);
          }
          this._isSuggesting.set(true);
          this._suggestError.set(null);
          return this.api.getAiSearchSuggestions(q, 8).pipe(
            map(res => res?.data ?? []),
            catchError(() => {
              this._suggestError.set('Unable to fetch AI suggestions.');
              return of<SuggestionItem[]>([]);
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe(items => {
        this._suggestions.set(items);
        this._isSuggesting.set(false);
      });
  }

  // ── Suggestions ─────────────────────────────────────────────────────────────

  /** Feeds the typeahead. Safe to call on every keystroke — it debounces. */
  setQuery(q: string): void {
    this._query.set(q);
    this.suggestInput$.next(q);
  }

  getSuggestions(query: string, limit = 8): Promise<SuggestionItem[]> {
    return firstValueFrom(this.api.getAiSearchSuggestions(query, limit))
      .then(r => r?.data ?? [])
      .catch(() => {
        this._suggestError.set('Unable to fetch AI suggestions.');
        return [];
      });
  }

  clearSuggestions(): void {
    this._suggestions.set([]);
  }

  // ── Search ──────────────────────────────────────────────────────────────────

  /**
   * Runs an AI search. Concurrent calls are dropped rather than queued, so a
   * double-click or a chip removal mid-flight cannot interleave two responses.
   */
  async search(query: string, page = 1, limit = DEFAULT_LIMIT, refreshIntent = false): Promise<void> {
    const q = query.trim();
    if (!q || this._isSearching()) return;

    this._isSearching.set(true);
    this._searchError.set(null);
    this._query.set(q);

    try {
      const res = await firstValueFrom(this.api.aiSearch({ query: q, page, limit, refreshIntent }));
      const mapped = (res.profiles ?? []).map(toUserProfile);

      this._result.set(res);
      this._intent.set(res.searchIntent ?? {});
      this._profiles.set(page > 1 ? [...this._profiles(), ...mapped] : mapped);
      this._aiActive.set(true);
      this._suggestions.set([]);
    } catch {
      this._searchError.set('Unable to process AI search. Please try again.');
    } finally {
      this._isSearching.set(false);
    }
  }

  async loadMore(): Promise<void> {
    const r = this._result();
    if (!r || !this.hasMore() || this._isSearching()) return;
    await this.search(this._query(), r.page + 1, r.limit);
  }

  /** Drops one extracted facet and re-runs with the remaining intent. */
  async removeChip(chip: IntentChip): Promise<void> {
    const current = this._intent();
    if (!current) return;

    const next = removeIntentChip(current, chip);
    this._intent.set(next);

    const rebuilt = buildQueryFromIntent(next);
    if (!rebuilt) {
      this.clear();
      return;
    }
    await this.search(rebuilt);
  }

  /** Replaces the intent wholesale — used when traditional filters change. */
  async applyIntent(next: SearchIntent): Promise<void> {
    this._intent.set(next);
    const rebuilt = buildQueryFromIntent(next);
    if (!rebuilt) {
      this.clear();
      return;
    }
    await this.search(rebuilt);
  }

  /** Runs one of the API's follow-up suggestions verbatim. */
  async runSuggestion(text: string): Promise<void> {
    this._query.set(text);
    await this.search(text);
  }

  setTraditionalActive(active: boolean): void {
    this._traditionalActive.set(active);
  }

  dismissSearchError(): void { this._searchError.set(null); }
  dismissSuggestError(): void { this._suggestError.set(null); }

  /** Returns the page to traditional-only search. */
  clear(): void {
    this._query.set('');
    this._suggestions.set([]);
    this._result.set(null);
    this._intent.set(null);
    this._profiles.set([]);
    this._searchError.set(null);
    this._suggestError.set(null);
    this._aiActive.set(false);
  }
}
