import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { DatePipe, SlicePipe } from '@angular/common';
import { MaterialModule } from '../../../shared/modules/material.module';
import { MatchFixedService } from '../match-fixed.service';
import { MatchSourceType, MATCH_SOURCE_LABELS } from '../models/match-fixed.model';
import { SuccessStoryResponse } from '../models/success-story.model';
import { SuccessStoryDialogComponent } from '../success-story-dialog/success-story-dialog.component';

@Component({
  selector: 'app-success-stories',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialModule, DatePipe, SlicePipe],
  templateUrl: './success-stories.component.html',
  styleUrl:    './success-stories.component.scss',
})
export class SuccessStoriesComponent implements OnInit {
  private readonly svc    = inject(MatchFixedService);
  private readonly dialog = inject(MatDialog);

  protected readonly sourceLabels  = MATCH_SOURCE_LABELS;
  protected readonly sourceOptions = [null, ...Object.values(MatchSourceType)];

  protected readonly isLoading     = this.svc.isLoading;
  protected readonly stories       = this.svc.stories;
  protected readonly hasMore       = this.svc.hasMore;
  protected readonly activeFilter  = signal<MatchSourceType | null>(null);
  protected readonly loadingMore   = signal(false);

  async ngOnInit(): Promise<void> {
    await this.svc.getPublicStories({ page: 1, limit: 12 });
  }

  async applyFilter(src: MatchSourceType | null): Promise<void> {
    this.activeFilter.set(src);
    await this.svc.getPublicStories({ page: 1, limit: 12, matchSource: src ?? undefined });
  }

  async loadMore(): Promise<void> {
    this.loadingMore.set(true);
    await this.svc.loadMoreStories({ matchSource: this.activeFilter() ?? undefined });
    this.loadingMore.set(false);
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
    return story.profileImageUrl ?? story.partnerPhotoUrl?.thumbnailUrl ?? story.engagementPhotoUrl?.thumbnailUrl ?? '';
  }

  initials(story: SuccessStoryResponse): string {
    return (story.userName[0] ?? '') + (story.partnerName[0] ?? '');
  }
}
