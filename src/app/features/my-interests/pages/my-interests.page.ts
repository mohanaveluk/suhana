import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { debounceTime, distinctUntilChanged, firstValueFrom } from 'rxjs';
import { MaterialModule } from '../../../shared/modules/material.module';
import { InterestCardComponent } from '../components/interest-card/interest-card.component';
import { MemberInteractionsService } from '../services/member-interactions.service';
import {
  CompatibilityFilter, InteractionAction, InteractionDirection, InteractionItem, InteractionQuery,
  InteractionSort, InteractionStatusFilter, InteractionTypeFilter,
} from '../models/member-interaction.model';

type SummaryKey = 'total' | 'new' | 'pending' | 'accepted' | 'views' | 'messages';

/**
 * My Interests — everyone who has shown interest in, viewed, or messaged the member (and the
 * interests they sent), with status, compatibility and contextual actions.
 */
@Component({
  selector: 'app-my-interests-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, MaterialModule, InterestCardComponent],
  templateUrl: './my-interests.page.html',
  styleUrl: './my-interests.page.scss',
})
export class MyInterestsPage {
  protected readonly svc = inject(MemberInteractionsService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  protected readonly q = this.svc.query;
  protected readonly search = new FormControl(this.svc.query().search ?? '', { nonNullable: true });

  protected readonly typeOptions: { value: InteractionTypeFilter; label: string }[] = [
    { value: 'all', label: 'All activity' },
    { value: 'interests', label: 'Interests' },
    { value: 'profile_views', label: 'Profile views' },
    { value: 'messages', label: 'Messages' },
  ];
  protected readonly statusOptions: { value: InteractionStatusFilter; label: string }[] = [
    { value: 'all', label: 'Any status' },
    { value: 'new', label: 'New' },
    { value: 'viewed', label: 'Viewed' },
    { value: 'pending', label: 'Pending' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'declined', label: 'Declined' },
    { value: 'withdrawn', label: 'Withdrawn' },
  ];
  protected readonly compatOptions: { value: CompatibilityFilter; label: string }[] = [
    { value: 'all', label: 'Any compatibility' },
    { value: 'horoscope_excellent', label: 'Excellent horoscope match' },
    { value: 'horoscope_good', label: 'Good horoscope match' },
    { value: 'personality_match', label: 'Personality match' },
    { value: 'ai_recommended', label: 'AI recommended' },
    { value: 'not_available', label: 'Compatibility not available' },
  ];
  protected readonly sortOptions: { value: InteractionSort; label: string }[] = [
    { value: 'newest', label: 'Newest first' },
    { value: 'oldest', label: 'Oldest first' },
    { value: 'compatibility', label: 'Highest compatibility' },
    { value: 'updated', label: 'Recently updated' },
  ];

  protected readonly summary = computed(() => {
    const d = this.svc.dashboard();
    return [
      { key: 'total' as const, label: 'Interests received', value: d?.totalInterestsReceived, icon: 'favorite' },
      { key: 'new' as const, label: 'New interests', value: d?.newInterests, icon: 'fiber_new' },
      { key: 'pending' as const, label: 'Pending requests', value: d?.pendingRequests, icon: 'hourglass_top' },
      { key: 'accepted' as const, label: 'Accepted connections', value: d?.acceptedConnections, icon: 'handshake' },
      { key: 'views' as const, label: 'Profile views', value: d?.profileViews, icon: 'visibility' },
      { key: 'messages' as const, label: 'New messages', value: d?.newMessages, icon: 'chat_bubble' },
    ];
  });

  protected readonly filtersActive = computed(() => {
    const q = this.q();
    return q.type !== 'all' || q.status !== 'all' || q.compatibility !== 'all' || !!q.search?.trim();
  });

  /** Nobody has interacted yet (received tab, no filters). */
  protected readonly nothingYet = computed(() =>
    !this.svc.loading() && !this.svc.error() && this.svc.total() === 0 && !this.filtersActive());

  /** Views but no interests: say so, so the empty interests list doesn't feel like nothing happened. */
  protected readonly viewsButNoInterests = computed(() => {
    const d = this.svc.dashboard();
    return this.q().direction === 'received' && !!d && d.totalInterestsReceived === 0 && d.profileViews > 0;
  });

  constructor() {
    void this.svc.load();
    void this.svc.refreshDashboard();
    this.search.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(inject(DestroyRef)))
      .subscribe(search => this.svc.setQuery({ search }));
  }

  protected set<K extends keyof InteractionQuery>(key: K, value: InteractionQuery[K]): void {
    this.svc.setQuery({ [key]: value } as Partial<InteractionQuery>);
  }

  protected setDirection(direction: InteractionDirection): void {
    // "Sent" only lists interests, so reset type to keep the filters meaningful.
    this.svc.setQuery({ direction, type: direction === 'sent' ? 'interests' : 'all', status: 'all' });
  }

  protected applySummary(key: SummaryKey): void {
    const base: Partial<InteractionQuery> = { direction: 'received', compatibility: 'all', search: '' };
    this.search.setValue('', { emitEvent: false });
    const map: Record<SummaryKey, Partial<InteractionQuery>> = {
      total: { type: 'interests', status: 'all' },
      new: { type: 'interests', status: 'new' },
      pending: { type: 'interests', status: 'pending' },
      accepted: { type: 'interests', status: 'accepted' },
      views: { type: 'profile_views', status: 'all' },
      messages: { type: 'messages', status: 'all' },
    };
    this.svc.setQuery({ ...base, ...map[key] });
  }

