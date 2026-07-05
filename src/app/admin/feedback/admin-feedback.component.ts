import {
  Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DatePipe, TitleCasePipe, LowerCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subject, firstValueFrom, debounceTime, distinctUntilChanged } from 'rxjs';
import {
  MatDialog, MAT_DIALOG_DATA, MatDialogModule,
} from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MaterialModule } from '../../shared/modules/material.module';
import { FeedbackService } from './feedback.service';
import {
  Feedback, FeedbackFilter, FeedbackStats, FeedbackStatus,
  FEEDBACK_CATEGORY_LABELS, STATUS_CONFIG,
} from './feedback.model';

// ── Inline confirmation dialog ────────────────────────────────────────────────
interface ConfirmData {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

@Component({
  selector: 'app-af-confirm',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="afc-wrap">
      <div class="afc-icon" [class.afc-icon--danger]="data.danger">
        <mat-icon>{{ data.danger ? 'warning' : 'help_outline' }}</mat-icon>
      </div>
      <h2 class="afc-title" mat-dialog-title>{{ data.title }}</h2>
      <mat-dialog-content class="afc-msg">{{ data.message }}</mat-dialog-content>
      <mat-dialog-actions class="afc-actions">
        <button mat-button mat-dialog-close class="afc-cancel">Cancel</button>
        <button mat-raised-button [mat-dialog-close]="true"
                [class.afc-btn--danger]="data.danger"
                [class.afc-btn--primary]="!data.danger">
          {{ data.confirmLabel ?? 'Confirm' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .afc-wrap   { padding: 1.5rem 1.5rem 1rem; text-align: center; min-width: 300px; }
    .afc-icon   { width: 3.25rem; height: 3.25rem; border-radius: 50%; background: #eff6ff;
                  display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem;
                  mat-icon { font-size: 1.6rem; width: 1.6rem; height: 1.6rem; color: #1d4ed8; } }
    .afc-icon--danger { background: #fef2f2;
                  mat-icon { color: #dc2626; } }
    .afc-title  { margin: 0 0 .25rem !important; font-size: 1.05rem !important; font-weight: 700 !important;
                  color: #1a1a2e !important; }
    .afc-msg    { font-size: .875rem; color: #5a5a6e; line-height: 1.6; padding: 0 !important;
                  max-width: 260px; margin: 0 auto; }
    .afc-actions { display: flex !important; justify-content: center !important; gap: .6rem;
                   padding: 1.25rem 0 .25rem !important; min-height: unset !important; }
    .afc-cancel { color: #6b7280 !important; }
    .afc-btn--danger  { background: #dc2626 !important; color: #fff !important; }
    .afc-btn--primary { background: var(--suhana-maroon, #800020) !important; color: #fff !important; }
  `],
})
export class AfConfirmDialogComponent {
  protected readonly data = inject<ConfirmData>(MAT_DIALOG_DATA);
}

// ─────────────────────────────────────────────────────────────────────────────
// AdminFeedbackComponent
// ─────────────────────────────────────────────────────────────────────────────
@Component({
  selector: 'app-admin-feedback',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    FormsModule, DatePipe, LowerCasePipe, RouterLink,
    MaterialModule, MatPaginatorModule, MatSidenavModule,
  ],
  templateUrl: './admin-feedback.component.html',
  styleUrl:    './admin-feedback.component.scss',
})
export class AdminFeedbackComponent implements OnInit {
  private readonly svc        = inject(FeedbackService);
  private readonly dialog     = inject(MatDialog);
  private readonly snackBar   = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  private readonly searchSubject = new Subject<string>();

  // ── Table state ────────────────────────────────────────────────────
  protected readonly feedbacks        = signal<Feedback[]>([]);
  protected readonly allFeedbacks     = signal<Feedback[]>([]);
  protected readonly isLoading        = signal(false);
  protected readonly selectedStatus   = signal<FeedbackStatus | 'ALL'>('PENDING');
  protected readonly searchQuery      = signal('');
  protected readonly pageIndex        = signal(0);
  protected readonly pageSize         = signal(10);
  protected readonly processingIds    = signal<Set<string>>(new Set());

  // ── Drawer ─────────────────────────────────────────────────────────
  protected readonly drawerOpen        = signal(false);
  protected readonly selectedFeedback  = signal<Feedback | null>(null);

  // ── Computed ───────────────────────────────────────────────────────
  protected readonly totalCount = computed(() => this.feedbacks().length);

  protected readonly pagedFeedbacks = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.feedbacks().slice(start, start + this.pageSize());
  });

  protected readonly stats = computed<FeedbackStats>(() => {
    const all = this.allFeedbacks();
    if (!all.length) return { total: 0, pending: 0, approved: 0, rejected: 0, resolved: 0, avgRating: '0.0' };
    return {
      total:    all.length,
      pending:  all.filter(f => f.status === 'PENDING').length,
      approved: all.filter(f => f.status === 'APPROVED').length,
      rejected: all.filter(f => f.status === 'REJECTED').length,
      resolved: all.filter(f => f.status === 'RESOLVED').length,
      avgRating: (all.reduce((s, f) => s + f.rating, 0) / all.length).toFixed(1),
    };
  });

  // ── Config constants ───────────────────────────────────────────────
  protected readonly STATUS_CONFIG           = STATUS_CONFIG;
  protected readonly FEEDBACK_CATEGORY_LABELS = FEEDBACK_CATEGORY_LABELS;

  protected readonly displayedColumns = [
    'index', 'category', 'rating', 'subject', 'submittedBy', 'email', 'status', 'createdAt', 'actions',
  ];

  protected readonly statusTabs: Array<{ value: FeedbackStatus | 'ALL'; label: string; icon: string }> = [
    { value: 'PENDING',  label: 'Pending',  icon: 'schedule' },
    { value: 'APPROVED', label: 'Approved', icon: 'check_circle' },
    { value: 'REJECTED', label: 'Rejected', icon: 'cancel' },
    { value: 'RESOLVED', label: 'Resolved', icon: 'task_alt' },
  ];

  protected readonly statCards: Array<{
    key: keyof FeedbackStats; label: string; icon: string; cls: string;
  }> = [
    { key: 'total',     label: 'Total',       icon: 'feedback',       cls: 'sc--total' },
    { key: 'pending',   label: 'Pending',     icon: 'schedule',       cls: 'sc--pending' },
    { key: 'approved',  label: 'Approved',    icon: 'check_circle',   cls: 'sc--approved' },
    { key: 'rejected',  label: 'Rejected',    icon: 'cancel',         cls: 'sc--rejected' },
    { key: 'resolved',  label: 'Resolved',    icon: 'task_alt',       cls: 'sc--resolved' },
    { key: 'avgRating', label: 'Avg. Rating', icon: 'star',           cls: 'sc--rating' },
  ];

  // ── Lifecycle ──────────────────────────────────────────────────────
  ngOnInit(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(q => {
      this.searchQuery.set(q);
      this.pageIndex.set(0);
      this.loadFeedbacks();
    });

    this.loadAllForStats();
    this.loadFeedbacks();
  }

  // ── Load ───────────────────────────────────────────────────────────
  private async loadAllForStats(): Promise<void> {
    try {
      const res = await firstValueFrom(this.svc.getFeedbacks({ limit: 100 }));
      this.allFeedbacks.set(this.extractList(res));
    } catch { /* stats degrade gracefully */ }
  }

  protected async loadFeedbacks(): Promise<void> {
    this.isLoading.set(true);
    try {
      const status = this.selectedStatus();
      const filter: FeedbackFilter = {
        ...(status !== 'ALL' ? { status } : {}),
        ...(this.searchQuery() ? { search: this.searchQuery() } : {}),
        limit: 100,
      };
      const res = await firstValueFrom(this.svc.getFeedbacks(filter));
      this.feedbacks.set(this.extractList(res));
    } catch {
      this.snackBar.open('Failed to load feedback. Please try again.', 'Dismiss', { duration: 3500 });
    } finally {
      this.isLoading.set(false);
    }
  }

  private extractList(res: any): Feedback[] {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.feedbacks)) return res.feedbacks;
    return [];
  }

  // ── Filter/search ──────────────────────────────────────────────────
  protected onStatusChange(value: FeedbackStatus | 'ALL'): void {
    this.selectedStatus.set(value);
    this.pageIndex.set(0);
    this.loadFeedbacks();
  }

  protected onSearchInput(value: string): void {
    this.searchSubject.next(value);
  }

  protected onPageChange(e: PageEvent): void {
    this.pageIndex.set(e.pageIndex);
    this.pageSize.set(e.pageSize);
  }

  // ── Drawer ─────────────────────────────────────────────────────────
  protected openDetail(f: Feedback): void {
    this.selectedFeedback.set(f);
    this.drawerOpen.set(true);
  }

  protected closeDrawer(): void {
    this.drawerOpen.set(false);
    setTimeout(() => this.selectedFeedback.set(null), 280);
  }

  // ── Processing state ───────────────────────────────────────────────
  protected isProcessing(id: string): boolean {
    return this.processingIds().has(id);
  }

  private setProcessing(id: string, on: boolean): void {
    this.processingIds.update(set => {
      const next = new Set(set);
      on ? next.add(id) : next.delete(id);
      return next;
    });
  }

  // ── Actions ────────────────────────────────────────────────────────
  protected async approve(f: Feedback): Promise<void> {
    if (!await this.confirm('Approve Feedback', 'Are you sure you want to approve this feedback?', 'Approve')) return;
    this.setProcessing(f.id, true);
    try {
      await firstValueFrom(this.svc.approveFeedback(f.id));
      this.updateRow(f.id, 'APPROVED');
      this.toast('Feedback approved successfully.', 'success');
    } catch { this.toast('Failed to approve feedback.', 'error'); }
    finally  { this.setProcessing(f.id, false); }
  }

  protected async reject(f: Feedback): Promise<void> {
    if (!await this.confirm('Reject Feedback', 'Are you sure you want to reject this feedback?', 'Reject', true)) return;
    this.setProcessing(f.id, true);
    try {
      await firstValueFrom(this.svc.rejectFeedback(f.id));
      this.updateRow(f.id, 'REJECTED');
      this.toast('Feedback rejected.', 'warn');
    } catch { this.toast('Failed to reject feedback.', 'error'); }
    finally  { this.setProcessing(f.id, false); }
  }

  protected async resolve(f: Feedback): Promise<void> {
    if (!await this.confirm('Resolve Feedback', 'Mark this feedback as resolved?', 'Resolve')) return;
    this.setProcessing(f.id, true);
    try {
      await firstValueFrom(this.svc.resolveFeedback(f.id));
      this.updateRow(f.id, 'RESOLVED');
      this.toast('Feedback marked as resolved.', 'success');
    } catch { this.toast('Failed to resolve feedback.', 'error'); }
    finally  { this.setProcessing(f.id, false); }
  }

  protected async remove(f: Feedback): Promise<void> {
    if (!await this.confirm('Delete Feedback', 'Delete this feedback permanently? This cannot be undone.', 'Delete', true)) return;
    this.setProcessing(f.id, true);
    try {
      await firstValueFrom(this.svc.deleteFeedback(f.id));
      this.feedbacks.update(list => list.filter(x => x.id !== f.id));
      this.allFeedbacks.update(list => list.filter(x => x.id !== f.id));
      if (this.selectedFeedback()?.id === f.id) this.closeDrawer();
      this.toast('Feedback deleted.', 'info');
    } catch { this.toast('Failed to delete feedback.', 'error'); }
    finally  { this.setProcessing(f.id, false); }
  }

  // ── Helpers ────────────────────────────────────────────────────────
  private updateRow(id: string, newStatus: FeedbackStatus): void {
    const patch = (list: Feedback[]) =>
      list.map(f => f.id === id ? { ...f, status: newStatus, updatedAt: new Date().toISOString() } : f);
    this.feedbacks.update(patch);
    this.allFeedbacks.update(patch);
    const sel = this.selectedFeedback();
    if (sel?.id === id) this.selectedFeedback.set({ ...sel, status: newStatus });
  }

  private async confirm(
    title: string, message: string, confirmLabel: string, danger = false,
  ): Promise<boolean> {
    const ref = this.dialog.open(AfConfirmDialogComponent, {
      data:         { title, message, confirmLabel, danger } satisfies ConfirmData,
      width:        '400px',
      disableClose: true,
      panelClass:   'af-confirm-panel',
    });
    return firstValueFrom(ref.afterClosed()).then(r => !!r);
  }

  private toast(msg: string, type: 'success' | 'warn' | 'error' | 'info'): void {
    this.snackBar.open(msg, '✕', {
      duration:   3500,
      panelClass: [`af-snack`, `af-snack--${type}`],
    });
  }

  protected stars(rating: number): number[] {
    return [1, 2, 3, 4, 5];
  }

  protected categoryLabel(cat: string): string {
    return FEEDBACK_CATEGORY_LABELS[cat] ?? cat;
  }

  protected statusCfg(status: string) {
    return STATUS_CONFIG[status as FeedbackStatus] ?? STATUS_CONFIG['PENDING'];
  }

  protected rowClass(f: Feedback): string {
    return f.status === 'PENDING' ? 'af-row--pending' : '';
  }
}
