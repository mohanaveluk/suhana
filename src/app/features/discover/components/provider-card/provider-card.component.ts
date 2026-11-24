import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MaterialModule } from '../../../../shared/modules/material.module';
import { ProviderCard } from '../../models/discover.model';
import {
  AVATAR_FALLBACK, MODE_LABELS, directionsUrl, formatDistance, formatMoney, languageLabel, placeLabel,
} from '../../utils/discover.utils';
import { attributeHighlights, configBySlug, providerLink, specialtyLabel } from '../../utils/category-config';
import { RatingStarsComponent } from '../rating-stars/rating-stars.component';

/** Presentational result card for any category. The host owns favorites/contact calls. */
@Component({
  selector: 'app-provider-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialModule, RouterLink, RatingStarsComponent],
  templateUrl: './provider-card.component.html',
  styleUrl: './provider-card.component.scss',
  host: {
    '[style.--pc-delay]': "(index() * 70) + 'ms'",
    '[style.--pc-accent]': 'cfg()?.accent?.[0] ?? null',
    '[style.--pc-accent2]': 'cfg()?.accent?.[1] ?? null',
  },
})
export class ProviderCardComponent {
  readonly provider = input.required<ProviderCard>();
  /** Position in the list — drives the staggered entrance animation. */
  readonly index = input(0);
  readonly favoriteBusy = input(false);
  readonly favoriteToggled = output<ProviderCard>();
  readonly contactRequested = output<ProviderCard>();

  protected readonly modeLabels = MODE_LABELS;
  protected readonly popping = signal(false);
  private imgFailed = false;

  protected readonly cfg = computed(() => configBySlug(this.provider().categorySlug));
  protected readonly link = computed(() => providerLink(this.provider().categorySlug, this.provider().id));
  protected readonly photo = computed(() => this.provider().photoUrl || this.cfg()?.image || AVATAR_FALLBACK);
  protected readonly usingCategoryImage = computed(() => !this.provider().photoUrl);
  protected readonly place = computed(() => placeLabel(this.provider().place));
  protected readonly distance = computed(() => {
    const d = this.provider().distance;
    return d ? formatDistance(d.value, d.unit) : null;
  });
  protected readonly fee = computed(() => {
    const p = this.provider().startingPrice;
    return p ? `From ${formatMoney(p)}` : 'Price on request';
  });
  private readonly specialtyCodes = computed(() =>
    this.provider().details?.specialties ?? this.provider().astrologer?.specializations ?? []);
  protected readonly specialties = computed(() =>
    this.specialtyCodes().slice(0, 3).map((c) => specialtyLabel(this.cfg(), c)));
  protected readonly moreSpecs = computed(() => Math.max(0, this.specialtyCodes().length - 3));
  protected readonly languages = computed(() => this.provider().languages.map(languageLabel).join(', '));
  protected readonly experience = computed(() =>
    this.provider().details?.experienceYears ?? this.provider().astrologer?.experienceYears ?? null);
  protected readonly highlights = computed(() => attributeHighlights(this.cfg(), this.provider().details).slice(0, 3));
  protected readonly showModes = computed(() => (this.cfg()?.showModes ?? true) && this.provider().consultationModes.length > 0);
  protected readonly directions = computed(() => directionsUrl(this.provider().place?.address ?? null));

  protected toggleFavorite(): void {
    if (!this.provider().isFavorite) {
      this.popping.set(true);
      setTimeout(() => this.popping.set(false), 450);
    }
    this.favoriteToggled.emit(this.provider());
  }

  protected onImgError(ev: Event): void {
    if (this.imgFailed) return;
    this.imgFailed = true;
    (ev.target as HTMLImageElement).src = this.cfg()?.image || AVATAR_FALLBACK;
  }
}
