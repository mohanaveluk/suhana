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
import { GalleryService, MatchService, ProfileService } from '../../services';
import { AuthService } from '../../services/auth.service';
import { InterestService } from '../../services/interest.service';
import { UserProfile, ProfilePhoto, MatchResult } from '../../models/user.model';
import {
  PhotoGalleryDialogComponent,
  PhotoDialogData,
} from './photo-gallery-dialog.component';
import { firstValueFrom } from 'rxjs';
import { GalleryImage } from '../../models';
import { GalleryImageData } from '../../models/gallery.model';
import { ImageViewerDialogComponent } from '../../features/match-fixed/image-viewer-dialog/image-viewer-dialog.component';
import {
  ShareProfileComponent,
  ShareProfileData,
} from '../../shared/components/share-profile/share-profile.component';

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
  private readonly gallerySvc  = inject(GalleryService);
  private readonly dialog         = inject(MatDialog);
  private readonly snackBar       = inject(MatSnackBar);

  // ── State ────────────────────────────────────────────────────────────────
  protected readonly profile       = signal<UserProfile | null>(null);
  protected readonly isLoading     = signal(true);
  protected readonly error         = signal<string | null>(null);
  protected readonly isShortlisted = signal(false);
  protected readonly interestSent  = signal(false);
  protected readonly matchedDetail = signal<MatchResult | undefined>(undefined);
  protected readonly gallery        = signal<GalleryImage[]>([]);
  protected readonly activeTabIdx  = signal(0);
  protected readonly profileType = signal<'profile' | 'view'>(this.route.snapshot.data['profileType'] === 'view' ? 'view' : 'profile');

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

  protected readonly gallaryImages = computed<GalleryImage[]>(() => this.gallery() ?? []);

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
    const routePath = this.route.routeConfig?.path?.includes('/') ? this.route.routeConfig?.path?.split('/:')[0] : 'profile-view';
    if (!id) {
      this.error.set('No profile ID provided.');
      this.isLoading.set(false);
      return;
    }
    void this.loadProfile(id, routePath);
  }

  private async loadProfile(id: string, routePath: string = 'profile-view'): Promise<void> {
    try {
      const profile = await this.profileSvc.getProfileById(id, routePath);
      this.profile.set(profile);

      if (this.profileType() === 'profile') {
        const matchedDetail = await this.matchSvc.getMatchByUserId(profile.user?.id ?? '');
        this.matchedDetail.set(matchedDetail);

        await this.interestService.loadInterests();

        const interestSentDetail = this.interestService.getSentStatus(profile.user?.id ?? '');
        this.interestSent.set(interestSentDetail?.status === 'pending' || interestSentDetail?.status === 'accepted');
        // this.interestSent.set(matchedDetail?.status === 'interested' || matchedDetail?.status === 'connected');
        this.isShortlisted.set(matchedDetail?.status === 'shortlisted');

        //get gallery to check if any photos are verified

        const res = await firstValueFrom(this.gallerySvc.getProfileGallery(profile.userId));
        this.gallery.set(res?.data ?? []);
      }
      else {
        this.interestSent.set(false);
        this.isShortlisted.set(false);
        const res = await firstValueFrom(this.gallerySvc.getProfileGalleryView(profile.userId));
        this.gallery.set(res?.data ?? []);
      }

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

    if(this.profileType() === 'view') {
      this.snackBar.open('You cannot send interest from a view-only profile.', 'OK', { duration: 3000 });
      this.router.navigateByUrl('/login');
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


  protected async reportProfile(): Promise<void> {
    if(this.profileType() === 'view') {
      this.snackBar.open('You cannot report this profile from a view-only profile.', 'OK', { duration: 3000 });
      //this.router.navigateByUrl('/login');
      return;
    }    

    const res = await this.profileSvc.reportProfile(this.profile()?.user?.id ?? '', 'Inappropriate content');
    if (!res) {
      this.snackBar.open('Unable to report this profile. Please try again.', 'OK', { duration: 3000 });
      return;
    }

    this.snackBar.open( res || 'Report submitted. Our team will review it shortly.', 'OK', {
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

  protected openGalleryDialog(photos: GalleryImage[], index: number): void {
    const data: GalleryImageData = {
      Image: photos,
      currentIndex: index,
      profileName: `${this.profile()?.firstName ?? ''} ${this.profile()?.lastName ?? ''}`.trim(),
    };

    const gImages = photos.map(p => p.imageUrl).filter(Boolean) as string[];
    
    // this.dialog.open(PhotoGalleryDialogComponent, {
    //   data,
    //   maxWidth: '95vw',
    //   maxHeight: '96vh',
    //   panelClass: 'photo-dialog-panel',
    //   autoFocus: false,
    // });
    this.dialog.open(ImageViewerDialogComponent, {
      data: { urls: gImages, index },
      panelClass: 'image-viewer-panel',
      maxWidth: '100vw',
      maxHeight: '100vh',
    });
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
    
  protected openShareProfile(profileCode: string): void {
    const p = this.profile();
    this.dialog.open(ShareProfileComponent, {
      data: {
        profileCode,
        profileName: p ? `${p.firstName} ${p.lastName}`.trim() : undefined,
      } satisfies ShareProfileData,
      position:              { right: '0', top: '0' },
      height:                '100vh',
      maxHeight:             '100vh',
      width:                 '500px',
      maxWidth:              '100vw',
      panelClass:            'share-profile-drawer',
      disableClose:          false,
      autoFocus:             false,
      enterAnimationDuration: '0ms',
      exitAnimationDuration:  '0ms',
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

  protected horoscopeDocIcon(url: string): string {
    const ext = url.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
    if (ext === 'pdf') return 'picture_as_pdf';
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'].includes(ext)) return 'image';
    return 'description';
  }

  protected horoscopeDocBadge(url: string): string {
    return url.split('?')[0].split('.').pop()?.toUpperCase() ?? 'DOC';
  }

  protected horoscopeDocFileName(url: string): string {
    return decodeURIComponent(url.split('?')[0].split('/').pop() ?? 'document');
  }  


}
