import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { DatePipe } from '@angular/common';
import { MaterialModule } from '../../../shared/modules/material.module';
import { MatchFixedService } from '../match-fixed.service';
import { SuccessStoryResponse } from '../models/success-story.model';
import { MATCH_SOURCE_LABELS } from '../models/match-fixed.model';
import { SuccessStoryDialogComponent } from '../success-story-dialog/success-story-dialog.component';

const QUOTES: Record<string, string> = {
  default: 'Found love, found life.',
  suhana:  'Suhana brought us together.',
  family:  'Family knew best all along.',
  friend:  'A friend\'s introduction changed everything.',
};

@Component({
  selector: 'app-success-stories-wall',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MaterialModule, DatePipe],
  templateUrl: './success-stories-wall.component.html',
  styleUrl:    './success-stories-wall.component.scss',
})
export class SuccessStoriesWallComponent implements OnInit {
  private readonly svc    = inject(MatchFixedService);
  private readonly dialog = inject(MatDialog);

  protected readonly stories      = signal<SuccessStoryResponse[]>([]);
  protected readonly isLoading    = signal(true);
  protected readonly sourceLabels = MATCH_SOURCE_LABELS;

  async ngOnInit(): Promise<void> {
    const paginated = await this.svc.getPublicStories({ page: 1, limit: 12 });
    this.stories.set(paginated.data);
    this.isLoading.set(false);
  }

  quote(story: SuccessStoryResponse): string {
    if (story.successStory && story.successStory.length > 20) {
      return '"' + story.successStory.slice(0, 90) + (story.successStory.length > 90 ? '…"' : '"');
    }
    const key = story.matchSource.toLowerCase().split('_')[0];
    return QUOTES[key] ?? QUOTES['default'];
  }

  photo(story: SuccessStoryResponse): string {
    return story.engagementPhotoUrl ?? story.profileImageUrl ?? story.partnerPhotoUrl ?? '';
  }

  isSuhana(story: SuccessStoryResponse): boolean {
    return story.matchSource === 'SUHANA';
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
}
