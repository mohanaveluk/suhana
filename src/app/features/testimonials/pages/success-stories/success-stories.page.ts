import {
  Component, ChangeDetectionStrategy, OnInit, inject, signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { SuccessStoriesService } from '../../services/success-stories.service';
import { SuccessStory } from '../../models/success-story.model';
import { SuccessStoryCardComponent } from '../../components/success-story-card/success-story-card.component';
import { LoadingSkeletonComponent } from '../../components/loading-skeleton/loading-skeleton.component';
import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';

@Component({
  selector: 'app-success-stories-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    DecimalPipe, MatButtonModule, MatIconModule, MatPaginatorModule,
    SuccessStoryCardComponent, LoadingSkeletonComponent, EmptyStateComponent,
  ],
  templateUrl: './success-stories.page.html',
  styleUrl:    './success-stories.page.scss',
})
export class SuccessStoriesPage implements OnInit {
  private readonly svc = inject(SuccessStoriesService);

  protected stories  = signal<SuccessStory[]>([]);
  protected loading  = signal(true);
  protected total    = signal(0);
  protected pageIndex = 0;
  protected pageSize  = 9;

  ngOnInit(): void { this.load(); }

  protected load(): void {
    this.loading.set(true);
    this.svc.listPublic({ page: this.pageIndex + 1, limit: this.pageSize }).subscribe({
      next: result => { this.stories.set(result.items); this.total.set(result.total); this.loading.set(false); },
      error: ()    => this.loading.set(false),
    });
  }

  protected onPageChange(e: PageEvent): void {
    this.pageIndex = e.pageIndex;
    this.pageSize  = e.pageSize;
    this.load();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
