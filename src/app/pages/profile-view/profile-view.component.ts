import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../shared/modules/material.module';
import { MatchService, ProfileService } from '../../services';
import { AuthService } from '../../services/auth.service';
import { InterestService } from '../../services/interest.service';
import { UserProfile, ProfilePhoto, MatchResult } from '../../models/user.model';
import {
  PhotoGalleryDialogComponent,
  PhotoDialogData,
} from './photo-gallery-dialog.component';

@Component({
  selector: 'app-profile-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, RouterLink, MaterialModule],
  templateUrl: './profile-view.component.html',
  styleUrl: './profile-view.component.scss',
})
export class ProfileViewComponent implements OnInit {
  private readonly route          = inject(ActivatedRoute);
  private readonly router         = inject(Router);
  private readonly profileSvc     = inject(ProfileService);
  private readonly authService    = inject(AuthService);
  private readonly interestService = inject(InterestService);
  private readonly matchSvc       = inject(MatchService);
  private readonly dialog         = inject(MatDialog);
  private readonly snackBar       = inject(MatSnackBar);

  // ── State ────────────────────────────────────────────────────────────────
  protected readonly profile       = signal<UserProfile | null>(null);
  protected readonly isLoading     = signal(true);
  protected readonly error         = signal<string | null>(null);
  protected readonly isShortlisted = signal(false);
  protected readonly interestSent  = signal(false);
  protected readonly matchedDetail = signal<MatchResult | undefined>(undefined);
  protected readonly activeTabIdx  = signal(0);

  // ── Derived ──────────────────────────────────────────────────────────────
  protected readonly primaryPhoto = computed<string>(() => {
    const photos = this.profile()?.photos ?? [];
    if (!photos.length) return '/avatar-default.svg';
    const primary = photos.find(ph => ph.isPrimary);
    return primary?.url ?? photos[0].url;
  });

  protected readonly hasVerifiedPhoto = computed(() =>
    this.profile()?.photos?.some(ph => ph.isVerified) ?? false,
  );

  protected readonly galleryPhotos = computed<ProfilePhoto[]>(() =>
    this.profile()?.photos ?? [],
  );

  /** Tabs are conditionally shown; horoscope tab only appears if data exists. */
  protected readonly showHoroscopeTab = computed(() =>
    !!this.profile()?.horoscope,
  );

  protected readonly isSelf = computed(() =>
    !!this.authService.user()?.id && this.authService.user()?.id === this.profile()?.user?.id,
  );

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('No profile ID provided.');
      this.isLoading.set(false);
      return;
    }
    void this.loadProfile(id);
  }

  private async loadProfile(id: string): Promise<void> {
    try {
      const profile = await this.profileSvc.getProfileById(id);
      this.profile.set(profile);
      const matchedDetail = await this.matchSvc.getMatchByUserId(profile.user?.id ?? '');
      this.matchedDetail.set(matchedDetail);

      await this.interestService.loadInterests();

      const interestSentDetail = this.interestService.getSentStatus(profile.user?.id ?? '');
      this.interestSent.set(interestSentDetail?.status === 'pending' || interestSentDetail?.status === 'accepted');
      // this.interestSent.set(matchedDetail?.status === 'interested' || matchedDetail?.status === 'connected');
      this.isShortlisted.set(matchedDetail?.status === 'shortlisted');
    } catch {
      this.error.set('Unable to load this profile. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  protected async sendInterest(): Promise<void> {
    const toUserId = this.profile()?.user?.id;
    if (!toUserId || this.interestSent()) return;

    const isSelf = this.isSelf();
    if (isSelf) {
      this.snackBar.open('You cannot send interest to your own profile.', 'OK', { duration: 3000 });
      return;
    }

    const profile = this.profile()!;
    const defaultMessage = this.interestService.buildDefaultMessage(profile);

    this.interestSent.set(true); // optimistic
    try {
      await this.interestService.sendInterest(toUserId, defaultMessage);
      this.snackBar.open(
        `Interest sent to ${profile.firstName}! 💌`,
        'Dismiss',
        { duration: 3500, panelClass: 'snack-success' },
      );
    } catch {
      this.interestSent.set(false); // roll back on failure
      this.snackBar.open('Could not send interest. Please try again.', 'OK', { duration: 3000 });
    }
  }

  protected async toggleShortlist(): Promise<void> {
    const userId = this.profile()?.user?.id;
    if (!userId) return;

    const isSelf = this.isSelf();
    if (isSelf) {
      this.snackBar.open('You cannot send shortlist request to your own profile.', 'OK', { duration: 3000 });
      return;
    }

    const adding = !this.isShortlisted();
    this.isShortlisted.set(adding); // optimistic
    try {
      if (adding) {
        await this.matchSvc.shortlistUser(userId);
      } else {
        await this.matchSvc.removeShortlistUser(userId);
      }
      this.snackBar.open(
        adding
          ? `${this.profile()?.firstName} added to shortlist ✨`
          : `Removed from shortlist`,
        'Dismiss',
        { duration: 2500, panelClass: adding ? 'snack-success' : '' },
      );
    } catch {
      this.isShortlisted.set(!adding); // roll back
      this.snackBar.open('Could not update shortlist. Please try again.', 'OK', { duration: 3000 });
    }
  }

  protected startChat(): void {
    const p = this.profile();
    
    const isSelf = this.isSelf();
    if (isSelf) {
      this.snackBar.open('You cannot chat with your own profile.', 'OK', { duration: 3000 });
      return;
    }

    if (p) void this.router.navigate(['/chat'], { queryParams: { profileId: p.userId } });
  }


  protected reportProfile(): void {
    this.snackBar.open('Report submitted. Our team will review it shortly.', 'OK', {
      duration: 4000,
    });
  }

  protected openPhotoDialog(photos: ProfilePhoto[], index: number): void {
    const data: PhotoDialogData = {
      photos,
      currentIndex: index,
      profileName: `${this.profile()?.firstName ?? ''} ${this.profile()?.lastName ?? ''}`.trim(),
    };
    this.dialog.open(PhotoGalleryDialogComponent, {
      data,
      maxWidth: '95vw',
      maxHeight: '96vh',
      panelClass: 'photo-dialog-panel',
      autoFocus: false,
    });
  }

  protected goBack(): void {
    // Try browser history first; fallback to /search
    if (window.history.length > 1) {
      window.history.back();
    } else {
      void this.router.navigate(['/search']);
    }
  }

  protected onImageError(event: Event): void {
    (event.target as HTMLImageElement).src = 'assets/avatar-default.svg';
  }

  /** Safe age display with ordinal indicator */
  protected formatAge(age: number): string {
    return `${age} yrs`;
  }

  /** Returns colour for the profile completeness ring */
  protected completenessColor(pct: number): string {
    if (pct >= 80) return '#4caf50';
    if (pct >= 50) return '#ff9800';
    return '#f44336';
  }
}
