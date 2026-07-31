import {
  Component, ChangeDetectionStrategy, OnInit, inject, signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SuccessStoriesService } from '../../services/success-stories.service';
import { SuccessStory } from '../../models/success-story.model';
import { SuccessStoryCardComponent } from '../success-story-card/success-story-card.component';
import { LoadingSkeletonComponent } from '../loading-skeleton/loading-skeleton.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';

@Component({
  selector: 'app-featured-success-stories',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    RouterLink, MatButtonModule, MatIconModule,
    SuccessStoryCardComponent, LoadingSkeletonComponent, EmptyStateComponent,
  ],
  templateUrl: './featured-success-stories.component.html',
  styleUrl:    './featured-success-stories.component.scss',
})
export class FeaturedSuccessStoriesComponent implements OnInit {
  private readonly svc = inject(SuccessStoriesService);

  protected stories = signal<SuccessStory[]>([]);
  protected loading = signal(true);

  ngOnInit(): void {
    this.svc.getFeatured().subscribe({
      next: list  => { this.stories.set(list); this.loading.set(false); },
      error: ()   => this.loading.set(false),
    });
  }
}
