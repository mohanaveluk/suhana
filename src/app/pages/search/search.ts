import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MaterialModule } from '../../shared/modules/material.module';
import { AuthService, SearchService } from '../../services';
import { MatchService } from '../../services';
import { InterestService } from '../../services/interest.service';
import { UserProfile } from '../../models/user.model';
import { CommonService } from '../../services/common.service';
import { ImageViewerDialogComponent } from '../../features/match-fixed/image-viewer-dialog/image-viewer-dialog.component';
import {
  ShareProfileComponent,
  ShareProfileData,
} from '../../shared/components/share-profile/share-profile.component';

@Component({
  selector: 'app-search',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, MaterialModule],
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
    this.searchService.updateFilter('gender', (value === 'all' ? '' : value) as 'bride' | 'groom' | '');
  }

  onSearchInput(event: Event): void {
    this.searchService.setQuery((event.target as HTMLInputElement).value);
  }

  navigateToProfile(profileId: string): void {
    window.location.href = `/profile-view/${profileId}`;
  }

  openImageViewer(profile: UserProfile, event: MouseEvent): void {
    event.stopPropagation();
    const urls = (profile.photos ?? [])
      .filter(p => !!p.url)
      .map(p => p.url as string);
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
