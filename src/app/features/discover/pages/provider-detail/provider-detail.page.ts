import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { MaterialModule } from '../../../../shared/modules/material.module';
import { ImageViewerDialogComponent } from '../../../match-fixed/image-viewer-dialog/image-viewer-dialog.component';
import { DiscoverReviewList, ProviderDetail, ProviderLocation } from '../../models/discover.model';
import { DiscoverService } from '../../services/discover.service';
import {
  AVATAR_FALLBACK, MODE_LABELS, WEEK_DAYS, apiErrorMessage, directionsUrl, formatDistance, formatMoney, languageLabel,
  placeLabel,
} from '../../utils/discover.utils';
import { CategoryConfig, attributeHighlights, configBySegment, specialtyLabel } from '../../utils/category-config';
import { RatingStarsComponent } from '../../components/rating-stars/rating-stars.component';
import { ContactDialogComponent } from '../../components/contact-dialog/contact-dialog.component';
import { ReviewDialogComponent } from '../../components/review-dialog/review-dialog.component';

/** Listing detail for any category: /discover/:category/:id. */
@Component({
  selector: 'app-discover-provider-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialModule, RouterLink, DatePipe, RatingStarsComponent],
  templateUrl: './provider-detail.page.html',
  styleUrl: './provider-detail.page.scss',
})
export class ProviderDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly discover = inject(DiscoverService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly cfg = signal<CategoryConfig | null>(null);
  protected readonly provider = signal<ProviderDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly notFound = signal(false);
  protected readonly favBusy = signal(false);
  protected readonly contactBusy = signal(false);
  protected readonly popping = signal(false);

  protected readonly reviews = signal<DiscoverReviewList | null>(null);
  protected readonly reviewsLoading = signal(false);
  protected readonly reviewsError = signal<string | null>(null);

  protected readonly modeLabels = MODE_LABELS;
  protected readonly langLabel = languageLabel;
  protected readonly money = formatMoney;
  protected readonly placeLabel = placeLabel;
  protected readonly directionsUrl = directionsUrl;

  private id = '';
  private imgFailed = false;

  protected readonly detail = computed(() => this.provider()?.serviceDetail ?? null);
  protected readonly photo = computed(() => this.provider()?.photoUrl || this.cfg()?.image || AVATAR_FALLBACK);
  protected readonly distance = computed(() => {
    const d = this.provider()?.distance;
    return d ? formatDistance(d.value, d.unit) : null;
  });
  protected readonly specialties = computed(() =>
    (this.detail()?.specialties ?? []).map((c) => specialtyLabel(this.cfg() ?? undefined, c)));
  /** All typed attributes as "at a glance" facts (not just the card ones). */
  protected readonly glance = computed(() => attributeHighlights(this.cfg() ?? undefined, this.detail(), false));
  protected readonly hours = computed(() => {
    const h = this.detail()?.businessHours ?? [];
    return WEEK_DAYS.map((d) => {
      const slots = h.filter((x) => x.day === d.key).map((x) => `${x.open}–${x.close}`);
      return { day: d.label, text: slots.length ? slots.join(', ') : 'Closed' };
    });
  });
  protected readonly hasHours = computed(() => (this.detail()?.businessHours ?? []).length > 0);
  protected readonly hasContact = computed(() => {
    const c = this.provider()?.contactChannels;
    return !!c && (c.phone || c.email || c.website);
  });
  protected readonly showModes = computed(() => this.cfg()?.showModes ?? true);

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((pm) => {
      this.cfg.set(configBySegment(pm.get('category')) ?? null);
      this.id = pm.get('id') ?? '';
      this.imgFailed = false;
      void this.load();
    });
  }

  protected async load(): Promise<void> {
    const cfg = this.cfg();
    this.loading.set(true);
    this.error.set(null);
    this.notFound.set(false);
    this.provider.set(null);
    this.reviews.set(null);
    if (!cfg) {
      this.notFound.set(true);
      this.loading.set(false);
      return;
    }
    try {
      this.provider.set(await this.discover.getProvider(this.id, cfg.slug, this.discover.originQuery()));
      void this.loadReviews(1);
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 404 || status === 400) this.notFound.set(true);
      else this.error.set(apiErrorMessage(err, 'Could not load this listing.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected async loadReviews(page: number): Promise<void> {
    this.reviewsLoading.set(true);
    this.reviewsError.set(null);
    try {
      this.reviews.set(await this.discover.getReviews(this.id, page));
    } catch (err) {
      this.reviewsError.set(apiErrorMessage(err, 'Could not load reviews.'));
    } finally {
      this.reviewsLoading.set(false);
    }
  }

  protected onImgError(ev: Event): void {
    if (this.imgFailed) return;
    this.imgFailed = true;
    (ev.target as HTMLImageElement).src = this.cfg()?.image || AVATAR_FALLBACK;
  }

  protected openGallery(index: number): void {
    const urls = (this.provider()?.gallery ?? []).map((g) => g.url);
    if (!urls.length) return;
    this.dialog.open(ImageViewerDialogComponent, {
      data: { urls, index }, panelClass: 'image-viewer-panel', maxWidth: '100vw', maxHeight: '100vh',
    });
  }

  protected async toggleFavorite(): Promise<void> {
    const p = this.provider();
    if (!p) return;
    if (!p.isFavorite) {
      this.popping.set(true);
      setTimeout(() => this.popping.set(false), 450);
    }
    this.favBusy.set(true);
    try {
      const saved = await this.discover.toggleFavorite(p);
      this.provider.set({ ...p, isFavorite: saved });
      this.snack.open(saved ? 'Saved to your list' : 'Removed from your list', 'OK', { duration: 2500 });
    } catch (e) {
      this.snack.open((e as Error).message, 'OK', { duration: 4000 });
    } finally {
      this.favBusy.set(false);
    }
  }

  protected async contact(): Promise<void> {
    const p = this.provider();
    if (!p) return;
    this.contactBusy.set(true);
    try {
      const contact = await this.discover.getContact(p.id);
      this.dialog.open(ContactDialogComponent, { data: { name: p.displayName, contact }, width: '440px', maxWidth: '95vw' });
    } catch (err) {
      this.snack.open(apiErrorMessage(err, 'Could not load contact details.'), 'OK', { duration: 4000 });
    } finally {
      this.contactBusy.set(false);
    }
  }

  protected async writeReview(): Promise<void> {
    const p = this.provider();
    if (!p) return;
    const review = await firstValueFrom(
      this.dialog.open(ReviewDialogComponent, {
        data: { providerId: p.id, providerName: p.displayName }, width: '520px', maxWidth: '95vw',
      }).afterClosed(),
    );
    if (review) {
      this.snack.open('Thanks! Your review will appear once our team has checked it.', 'OK', { duration: 5000 });
      void this.loadReviews(1);
    }
  }

  protected locationDirections(l: ProviderLocation): string | null {
    return directionsUrl(l.address);
  }
}
