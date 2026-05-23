import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MaterialModule } from '../../shared/modules/material.module';
import { MatchService } from '../../services';
import { MatchResult } from '../../models/user.model';

@Component({
  selector: 'app-match-tracker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink, MaterialModule,
  ],
  templateUrl: './match-tracker.html',
  styleUrl: './match-tracker.scss',
})
export class MatchTrackerComponent implements OnInit {
  private readonly matchService = inject(MatchService);
  protected readonly trackedMatches = signal<{ match: MatchResult; step: number }[]>([]);

  protected readonly steps = ['Shortlist', 'Express Interest', 'Chat / Meet'];

  async ngOnInit(): Promise<void> {
    await this.matchService.loadMatchesFromApi();
    if (this.matchService.matches().length === 0) {
      this.matchService.generateMatches('bride', 4);
    }
    const all = this.matchService.matches();
    const tracked = all.slice(0, 4).map((match, i) => ({
      match,
      step: i === 0 ? 2 : i === 1 ? 1 : 0,
    }));
    this.trackedMatches.set(tracked);
  }

  getStepStatus(currentStep: number, stepIndex: number): string {
    if (stepIndex < currentStep) return 'completed';
    if (stepIndex === currentStep) return 'active';
    return 'pending';
  }
}
