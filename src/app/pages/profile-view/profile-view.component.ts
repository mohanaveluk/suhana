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
import { ProfileService } from '../../services';
import { UserProfile, ProfilePhoto } from '../../models/user.model';
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
  private readonly route       = inject(ActivatedRoute);
  private readonly router      = inject(Router);
  private readonly profileSvc  = inject(ProfileService);
  private readonly dialog      = inject(MatDialog);
  private readonly snackBar    = inject(MatSnackBar);

  // ── State ────────────────────────────────────────────────────────────────
  protected readonly profile       = signal<UserProfile | null>(null);
  protected readonly isLoading     = signal(true);
  protected readonly error         = signal<string | null>(null);
  protected readonly isShortlisted = signal(false);
  protected readonly interestSent  = signal(false);
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
    } catch {
      this.error.set('Unable to load this profile. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  protected sendInterest(): void {
    if (this.interestSent()) return;
    this.interestSent.set(true);
    this.snackBar.open(
      `Interest sent to ${this.profile()?.firstName ?? 'profile'}! 💌`,
      'Dismiss',
      { duration: 3500, panelClass: 'snack-success' },
    );
  }

  protected toggleShortlist(): void {
    const next = !this.isShortlisted();
    this.isShortlisted.set(next);
    this.snackBar.open(
      next
        ? `${this.profile()?.firstName} added to shortlist ✨`
        : `Removed from shortlist`,
      'Dismiss',
      { duration: 2500, panelClass: next ? 'snack-success' : '' },
    );
  }

  protected startChat(): void {
    const p = this.profile();
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
