import { Component, ChangeDetectionStrategy, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TitleCasePipe } from '@angular/common';
import { MaterialModule } from '../../shared/modules/material.module';
import { MatchService } from '../../services';
import { MatchResult } from '../../models/user.model';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-compare',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink, TitleCasePipe, MaterialModule,
  ],
  templateUrl: './compare.html',
  styleUrl: './compare.scss',
})
export class CompareComponent implements OnInit {
  private readonly matchService = inject(MatchService);
  private readonly snackBar        = inject(MatSnackBar);

  protected readonly compareList = signal<MatchResult[]>([]);
  protected readonly categories = ['lifestyle', 'education', 'location', 'familyValues', 'interests', 'career', 'emotional'] as const;
  protected readonly categoryLabels: Record<string, string> = {
    lifestyle: 'Lifestyle', education: 'Education', location: 'Location',
    familyValues: 'Family Values', interests: 'Interests', career: 'Career', emotional: 'Emotional',
  };

  protected readonly isLoading = signal(true);

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
}
