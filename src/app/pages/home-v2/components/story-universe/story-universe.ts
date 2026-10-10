import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MaterialModule } from '../../../../shared/modules/material.module';
import { SuccessStoryResponse } from '../../../../features/match-fixed/models/success-story.model';
import { MATCH_SOURCE_LABELS } from '../../../../features/match-fixed/models/match-fixed.model';
import { ringOffset } from '../../utils/motion.util';

/**
 * Cinematic story stage: the selected story fills the centre, neighbours recede in 3D on either side.
 * Purely presentational — the host owns data loading and decides what "open" does.
 */
@Component({
  selector: 'app-story-universe',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialModule, DatePipe],
  templateUrl: './story-universe.html',
  styleUrl: './story-universe.scss',
})
export class StoryUniverseComponent {
  readonly stories = input<SuccessStoryResponse[]>([]);
  readonly loading = input(false);
  readonly openStory = output<SuccessStoryResponse>();

  protected readonly active = signal(0);
  protected readonly failedImages = signal<ReadonlySet<string>>(new Set());
  protected readonly labels = MATCH_SOURCE_LABELS;

  protected readonly count = computed(() => this.stories().length);
  protected readonly slides = computed(() => {
    const list = this.stories();
    const a = this.active() % Math.max(list.length, 1);
    return list.map((story, i) => {
      const off = Math.max(-2, Math.min(2, ringOffset(i, a, list.length)));
      return { story, i, off, isActive: ringOffset(i, a, list.length) === 0 };
    });
  });
  protected readonly current = computed(() => this.stories()[this.active() % Math.max(this.count(), 1)] ?? null);
  protected readonly backdrop = computed(() => {
    const s = this.current();
    return s ? this.photo(s) : '';
  });

  protected step(dir: 1 | -1): void {
    const n = this.count();
    if (n < 2) return;
    this.active.set((this.active() % n + dir + n) % n);
  }

  protected onSlide(slide: { story: SuccessStoryResponse; i: number; isActive: boolean }): void {
    if (slide.isActive) this.openStory.emit(slide.story);
    else this.active.set(slide.i);
  }

  protected onKey(e: KeyboardEvent): void {
    if (e.key === 'ArrowRight') { this.step(1);  e.preventDefault(); }
    if (e.key === 'ArrowLeft')  { this.step(-1); e.preventDefault(); }
  }

  private startX: number | null = null;
  protected onPointerDown(e: PointerEvent): void { this.startX = e.clientX; }
  protected onPointerUp(e: PointerEvent): void {
    if (this.startX !== null && Math.abs(e.clientX - this.startX) > 45) this.step(e.clientX < this.startX ? 1 : -1);
    this.startX = null;
  }

  protected photo(s: SuccessStoryResponse): string {
    const url = s.weddingPhotoUrl?.displayUrl ?? s.engagementPhotoUrl?.displayUrl
      ?? s.partnerPhotoUrl?.displayUrl ?? s.profileImageUrl ?? '';
    return this.failedImages().has(s.id) ? '' : url;
  }

  protected onImgError(s: SuccessStoryResponse): void {
    this.failedImages.update(set => new Set(set).add(s.id));
  }

  protected milestone(s: SuccessStoryResponse): string {
    if (s.marriageDate) return 'Married';
    if (s.engagementDate) return 'Engaged';
    return this.labels[s.matchSource] ?? 'Success story';
  }

  protected milestoneDate(s: SuccessStoryResponse): Date | null {
    return s.marriageDate ?? s.engagementDate ?? null;
  }

  protected couple(s: SuccessStoryResponse): string {
    return [s.userName, s.partnerName].filter(Boolean).join(' & ');
  }

  protected excerpt(s: SuccessStoryResponse, max = 150): string {
    const t = (s.successStory ?? '').trim();
    return t.length > max ? t.slice(0, max).trimEnd() + '…' : t;
  }
}
