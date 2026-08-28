import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialModule } from '../../shared/modules/material.module';
import { MatchService, InterestService } from '../../services';
import { MatchResult } from '../../models/user.model';
import { CommonService } from '../../services/common.service';

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
  private readonly matchService    = inject(MatchService);
  private readonly interestService = inject(InterestService);
  private readonly router          = inject(Router);
  private readonly snackBar        = inject(MatSnackBar);
  protected readonly commonService = inject(CommonService);
  protected readonly trackedMatches = signal<{ match: MatchResult; step: number }[]>([]);
  protected readonly processingIds  = signal<Set<string>>(new Set());

  protected readonly steps = ['Suggested', 'Shortlist', 'Express Interest', 'Chat / Meet'];

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

  protected isProcessing(matchId: string): boolean {
    return this.processingIds().has(matchId);
  }

  /** Step 0 → 1: Suggested → Shortlisted. Mirrors SearchComponent's shortlist action. */
  protected async addToShortlist(match: MatchResult): Promise<void> {
    const userId = this.targetUserId(match);
    if (!userId || this.isProcessing(match.id)) return;

    this.setProcessing(match.id, true);
    try {
      await this.matchService.shortlistUser(userId);
      this.advanceStep(match.id, 1);
      this.snackBar.open(`${match.profile.firstName} added to shortlist ✨`, 'Dismiss', { duration: 2500 });
    } catch {
      this.snackBar.open('Could not update shortlist. Please try again.', 'OK', { duration: 3000 });
    } finally {
      this.setProcessing(match.id, false);
    }
  }

  /** Step 1 → 2: Shortlisted → Interested. Sends a real interest request, same as SearchComponent. */
  protected async expressInterest(match: MatchResult): Promise<void> {
    const userId = this.targetUserId(match);
    if (!userId || this.isProcessing(match.id)) return;

    this.setProcessing(match.id, true);
    try {
      const message = this.interestService.buildDefaultMessage(match.profile, match.matchPercentage);
      await this.interestService.sendInterest(userId, message);
      this.advanceStep(match.id, 2);
      this.snackBar.open(`Interest sent to ${match.profile.firstName}! 💌`, 'Dismiss', { duration: 3000 });
    } catch {
      this.snackBar.open('Could not send interest. Please try again.', 'OK', { duration: 3000 });
    } finally {
      this.setProcessing(match.id, false);
    }
  }

  /** Step 3: Connected — open the chat with this match. */
  protected startChat(match: MatchResult): void {
    const userId = this.targetUserId(match);
    void this.router.navigate(['/chat'], userId ? { queryParams: { profileId: userId } } : {});
  }

  /** Prefers the API's `matchedUserId`; falls back to the profile's own id for locally-generated demo matches. */
  private targetUserId(match: MatchResult): string | undefined {
    return match.matchedUserId ?? match.profile.user?.id ?? match.profile.userId;
  }

  private advanceStep(matchId: string, step: number): void {
    this.trackedMatches.update(list => list.map(item =>
      item.match.id === matchId
        ? { match: { ...item.match, currentStep: step }, step }
        : item,
    ));
  }

  private setProcessing(matchId: string, active: boolean): void {
    this.processingIds.update(set => {
      const next = new Set(set);
      active ? next.add(matchId) : next.delete(matchId);
      return next;
    });
  }
}
