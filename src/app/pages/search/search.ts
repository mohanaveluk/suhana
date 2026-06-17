import { Component, ChangeDetectionStrategy, inject, signal, OnInit, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialModule } from '../../shared/modules/material.module';
import { AuthService, SearchService } from '../../services';
import { ProfileService } from '../../services';
import { MatchService } from '../../services';
import { UserProfile } from '../../models/user.model';
import { CommonService } from '../../services/common.service';

@Component({
  selector: 'app-search',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, RouterLink, MaterialModule,
  ],
  templateUrl: './search.html',
  styleUrl: './search.scss',
})
export class SearchComponent implements OnInit {
  protected readonly profileService = inject(ProfileService);
  private readonly matchService   = inject(MatchService);
  private readonly snackBar       = inject(MatSnackBar);
  protected readonly searchService  = inject(SearchService);
  protected readonly commonService  = inject(CommonService);
  private readonly authService    = inject(AuthService);

  protected readonly genderFilter = signal<'bride' | 'groom' | 'all'>('all');

  /** Tracks shortlisted user IDs within this page session. */
  private readonly shortlistedIds = signal<Set<string>>(new Set());

  protected readonly filteredResults = () => {
    const results = this.searchService.searchResults();
    const gender = this.genderFilter();
    if (gender === 'all') return results;
    return results.filter((p: UserProfile) => p.gender === gender);
  };

  isSelf(profile: UserProfile | null | undefined): boolean {
    return !!this.authService.user()?.id &&
      this.authService.user()?.id === profile?.user?.id;
  }

  protected readonly isSelf1 = (profile: UserProfile | null) => computed(() =>
    !!this.authService.user()?.id && this.authService.user()?.id === profile?.user?.id,
  );

  async ngOnInit(): Promise<void> {
    await this.profileService.loadProfiles();
    await this.matchService.loadMatchesFromApi();

    // Pre-populate shortlisted state from existing match records
    const alreadyShortlisted = this.matchService.matches()
      .filter(m => m.status === 'shortlisted')
      .map(m => m.matchedUserId)
      .filter((id): id is string => !!id);

    if (alreadyShortlisted.length) {
      this.shortlistedIds.set(new Set(alreadyShortlisted));
    }
  }

  async loadMoreProfiles(): Promise<void> {
    await this.profileService.loadMoreProfiles();
  }

  setGender(gender: 'bride' | 'groom' | 'all'): void {
    this.genderFilter.set(gender);
  }

  onSearchInput(event: Event): void {
    this.searchService.setSearchQuery((event.target as HTMLInputElement).value);
  }

  navigateToProfile(profileId: string): void {
    window.location.href = `/profile-view/${profileId}`;
  }

  isShortlisted(userId: string): boolean {
    return this.shortlistedIds().has(userId);
  }

  async toggleShortlist(profile: UserProfile): Promise<void> {
    const userId = profile.user?.id;
    if (!userId) return;

    const adding = !this.isShortlisted(userId);

    // Optimistic update
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
      // Roll back on failure
      this.shortlistedIds.update(set => {
        const next = new Set(set);
        adding ? next.delete(userId) : next.add(userId);
        return next;
      });
      this.snackBar.open('Could not update shortlist. Please try again.', 'OK', { duration: 3000 });
    }
  }
}
