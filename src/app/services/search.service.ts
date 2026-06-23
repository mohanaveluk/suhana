import { Injectable, signal, computed, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { UserProfile } from '../models/user.model';
import { ApiService } from './api.service';

export interface SearchFilters {
  query?: string;
  gender?: 'bride' | 'groom' | '';
  religions?: string[];
  locations?: string[];
  education?: string[];
  occupations?: string[];
}

@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly api = inject(ApiService);

  private readonly _filters = signal<SearchFilters>({});
  private readonly _results = signal<UserProfile[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _currentPage = signal(1);
  private readonly _totalPages = signal(1);
  private readonly _viewMode = signal<'grid' | 'list'>('grid');
  private debounceTimer: ReturnType<typeof setTimeout> | undefined;

  readonly filters = this._filters.asReadonly();
  readonly results = this._results.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly currentPage = this._currentPage.asReadonly();
  readonly totalPages = this._totalPages.asReadonly();
  readonly viewMode = this._viewMode.asReadonly();
  readonly currentViewMode = this._viewMode.asReadonly();
  readonly hasMore = computed(() => this._currentPage() < this._totalPages());
  readonly query = computed(() => this._filters().query ?? '');

  readonly availableReligions = ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Jain', 'Buddhist', 'Zoroastrian', 'Jewish', 'Other'];

  private readonly _availableCities       = signal<string[]>([]);
  private readonly _availableOccupations  = signal<string[]>([]);
  private readonly _availableEducation    = signal<string[]>([]);

  readonly availableCities      = this._availableCities.asReadonly();
  readonly availableOccupations = this._availableOccupations.asReadonly();
  readonly availableEducation   = this._availableEducation.asReadonly();

  async initialLoad(): Promise<void> {
    await Promise.all([
      this.loadLookupValues(),
      this.executeSearch(this._filters(), false),
    ]);
  }

  private async loadLookupValues(): Promise<void> {
    try {
      const res = await firstValueFrom(this.api.getLookupValues());
      if (res.cities?.length)         this._availableCities.set(res.cities.map(c => c.name));
      if (res.occupations?.length)    this._availableOccupations.set(res.occupations.map(o => o.name));
      if (res.educationLevels?.length) this._availableEducation.set(res.educationLevels.map(e => e.name));
    } catch {
      this._availableCities.set(['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad', 'Pune', 'Kolkata', 'Jaipur', 'Ahmedabad', 'Surat']);
      this._availableOccupations.set(['Software Engineer', 'Doctor', 'Lawyer', 'Business Analyst', 'Teacher', 'Designer', 'Entrepreneur', 'CA', 'Architect', 'AI Engineer']);
      this._availableEducation.set(['Bachelor', 'Master', 'PhD', 'MBA', 'Medical', 'Engineering', 'Diploma', 'B.Tech', 'M.Tech']);
    }
  }

  setQuery(q: string): void {
    this._filters.update(f => ({ ...f, query: q }));
    this.triggerDebounced();
  }

  updateFilter<K extends keyof SearchFilters>(key: K, value: SearchFilters[K]): void {
    this._filters.update(f => ({ ...f, [key]: value }));
    this.triggerDebounced();
  }

  clearFilters(): void {
    clearTimeout(this.debounceTimer);
    this._filters.set({});
    this.executeSearch({}, false);
  }

  setViewMode(mode: 'grid' | 'list'): void {
    this._viewMode.set(mode);
  }

  async loadMore(): Promise<void> {
    if (!this.hasMore() || this._isLoading()) return;
    await this.executeSearch(this._filters(), true);
  }

  private triggerDebounced(): void {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.executeSearch(this._filters(), false);
    }, 300);
  }

  private async executeSearch(filters: SearchFilters, append: boolean): Promise<void> {
    this._isLoading.set(true);
    // Reset pagination metadata on new search so "Load More" hides while loading
    if (!append) {
      this._currentPage.set(1);
      this._totalPages.set(1);
    }
    const page = append ? this._currentPage() + 1 : 1;
    try {
      const res = await firstValueFrom(this.api.getProfiles(this.toParams(filters, page)));
      const list = res.data ?? res;
      const profiles = Array.isArray(list) ? list : [];
      if (append) {
        this._results.update(existing => [...existing, ...profiles]);
      } else {
        this._results.set(profiles);
      }
      if (res.page != null) this._currentPage.set(res.page);
      if (res.totalPages != null) this._totalPages.set(res.totalPages);
    } catch {
      // keep existing results on error
    } finally {
      this._isLoading.set(false);
    }
  }

  private toParams(filters: SearchFilters, page: number): Record<string, string | number> {
    const params: Record<string, string | number> = { page };
    if (filters.query) params['query'] = filters.query;
    if (filters.gender) params['gender'] = filters.gender;
    if (filters.religions?.length) params['religion'] = filters.religions.join(',');
    if (filters.locations?.length) params['city'] = filters.locations.join(',');
    if (filters.education?.length) params['educationLevel'] = filters.education.join(',');
    if (filters.occupations?.length) params['occupation'] = filters.occupations.join(',');
    return params;
  }
}
