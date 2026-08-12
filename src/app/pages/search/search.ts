import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LowerCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MaterialModule } from '../../shared/modules/material.module';
import { AuthService, SearchService } from '../../services';
import { SearchFilters } from '../../services/search.service';
import { MatchService } from '../../services';
import { InterestService } from '../../services/interest.service';
import { UserProfile } from '../../models/user.model';
import { CommonService } from '../../services/common.service';
import { ImageViewerDialogComponent } from '../../features/match-fixed/image-viewer-dialog/image-viewer-dialog.component';
import {
  ShareProfileComponent,
  ShareProfileData,
} from '../../shared/components/share-profile/share-profile.component';
import { AiSearchService } from '../../services/ai-search.service';
import {
  IntentChip, SearchIntent, SearchMode, SEARCH_MODE_LABELS,
} from '../../models/ai-search.model';
import { AiSearchBoxComponent } from './components/ai-search-box/ai-search-box.component';
import { AiIntentChipsComponent } from './components/ai-intent-chips/ai-intent-chips.component';
import { AiSuggestionsPanelComponent } from './components/ai-suggestions-panel/ai-suggestions-panel.component';
import { SearchWithinResultsComponent } from './components/search-within-results/search-within-results.component';

@Component({
  selector: 'app-search',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, LowerCasePipe, RouterLink, MaterialModule,
    AiSearchBoxComponent, AiIntentChipsComponent,
    AiSuggestionsPanelComponent, SearchWithinResultsComponent,
  ],
  templateUrl: './search.html',
  styleUrl: './search.scss',
})
export class SearchComponent implements OnInit {
  private readonly matchService    = inject(MatchService);
  private readonly interestService = inject(InterestService);
  private readonly snackBar        = inject(MatSnackBar);
  private readonly dialog          = inject(MatDialog);
  protected readonly searchService   = inject(SearchService);
  protected readonly commonService   = inject(CommonService);
  private readonly authService     = inject(AuthService);

  protected readonly filtersOpen    = signal(false);
  private readonly shortlistedIds  = signal<Set<string>>(new Set());
  protected readonly interestSentIds = signal<Set<string>>(new Set());

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

  // ── AI search ───────────────────────────────────────────────────────────────
  protected readonly ai = inject(AiSearchService);
  protected readonly SearchMode = SearchMode;
  protected readonly modeLabels = SEARCH_MODE_LABELS;

  /** Client-side narrowing of whatever is already on screen. */
  protected readonly searchWithin = signal('');

  /** AI results take over the grid once an AI search has run. */
  protected readonly activeProfiles = computed<UserProfile[]>(() =>
    this.ai.aiActive() ? this.ai.profiles() : this.searchService.results());

  protected readonly visibleProfiles = computed<UserProfile[]>(() => {
    const q = this.searchWithin().trim().toLowerCase();
    const list = this.activeProfiles();
    if (!q) return list;
    return list.filter(p =>
      [
        p.firstName, p.lastName, p.location?.city,
        p.occupation?.title, p.religion, p.education?.level,
      ].some(field => (field ?? '').toLowerCase().includes(q)));
  });

  protected readonly isBusy = computed(() =>
    this.ai.isSearching() || this.searchService.isLoading());

  protected readonly hasMore = computed(() =>
    this.ai.aiActive() ? this.ai.hasMore() : this.searchService.hasMore());

  protected readonly resultCount = computed(() =>
    this.ai.aiActive() ? this.ai.totalResults() : this.searchService.results().length);

  /** Any traditional filter beyond the default gender counts as "in use". */
  private traditionalIsActive(): boolean {
    const f = this.searchService.filters();
    return !!(f.query || f.religions?.length || f.locations?.length ||
              f.education?.length || f.occupations?.length);
  }

  protected async runAiSearch(query: string): Promise<void> {
    await this.ai.search(query);
    const intent = this.ai.searchIntent();
    if (intent) this.applyIntentToFilters(intent);
    this.ai.setTraditionalActive(this.traditionalIsActive());
  }

  protected async onChipRemoved(chip: IntentChip): Promise<void> {
    // Clear the mirrored filter first, or the sidebar would still show the
    // facet the member just dismissed.
    this.clearFilterForChip(chip);
    await this.ai.removeChip(chip);
    const intent = this.ai.searchIntent();
    if (intent) this.applyIntentToFilters(intent);
    this.ai.setTraditionalActive(this.traditionalIsActive());
  }

  /** Only clears the one facet the chip owns — other filters are left alone. */
  private clearFilterForChip(chip: IntentChip): void {
    switch (chip.key) {
      case 'profession': this.searchService.setDefaultFilters({ occupations: [] }); break;
      case 'education':  this.searchService.setDefaultFilters({ education: [] });   break;
      case 'religion':   this.searchService.setDefaultFilters({ religions: [] });   break;
      case 'city':
      case 'state':
      case 'country':    this.searchService.setDefaultFilters({ locations: [] });   break;
      case 'gender':     this.searchService.setDefaultFilters({ gender: '' });      break;
      default: break;
    }
  }

  protected async onFollowUpSelected(text: string): Promise<void> {
    await this.runAiSearch(text);
  }

  protected onAiCleared(): void {
    this.searchWithin.set('');
    this.ai.setTraditionalActive(this.traditionalIsActive());
  }

  /**
   * Every traditional filter edit goes through here so the existing behaviour is
   * untouched, and an active AI search is re-run with the edited facets folded in.
   */
  protected onFilterChange<K extends keyof SearchFilters>(key: K, value: SearchFilters[K]): void {
    this.searchService.updateFilter(key, value);
    this.ai.setTraditionalActive(this.traditionalIsActive());

    if (!this.ai.aiActive()) return;
    const merged = this.mergeFiltersIntoIntent(this.ai.searchIntent() ?? {});
    void this.ai.applyIntent(merged);
  }

