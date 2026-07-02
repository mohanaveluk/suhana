import {
  Component, ChangeDetectionStrategy, inject, signal, OnInit, OnDestroy, ElementRef, AfterViewInit,
} from '@angular/core';
import { MaterialModule } from '../../../shared/modules/material.module';
import { MatchFixedService } from '../match-fixed.service';
import { SuccessStatsResponse } from '../models/dashboard-metrics.model';
import { DecimalPipe } from '@angular/common';

interface StatCard {
  label: string;
  icon: string;
  key: keyof SuccessStatsResponse;
  color: string;
}

@Component({
  selector: 'app-success-stats',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialModule, DecimalPipe],
  templateUrl: './success-stats.component.html',
  styleUrl:    './success-stats.component.scss',
})
export class SuccessStatsComponent implements OnInit, OnDestroy {
  private readonly svc = inject(MatchFixedService);
  private readonly el  = inject(ElementRef);

  protected readonly stats        = signal<SuccessStatsResponse | null>(null);
  protected readonly displayedNums = signal<Record<string, number>>({
    totalMatchFixed: 0, totalMarried: 0, suhanaMatches: 0, externalMatches: 0, verifiedStories: 0,
  });

  private observer?: IntersectionObserver;
  private animationStarted = false;

  protected readonly statCards: StatCard[] = [
    { label: 'Match Fixed',       icon: 'favorite',      key: 'totalMatchFixed',   color: 'maroon' },
    { label: 'Married',           icon: 'church',        key: 'totalMarried',      color: 'gold' },
    { label: 'Through Suhana',    icon: 'verified',      key: 'suhanaMatches',     color: 'rose' },
    { label: 'External Matches',  icon: 'people',        key: 'externalMatches',   color: 'teal' },
    { label: 'Verified Stories',  icon: 'workspace_premium', key: 'verifiedStories', color: 'purple' },
  ];

  async ngOnInit(): Promise<void> {
    const s = await this.svc.getSuccessStats();
    this.stats.set(s);
    this.setupIntersectionObserver();
  }

  private setupIntersectionObserver(): void {
    this.observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !this.animationStarted && this.stats()) {
          this.animationStarted = true;
          this.animateCounters();
        }
      },
      { threshold: 0.3 },
    );
    this.observer.observe(this.el.nativeElement);
  }

  private animateCounters(): void {
    const target = this.stats()!;
    const duration = 1800;
    const start = performance.now();

    const keys: (keyof SuccessStatsResponse)[] = ['totalMatchFixed','totalMarried','suhanaMatches','externalMatches','verifiedStories'];

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);

      const updated: Record<string, number> = {};
      for (const key of keys) {
        updated[key] = Math.round(ease * (target[key] as number));
      }
      this.displayedNums.set(updated);

      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  ngOnDestroy(): void { this.observer?.disconnect(); }
}
