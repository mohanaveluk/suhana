import { Component, ChangeDetectionStrategy, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TitleCasePipe, LowerCasePipe } from '@angular/common';
import { MaterialModule } from '../../shared/modules/material.module';
import { MatchService } from '../../services';
import { MatchResult } from '../../models/user.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonService } from '../../services/common.service';

@Component({
  selector: 'app-compare',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink, TitleCasePipe, LowerCasePipe, MaterialModule,
  ],
  templateUrl: './compare.html',
  styleUrl: './compare.scss',
})
export class CompareComponent implements OnInit {
  private readonly matchService = inject(MatchService);
  protected readonly commonService = inject(CommonService);  
  private readonly snackBar        = inject(MatSnackBar);

  protected readonly compareList = signal<MatchResult[]>([]);
  protected readonly categories = ['ageGap', 'income', 'education', 'location', 'familyValues', 'religion', 'motherTongue', 'career'] as const;
  protected readonly categoryLabels: Record<string, string> = {ageGap: 'Age Gap', income: 'Income',
    lifestyle: 'Lifestyle', education: 'Education', location: 'Location',
    familyValues: 'Family Values', interests: 'Interests', career: 'Career', emotional: 'Emotional', religion: 'Religion', motherTongue: 'Mother Tongue',
  };

  protected readonly isLoading = signal(true);

  /** Hide the whole row when no one in the comparison has that media. */
  protected readonly hasAnyVoiceIntro = computed(() =>
    this.compareList().some(m => !!m.profile.voiceIntroductionUrl));
  protected readonly hasAnyVideoIntro = computed(() =>
    this.compareList().some(m => !!m.profile.videoIntroUrl));

  async ngOnInit(): Promise<void> {
    await this.matchService.loadMatchesFromApi();
    const matches = this.matchService.matches();
    if (matches.length > 0) {
      this.compareList.set(matches.slice(0, 4));
    } else {
      const generated = this.matchService.generateMatches('bride', 4);
      this.compareList.set(generated);
    }
    this.isLoading.set(false);
  }

  removeFromCompare(matchId: string): void {
    this.compareList.update(list => list.filter(m => m.id !== matchId));
  }

  shortlist(match: MatchResult): void {
    this.matchService.shortlist(match.id);
    this.compareList.update(list => list.filter(m => m.id !== match.id));

  }

  connect(match: MatchResult): void {
    if(match.status === 'interested'){
      this.snackBar.open('You have already sent your interest.', 'OK', { duration: 3000 });
      return;
    }
    this.matchService.expressInterest(match.id);
    this.compareList.update(list =>
      list.map(m => m.id === match.id ? { ...m, status: 'interested' as const } : m)
    );    
  }

  getBarWidth(value: number): string {
    return `${value}%`;
  }

  getScoreClass(score: number): string {
    if (score >= 85) return 'score-high';
    if (score >= 70) return 'score-medium';
    return 'score-low';
  }

  getTrustScore(score: string): string {
    if (score === 'GREEN_FLAG') return 'score-high';
    if (score === 'YELLOW_FLAG') return 'score-medium';
    return 'score-low';
  }

  /** API sends the flag as 0 | 1; tolerate a boolean too. */
  protected isMobileVerified(match: MatchResult): boolean {
    return Number(match.user?.isMobileVerified ?? match.isMobileVerified ?? 0) === 1;
  }

  // ── Trust Indicator helpers ───────────────────────────────────────────────
  protected trustLabel(level: string): string {
    if (level === 'GREEN_FLAG') return 'Highly Active Profile';
    if (level === 'YELLOW_FLAG') return 'Moderately Active Profile';
    return 'Low Activity Profile';
  }

  protected trustIcon(level: string): string {
    if (level === 'GREEN_FLAG') return 'verified';
    if (level === 'YELLOW_FLAG') return 'info';
    return 'warning';
  }

  protected trustTooltip(level: string): string {
    if (level === 'GREEN_FLAG') return 'This profile is actively maintained and frequently updated.';
    if (level === 'YELLOW_FLAG') return 'This profile has been updated occasionally.';
    return 'This profile has not been updated recently.';
  }
}