  protected clearFilters(): void {
    this.search.setValue('', { emitEvent: false });
    this.svc.setQuery({ type: this.q().direction === 'sent' ? 'interests' : 'all', status: 'all', compatibility: 'all', search: '' });
  }

  protected goToPage(page: number): void {
    this.svc.setQuery({ page });
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected async onAction(item: InteractionItem, action: InteractionAction): Promise<void> {
    const name = item.partner.name.split(' ')[0];
    try {
      switch (action) {
        case 'accept':
          await this.svc.accept(item);
          this.toast(`You accepted ${name}'s interest. You can now chat.`);
          break;
        case 'decline':
          if (!(await this.confirm('Decline this interest?', `${name} will see that their interest was declined. This can't be undone.`, 'Decline'))) return;
          await this.svc.decline(item);
          this.toast('Interest declined.');
          break;
        case 'withdraw':
          if (!(await this.confirm('Withdraw your interest?', `Your interest in ${name} will be withdrawn. You can express interest again later.`, 'Withdraw'))) return;
          await this.svc.withdraw(item);
          this.toast('Interest withdrawn.');
          break;
        case 'send_interest':
          await this.svc.sendInterest(item);
          this.toast(`Interest sent to ${name}.`);
          break;
        case 'block':
          if (!(await this.confirm(`Block ${name}?`, 'They will no longer be able to contact you or see you in their interests, and they will disappear from your list.', 'Block', true))) return;
          await this.svc.block(item);
          this.toast(`${name} has been blocked.`);
          break;
        case 'report': {
          const reason = await firstValueFrom(
            this.dialog.open(ReportProfileDialogComponent, { data: { name }, width: '480px', maxWidth: '95vw' }).afterClosed(),
          );
          if (!reason) return;
          await this.svc.report(item, reason);
          this.toast('Thank you. Our team will review this profile.');
          break;
        }
      }
    } catch (err: any) {
      this.toast(err?.error?.message ?? 'Something went wrong. Please try again.', true);
    }
  }

  private async confirm(title: string, message: string, confirmText: string, danger = false): Promise<boolean> {
    const ref = this.dialog.open(ConfirmActionDialogComponent, {
      data: { title, message, confirmText, danger }, width: '440px', maxWidth: '95vw',
    });
    return !!(await firstValueFrom(ref.afterClosed()));
  }

  private toast(message: string, error = false): void {
    this.snack.open(message, '✕', { duration: 4000, panelClass: error ? ['af-snack', 'af-snack--error'] : ['af-snack', 'af-snack--success'] });
  }
}

// ── Inline dialogs (same-file convention, see CLAUDE.md §15) ─────────────────

@Component({
  selector: 'app-confirm-action-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content><p class="mi-dialog-text">{{ data.message }}</p></mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" [mat-dialog-close]="false">Cancel</button>
      <button mat-flat-button type="button" class="mi-dialog-confirm" [class.mi-dialog-confirm--danger]="data.danger"
              [mat-dialog-close]="true" cdkFocusInitial>{{ data.confirmText }}</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .mi-dialog-text { margin: 0; line-height: 1.6; color: var(--suhana-text-secondary, #6b5557); }
    .mi-dialog-confirm { --mat-button-filled-container-color: var(--suhana-maroon, #800020); --mat-button-filled-label-text-color: #fff; border-radius: 999px; }
    .mi-dialog-confirm--danger { --mat-button-filled-container-color: #b3261e; }
  `],
})
export class ConfirmActionDialogComponent {
  protected readonly data = inject<{ title: string; message: string; confirmText: string; danger?: boolean }>(MAT_DIALOG_DATA);
}

@Component({
  selector: 'app-report-profile-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MaterialModule],
  template: `
    <h2 mat-dialog-title>Report {{ data.name }}</h2>
    <mat-dialog-content>
      <p class="mi-dialog-text">Tell us what's wrong. Reports are confidential — {{ data.name }} won't know who reported them.</p>
      <mat-form-field appearance="outline" class="mi-reason">
        <mat-label>Reason</mat-label>
        <textarea matInput rows="4" [formControl]="reason" maxlength="500"></textarea>
        @if (reason.touched && reason.invalid) { <mat-error>Please describe the problem (at least 10 characters).</mat-error> }
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>Cancel</button>
      <button mat-flat-button type="button" class="mi-dialog-confirm" (click)="submit()">Report</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .mi-dialog-text { margin: 0 0 12px; line-height: 1.6; color: var(--suhana-text-secondary, #6b5557); }
    .mi-reason { width: 100%; }
    .mi-dialog-confirm { --mat-button-filled-container-color: var(--suhana-maroon, #800020); --mat-button-filled-label-text-color: #fff; border-radius: 999px; }
  `],
})
export class ReportProfileDialogComponent {
  protected readonly data = inject<{ name: string }>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<ReportProfileDialogComponent>);
  protected readonly reason = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(10)] });

  protected submit(): void {
    this.reason.markAsTouched();
    if (this.reason.invalid) return;
    this.ref.close(this.reason.value.trim());
  }
}
