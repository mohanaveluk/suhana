import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialModule } from '../../shared/modules/material.module';
import { AuthService, SearchService } from '../../services';
import { MatchService } from '../../services';
import { UserProfile } from '../../models/user.model';
import { CommonService } from '../../services/common.service';

@Component({
  selector: 'app-search',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, MaterialModule],
  templateUrl: './search.html',
  styleUrl: './search.scss',
})
export class SearchComponent implements OnInit {
  private readonly matchService   = inject(MatchService);
  private readonly snackBar       = inject(MatSnackBar);
  protected readonly searchService  = inject(SearchService);
  protected readonly commonService  = inject(CommonService);
  private readonly authService    = inject(AuthService);

  protected readonly filtersOpen = signal(false);
  private readonly shortlistedIds = signal<Set<string>>(new Set());

  // Per-dropdown inline search text
  protected readonly citySearch       = signal('');
  protected readonly occupationSearch = signal('');
  protected readonly educationSearch  = signal('');
  protected readonly religionSearch   = signal('');

  protected readonly filteredCities = computed(() => {
    const q = this.citySearch().toLowerCase().trim();
    const all = this.searchService.availableCities();
    return q ? all.filter(c => c.toLowerCase().includes(q)) : all;
  });
  protected readonly filteredOccupations = computed(() => {
    const q = this.occupationSearch().toLowerCase().trim();
    const all = this.searchService.availableOccupations();
    return q ? all.filter(o => o.toLowerCase().includes(q)) : all;
  });
  protected readonly filteredEducation = computed(() => {
    const q = this.educationSearch().toLowerCase().trim();
    const all = this.searchService.availableEducation();
    return q ? all.filter(e => e.toLowerCase().includes(q)) : all;
  });
  protected readonly filteredReligions = computed(() => {
    const q = this.religionSearch().toLowerCase().trim();
    const all = this.searchService.availableReligions;
    return q ? all.filter(r => r.toLowerCase().includes(q)) : all;
  });

  isSelf(profile: UserProfile | null | undefined): boolean {
    return !!this.authService.user()?.id &&
      this.authService.user()?.id === profile?.user?.id;
  }

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.searchService.initialLoad(),
      this.matchService.loadMatchesFromApi(),
    ]);

    const alreadyShortlisted = this.matchService.matches()
      .filter(m => m.status === 'shortlisted')
      .map(m => m.matchedUserId)
      .filter((id): id is string => !!id);

    if (alreadyShortlisted.length) {
      this.shortlistedIds.set(new Set(alreadyShortlisted));
    }
  }

  toggleFilters(): void {
    this.filtersOpen.update(v => !v);
  }

  onGenderChange(value: string): void {
    this.searchService.updateFilter('gender', (value === 'all' ? '' : value) as 'bride' | 'groom' | '');
  }

  onSearchInput(event: Event): void {
    this.searchService.setQuery((event.target as HTMLInputElement).value);
  }

  navigateToProfile(profileId: string): void {
    window.location.href = `/profile-view/${profileId}`;
  }

  isShortlisted(userId: string): boolean {
    return this.shortlistedIds().has(userId);
  }

  async loadMore(): Promise<void> {
    await this.searchService.loadMore();
  }

  async toggleShortlist(profile: UserProfile): Promise<void> {
    const userId = profile.user?.id;
    if (!userId) return;

    const adding = !this.isShortlisted(userId);

    this.shortlistedIds.update(set => {
      const next = new Set(set);
      adding ? next.add(userId) : next.delete(userId);
      return next;
    });

    try {
      if (adding) {
        await this.matchService.shortlistUser(userId);
        this.snackBar.open(`${profile.firstName} added to shortlist ✨`, 'Dismiss', { duration: 2500 });
      } else {
        await this.matchService.removeShortlistUser(userId);
        this.snackBar.open(`Removed from shortlist`, 'Dismiss', { duration: 2500 });
      }
    } catch {
      this.shortlistedIds.update(set => {
        const next = new Set(set);
        adding ? next.delete(userId) : next.add(userId);
        return next;
      });
      this.snackBar.open('Could not update shortlist. Please try again.', 'OK', { duration: 3000 });
    }
  }
}
