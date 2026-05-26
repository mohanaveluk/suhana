import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MaterialModule } from '../../shared/modules/material.module';
import { MatchService } from '../../services';
import { ProfileService } from '../../services';
import { MatchResult, UserProfile } from '../../models/user.model';

@Component({
  selector: 'app-matchmaking',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink, MaterialModule,
  ],
  templateUrl: './matchmaking.html',
  styleUrl: './matchmaking.scss',
})
export class MatchmakingComponent implements OnInit {
  protected readonly matchService = inject(MatchService);
  private readonly profileService = inject(ProfileService);
  private readonly route = inject(ActivatedRoute);

  protected readonly currentMatches = signal<MatchResult[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly selectedProfile = signal<UserProfile | null>(null);

  /** Profile ID passed via /matchmaking/:profileId – null means "my own matches" */
  private profileId: string | null = null;

  ngOnInit(): void {
    this.profileId = this.route.snapshot.paramMap.get('profileId');

    if (this.profileId) {
      const profile = this.profileService.getProfile(this.profileId);
      this.selectedProfile.set(profile ?? null);
    }

    void this.loadMatches();
  }

  async loadMatches(): Promise<void> {
    this.isLoading.set(true);
    try {
      const matches = await this.matchService.generateMatchesFromApi(4, this.profileId ?? undefined);
      this.currentMatches.set(matches);
    } catch {
      const gender = this.selectedProfile()?.gender ?? 'bride';
      const matches = this.matchService.generateMatches(gender, 4);
      this.currentMatches.set(matches);
    }
    this.isLoading.set(false);
  }

  refreshMatches(): void {
    void this.loadMatches();
  }

  shortlist(match: MatchResult): void {
    this.matchService.shortlist(match.id);
    this.currentMatches.update(list =>
      list.map(m => m.id === match.id ? { ...m, status: 'shortlisted' as const } : m)
    );
  }

  skip(match: MatchResult): void {
    this.matchService.skip(match.id);
    this.currentMatches.update(list => list.filter(m => m.id !== match.id));
  }

  expressInterest(match: MatchResult): void {
    this.matchService.expressInterest(match.id);
    this.currentMatches.update(list =>
      list.map(m => m.id === match.id ? { ...m, status: 'interested' as const } : m)
    );
  }

  getScoreColor(score: number): string {
    if (score >= 85) return '#4caf50';
    if (score >= 70) return '#ff9800';
    return '#f44336';
  }
}
