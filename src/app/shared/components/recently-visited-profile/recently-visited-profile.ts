import {
  Component, ChangeDetectionStrategy, ElementRef, OnInit, ViewChild, computed, inject, input, signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialModule } from '../../modules/material.module';
import { CommonService } from '../../../services/common.service';
import { AuthService, ProfileVisitService } from '../../../services';
import { ProfileVisit } from '../../../models/profile-visit.model';
import { timeAgo } from '../../utils/relative-time.util';
import { RecentlyVisitedViewMode } from './recently-visited-profile.model';

/** "Clear all history?" confirmation — local to this feature, mirrors gallery-management's inline dialog pattern. */
@Component({
  selector: 'app-clear-visit-history-dialog',
  standalone: true,
  imports: [MaterialModule],
  template: `
    <div class="cvh-dialog">
      <h2 mat-dialog-title>Clear Visit History?</h2>
      <mat-dialog-content>
        <p>Are you sure you want to clear your recently viewed profiles? This can't be undone.</p>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="dialogRef.close(false)">Cancel</button>
        <button mat-raised-button color="warn" type="button" (click)="dialogRef.close(true)">
          <mat-icon>delete_sweep</mat-icon> Clear History
        </button>
      </mat-dialog-actions>
    </div>
  `,
})
export class ClearVisitHistoryDialogComponent {
  constructor(protected readonly dialogRef: MatDialogRef<ClearVisitHistoryDialogComponent, boolean>) {}
}

@Component({
  selector: 'app-recently-visited-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [RouterLink, MaterialModule],
  templateUrl: './recently-visited-profile.html',
  styleUrl: './recently-visited-profile.scss',
})
export class RecentlyVisitedProfileComponent implements OnInit {
  private readonly visitService = inject(ProfileVisitService);
  private readonly authService  = inject(AuthService);
  protected readonly commonService = inject(CommonService);
  private readonly router   = inject(Router);
  private readonly dialog   = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  @ViewChild('track') private readonly trackRef?: ElementRef<HTMLElement>;

  // ── Inputs ────────────────────────────────────────────────────────────────
  readonly viewMode    = input<RecentlyVisitedViewMode>('carousel');
  readonly showStats   = input(true);
  readonly showHeader  = input(true);
  readonly showActions = input(true);
  readonly limit       = input(20);

  // ── State — bound straight to the (singleton) service; only one instance of
  // this component is ever visible at a time, so sharing signals is safe and
  // avoids duplicating loading/error/list state locally. ──────────────────────
  protected readonly profiles = this.visitService.profiles;
  protected readonly stats    = this.visitService.stats;
  protected readonly isLoading = this.visitService.loading;

  protected readonly isAuthenticated = computed(() => this.authService.authenticated());

  /** 'list' has no distinct layout yet — falls back to 'grid' (see recently-visited-profile.model.ts). */
  protected readonly effectiveViewMode = computed<'carousel' | 'grid'>(() =>
    this.viewMode() === 'carousel' ? 'carousel' : 'grid',
  );

  protected readonly removingIds = signal<Set<string>>(new Set());

  protected readonly timeAgo = timeAgo;

  async ngOnInit(): Promise<void> {
    if (!this.isAuthenticated()) return;
    await this.visitService.getRecentProfiles(1, this.limit());
    if (this.showStats()) await this.visitService.getVisitStats();
  }

  protected viewProfile(visit: ProfileVisit): void {
    // The spec's own /profile-view/{profileCode} doesn't match how that route
    // actually resolves (it looks the id up as a userId, not a profileCode —
    // /view/:code is the code-based route). profileId is what /profile-view
    // actually expects, matching every other "View Profile" link in the app.
    void this.router.navigate(['/profile-view', visit.profileId]);
  }

  protected async removeFromHistory(visit: ProfileVisit, event: Event): Promise<void> {
    event.stopPropagation();
    this.removingIds.update(set => new Set(set).add(visit.profileId));
    const ok = await this.visitService.deleteProfile(visit.profileId);
    this.removingIds.update(set => { const next = new Set(set); next.delete(visit.profileId); return next; });
    if (!ok) {
      this.snackBar.open('Could not remove this profile. Please try again.', 'OK', { duration: 3000 });
    }
  }

  protected async clearHistory(): Promise<void> {
    const ref = this.dialog.open(ClearVisitHistoryDialogComponent, { width: '400px', autoFocus: false });
    const confirmed = await new Promise<boolean>(resolve => {
      ref.afterClosed().subscribe(result => resolve(!!result));
    });
    if (!confirmed) return;

    const ok = await this.visitService.clearHistory();
    if (!ok) {
      this.snackBar.open('Could not clear your history. Please try again.', 'OK', { duration: 3000 });
    }
  }

  protected loginParams(): { returnUrl: string } {
    return { returnUrl: this.router.url };
  }

  // ── Carousel navigation ──────────────────────────────────────────────────
  protected scrollPrev(): void {
    this.scrollByTrack(-1);
  }

  protected scrollNext(): void {
    this.scrollByTrack(1);
  }

  private scrollByTrack(direction: 1 | -1): void {
    const el = this.trackRef?.nativeElement;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth, behavior: 'smooth' });
  }
}