  /**
   * Mirrors the extracted intent into the traditional filters so the member can
   * see and adjust what the AI understood.
   *
   * Uses setDefaultFilters rather than updateFilter on purpose: updateFilter
   * would kick off a debounced traditional search and immediately overwrite the
   * AI results we just rendered.
   */
  private applyIntentToFilters(intent: SearchIntent): void {
    const patch: Partial<SearchFilters> = {};
    if (intent.gender === 'bride' || intent.gender === 'groom') patch.gender = intent.gender;
    if (intent.religion)  patch.religions   = [intent.religion];
    if (intent.education) patch.education   = [intent.education];
    if (intent.profession) patch.occupations = [intent.profession];

    const place = intent.city ?? intent.state ?? intent.country;
    if (place) patch.locations = [place];

    if (Object.keys(patch).length) this.searchService.setDefaultFilters(patch);
  }

  /**
   * Folds the traditional filters back into the intent. The filters are
   * multi-select while the intent holds one value per facet, so the first
   * selection wins.
   */
  private mergeFiltersIntoIntent(intent: SearchIntent): SearchIntent {
    const f = this.searchService.filters();
    return {
      ...intent,
      gender:     f.gender || intent.gender,
      religion:   f.religions?.[0]   ?? intent.religion,
      education:  f.education?.[0]   ?? intent.education,
      profession: f.occupations?.[0] ?? intent.profession,
      city:       f.locations?.[0]   ?? intent.city,
    };
  }

  isSelf(profile: UserProfile | null | undefined): boolean {
    return !!this.authService.user()?.id &&
      this.authService.user()?.id === profile?.user?.id;
  }

  async ngOnInit(): Promise<void> {
    
    const userGender = this.authService.user()?.gender;
    const defaultGender: 'bride' | 'groom' | '' =
      userGender === 'groom' ? 'bride' :
      userGender === 'bride' ? 'groom' : '';
    if (defaultGender) {
      this.searchService.setDefaultFilters({ gender: defaultGender });
    }

    await Promise.all([
      this.searchService.initialLoad(),
      this.matchService.loadMatchesFromApi(),
      this.interestService.loadInterests(),
    ]);

    const alreadyShortlisted = this.matchService.matches()
      .filter(m => m.status === 'shortlisted')
      .map(m => m.matchedUserId)
      .filter((id): id is string => !!id);

    if (alreadyShortlisted.length) {
      this.shortlistedIds.set(new Set(alreadyShortlisted));
    }

    const alreadySent = this.interestService.sent()
      .filter(i => i.status === 'pending' || i.status === 'accepted')
      .map(i => i.toUserId)
      .filter((id): id is string => !!id);

    if (alreadySent.length) {
      this.interestSentIds.set(new Set(alreadySent));
    }
  }

  async sendInterestFromCard(profile: UserProfile): Promise<void> {
    const userId = profile.user?.id;
    if (!userId || this.isSelf(profile)) return;
    if (this.interestSentIds().has(userId)) return;

    this.interestSentIds.update(s => new Set([...s, userId])); // optimistic
    try {
      const message = this.interestService.buildDefaultMessage(profile);
      await this.interestService.sendInterest(userId, message);
      this.snackBar.open(`Interest sent to ${profile.firstName}! 💌`, 'Dismiss', {
        duration: 3000,
        panelClass: ['af-snack', 'af-snack--success'],
      });
    } catch {
      this.interestSentIds.update(s => { const n = new Set(s); n.delete(userId); return n; });
      this.snackBar.open('Could not send interest. Please try again.', 'OK', { duration: 3000 });
    }
  }

  toggleFilters(): void {
    this.filtersOpen.update(v => !v);
  }

  onGenderChange(value: string): void {
    this.onFilterChange('gender', (value === 'all' ? '' : value) as 'bride' | 'groom' | '');
  }

  onSearchInput(event: Event): void {
    this.searchService.setQuery((event.target as HTMLInputElement).value);
    this.ai.setTraditionalActive(this.traditionalIsActive());
  }

  navigateToProfile(profileId: string): void {
    window.location.href = `/profile-view/${profileId}`;
  }

  openImageViewer(profile: UserProfile, event: MouseEvent): void {
    event.stopPropagation();
    const urls = (profile.photos ?? [])
      .filter(p => !!p.url)
      .sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0))
      .map(p => p.variants?.originalUrl ?? p.variants?.displayUrl ?? p.variants?.thumbnailUrl ?? p.url as string);
    if (!urls.length) return;
    this.dialog.open(ImageViewerDialogComponent, {
      data:       { urls, index: 0 },
      panelClass: 'image-viewer-panel',
      maxWidth:   '100vw',
      maxHeight:  '100vh',
    });
  }

  shareProfile(profile: UserProfile, event: MouseEvent): void {
    event.stopPropagation();
    if (!profile.profileCode) return;
    this.dialog.open(ShareProfileComponent, {
      data: {
        profileCode: profile.profileCode,
        profileName: `${profile.firstName} ${profile.lastName}`.trim(),
      } satisfies ShareProfileData,
      position:               { right: '0', top: '0' },
      height:                 '100vh',
      maxHeight:              '100vh',
      width:                  '500px',
      maxWidth:               '100vw',
      panelClass:             'share-profile-drawer',
      disableClose:           false,
      autoFocus:              false,
      enterAnimationDuration: '0ms',
      exitAnimationDuration:  '0ms',
    });
  }

  isShortlisted(userId: string): boolean {
    return this.shortlistedIds().has(userId);
  }

  async loadMore(): Promise<void> {
    if (this.ai.aiActive()) {
      await this.ai.loadMore();
      return;
    }
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
