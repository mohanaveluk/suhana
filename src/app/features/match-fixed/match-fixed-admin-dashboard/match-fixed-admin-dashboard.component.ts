import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { DecimalPipe, PercentPipe, DatePipe, SlicePipe } from '@angular/common';
import { MaterialModule } from '../../../shared/modules/material.module';
import { MatchFixedService } from '../match-fixed.service';
import { AdminDashboardResponse } from '../models/dashboard-metrics.model';
import { SuccessStoryResponse } from '../models/success-story.model';
import { MATCH_SOURCE_LABELS } from '../models/match-fixed.model';

@Component({
  selector: 'app-match-fixed-admin-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialModule, DecimalPipe, DatePipe, SlicePipe],
  templateUrl: './match-fixed-admin-dashboard.component.html',
  styleUrl:    './match-fixed-admin-dashboard.component.scss',
})
export class MatchFixedAdminDashboardComponent implements OnInit {
  private readonly svc = inject(MatchFixedService);

  protected readonly metrics       = signal<AdminDashboardResponse | null>(null);
  protected readonly queue         = signal<SuccessStoryResponse[]>([]);
  protected readonly isLoading     = signal(true);
  protected readonly verifyingId   = signal<string | null>(null);
  protected readonly sourceLabels  = MATCH_SOURCE_LABELS;

  async ngOnInit(): Promise<void> {
    const [m, stories] = await Promise.all([
      this.svc.getAdminDashboard(),
      this.svc.getPublicStories({ limit: 20 }),
    ]);
    this.metrics.set(m);
    this.queue.set(stories.data.filter(s => !s.isVerified));
    this.isLoading.set(false);
  }

  async verify(id: string): Promise<void> {
    this.verifyingId.set(id);
    try {
      await this.svc.verifyPartner(id);
      this.queue.update(q => q.filter(s => s.id !== id));
    } catch { /* handled */ } finally {
      this.verifyingId.set(null);
    }
  }
}
