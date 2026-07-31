import {
  Component, ChangeDetectionStrategy, Input, Output, EventEmitter, signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SuccessStory } from '../../models/success-story.model';

@Component({
  selector: 'app-success-story-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    RouterLink, DatePipe,
    MatCardModule, MatButtonModule, MatIconModule, MatChipsModule, MatTooltipModule,
  ],
  templateUrl: './success-story-card.component.html',
  styleUrl:    './success-story-card.component.scss',
})
export class SuccessStoryCardComponent {
  @Input({ required: true }) story!: SuccessStory;
  @Input() compact = false;
  @Output() viewDetail = new EventEmitter<SuccessStory>();

  protected expanded = signal(false);

  private readonly MAX_PREVIEW = 220;

  get previewText(): string {
    if (!this.story.story) return '';
    return this.story.story.length > this.MAX_PREVIEW && !this.expanded()
      ? this.story.story.slice(0, this.MAX_PREVIEW) + '…'
      : this.story.story;
  }

  get shouldTruncate(): boolean {
    return (this.story.story?.length ?? 0) > this.MAX_PREVIEW;
  }

  get coupleInitials(): string {
    return ((this.story.groomName[0] ?? 'G') + (this.story.brideName[0] ?? 'B')).toUpperCase();
  }

  get yearsTogether(): number | null {
    if (!this.story.marriageDate) return null;
    const diff = Date.now() - new Date(this.story.marriageDate).getTime();
    const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365));
    return years > 0 ? years : null;
  }
}
