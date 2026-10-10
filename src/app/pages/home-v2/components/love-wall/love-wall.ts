import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MaterialModule } from '../../../../shared/modules/material.module';
import { SuccessStoryResponse } from '../../../../features/match-fixed/models/success-story.model';
import { MATCH_SOURCE_LABELS } from '../../../../features/match-fixed/models/match-fixed.model';

/** Editorial mosaic. Tile sizes come from a CSS :nth-child cycle — no JS masonry. */
@Component({
  selector: 'app-love-wall',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialModule, RouterLink, DatePipe],
  templateUrl: './love-wall.html',
  styleUrl: './love-wall.scss',
})
export class LoveWallComponent {
  readonly stories = input<SuccessStoryResponse[]>([]);
  readonly loading = input(false);
  readonly error   = input(false);
  readonly openStory = output<SuccessStoryResponse>();
  readonly retry     = output<void>();

  protected readonly skeletons = [0, 1, 2, 3, 4, 5];
  protected readonly failedImages = signal<ReadonlySet<string>>(new Set());
  protected readonly labels = MATCH_SOURCE_LABELS;

  protected photo(s: SuccessStoryResponse): string {
    if (this.failedImages().has(s.id)) return '';
    return s.engagementPhotoUrl?.displayUrl ?? s.weddingPhotoUrl?.displayUrl
      ?? s.partnerPhotoUrl?.displayUrl ?? s.profileImageUrl ?? '';
  }

  protected onImgError(s: SuccessStoryResponse): void {
    this.failedImages.update(set => new Set(set).add(s.id));
  }

  protected couple(s: SuccessStoryResponse): string {
    return [s.userName, s.partnerName].filter(Boolean).join(' & ');
  }

  protected milestone(s: SuccessStoryResponse): string {
    if (s.marriageDate) return 'Married';
    if (s.engagementDate) return 'Engaged';
    return this.labels[s.matchSource] ?? 'Success story';
  }

  protected milestoneDate(s: SuccessStoryResponse): Date | null {
    return s.marriageDate ?? s.engagementDate ?? null;
  }

  protected excerpt(s: SuccessStoryResponse): string {
    const t = (s.successStory ?? '').trim();
    return t.length > 140 ? t.slice(0, 140).trimEnd() + '…' : t;
  }
}
