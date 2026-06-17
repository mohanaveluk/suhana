import { Injectable, signal, computed, inject } from '@angular/core';
import { ProfileService } from './profile.service';
import { ApiService } from './api.service';
import { UserProfile, MatchPreferences } from '../models/user.model';
import { CommonService } from './common.service';

@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly profileService = inject(ProfileService);
  private readonly api = inject(ApiService);
  

  private readonly searchQuery = signal('');
  private readonly activeFilters = signal<Partial<MatchPreferences>>({});
  private readonly viewMode = signal<'grid' | 'list' | 'swipe'>('grid');
  private readonly apiResults = signal<UserProfile[]>([]);
  private readonly useApiResults = signal(false);

  readonly query = this.searchQuery.asReadonly();
  readonly filters = this.activeFilters.asReadonly();
  readonly currentViewMode = this.viewMode.asReadonly();
  readonly isSearchActive = this.useApiResults.asReadonly();

  readonly searchResults = computed(() => {
    if (this.useApiResults() && this.apiResults().length > 0) {
      return this.apiResults();
    }

    const q = this.searchQuery().toLowerCase();
    const filters = this.activeFilters();
    let profiles = this.profileService.getProfiles(filters);

    if (q) {
      profiles = profiles.filter(p =>
        p.firstName.toLowerCase().includes(q) ||
        p.lastName.toLowerCase().includes(q) ||
        p.location.city.toLowerCase().includes(q) ||
        p.occupation.title.toLowerCase().includes(q) ||
        p.religion.toLowerCase().includes(q) ||
        p.education.level.toLowerCase().includes(q)
      );
    }
    return profiles;
  });

  setSearchQuery(query: string): void {
    this.searchQuery.set(query);
    this.searchViaApi(query);
  }

  setFilters(filters: Partial<MatchPreferences>): void {
    this.activeFilters.set(filters);
  }

  updateFilter<K extends keyof MatchPreferences>(key: K, value: MatchPreferences[K]): void {
    this.activeFilters.update(f => ({ ...f, [key]: value }));
  }

  clearFilters(): void {
    this.activeFilters.set({});
    this.searchQuery.set('');
    this.useApiResults.set(false);
    this.apiResults.set([]);
  }

  setViewMode(mode: 'grid' | 'list' | 'swipe'): void {
    this.viewMode.set(mode);
  }

  readonly availableReligions = ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Jain', 'Buddhist'];
  readonly availableCities = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad', 'Pune', 'Kolkata', 'Jaipur'];
  readonly availableEducation = ["Bachelor", "Master", 'PhD', 'MBA', 'Medical', 'Engineering'];
  readonly availableOccupations = ['Software Engineer', 'Doctor', 'Lawyer', 'Business Analyst', 'Teacher', 'Designer', 'Entrepreneur', 'CA'];

  private searchViaApi(query: string): void {
    if (!query) {
      this.useApiResults.set(false);
      this.apiResults.set([]);
      return;
    }
    this.api.getProfiles({ query }).subscribe({
      next: (res) => {
        const list = res.data ?? res;
        if (Array.isArray(list) && list.length > 0) {
          this.apiResults.set(list);
          this.useApiResults.set(true);
        }
      },
      error: () => {
        this.useApiResults.set(false);
      },
    });
  }
}
