import {
  Component, ChangeDetectionStrategy, OnInit, inject, signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SuccessStoriesService } from '../../services/success-stories.service';
import { SuccessStory } from '../../models/success-story.model';
import { VerifiedBadgeComponent } from '../../components/verified-badge/verified-badge.component';

@Component({
  selector: 'app-success-story-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    RouterLink, DatePipe,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    MatChipsModule, MatTooltipModule,
    VerifiedBadgeComponent,
  ],
  templateUrl: './success-story-detail.page.html',
  styleUrl:    './success-story-detail.page.scss',
})
export class SuccessStoryDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly svc   = inject(SuccessStoriesService);

  protected story   = signal<SuccessStory | null>(null);
  protected loading = signal(true);

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.params['id'];
    try {
      const s = await firstValueFrom(this.svc.getDetail(id));
      this.story.set(s);
    } finally {
      this.loading.set(false);
    }
  }
}
