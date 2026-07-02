import {
  Component, ChangeDetectionStrategy, inject, signal, OnInit, OnDestroy,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { DatePipe, SlicePipe } from '@angular/common';
import { MaterialModule } from '../../../shared/modules/material.module';
import { MatchFixedService } from '../match-fixed.service';
import { SuccessStoryResponse } from '../models/success-story.model';
import { MATCH_SOURCE_LABELS } from '../models/match-fixed.model';
import { SuccessStoryDialogComponent } from '../success-story-dialog/success-story-dialog.component';

@Component({
  selector: 'app-featured-success-stories',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MaterialModule, DatePipe, SlicePipe],
  templateUrl: './featured-success-stories.component.html',
  styleUrl:    './featured-success-stories.component.scss',
})
export class FeaturedSuccessStoriesComponent implements OnInit, OnDestroy {
  private readonly svc    = inject(MatchFixedService);
  private readonly dialog = inject(MatDialog);

  protected readonly stories       = signal<SuccessStoryResponse[]>([]);
  protected readonly activeIndex   = signal(0);
  protected readonly sourceLabels  = MATCH_SOURCE_LABELS;
  protected readonly isLoading     = signal(true);

  private timer?: ReturnType<typeof setInterval>;

  async ngOnInit(): Promise<void> {
    const list = await this.svc.getFeaturedStories();
    this.stories.set(list);
    this.isLoading.set(false);
    if (list.length > 1) this.startAutoScroll();
  }

  private startAutoScroll(): void {
    this.timer = setInterval(() => {
      this.activeIndex.update(i => (i + 1) % this.stories().length);
    }, 5000);
  }

  prev(): void {
    clearInterval(this.timer);
    this.activeIndex.update(i => (i - 1 + this.stories().length) % this.stories().length);
    this.startAutoScroll();
  }

  next(): void {
    clearInterval(this.timer);
    this.activeIndex.update(i => (i + 1) % this.stories().length);
    this.startAutoScroll();
  }

  goTo(index: number): void {
    clearInterval(this.timer);
    this.activeIndex.set(index);
    this.startAutoScroll();
  }

  openStory(story: SuccessStoryResponse): void {
    this.dialog.open(SuccessStoryDialogComponent, {
      data: story,
      width: '820px',
      maxWidth: '98vw',
      maxHeight: '92vh',
      panelClass: 'story-dialog-panel',
    });
  }

  displayPhoto(story: SuccessStoryResponse): string {
    return story.profileImageUrl ?? story.partnerPhotoUrl ?? story.engagementPhotoUrl ?? '';
  }

  ngOnDestroy(): void { clearInterval(this.timer); }
}
