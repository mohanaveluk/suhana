import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, firstValueFrom } from 'rxjs';
import { MaterialModule } from '../../../shared/modules/material.module';
import { ApiService } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import { AdminLayoutComponent } from '../../../pages/admin/layout/admin-layout.component';
import {
  AdminProviderQuery, AdminProviderSummary, AdminReview, CountryCode, DiscoverCategory, Paged, ReviewStatus,
  VerificationStatus,
} from '../models/discover.model';
import { VERIFICATION_LABELS, apiErrorMessage } from '../utils/discover.utils';

export interface NoteDialogData {
  title: string;
  message: string;
  confirm: string;
  noteRequired: boolean;
  warn?: boolean;
}

/** Confirmation with an (optionally required) note — used for verification and moderation decisions. */
@Component({
  selector: 'app-discover-note-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialModule, FormsModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <p>{{ data.message }}</p>
      <mat-form-field appearance="outline" class="nd__full">
        <mat-label>{{ data.noteRequired ? 'Reason (required, internal)' : 'Note (optional, internal)' }}</mat-label>
        <textarea matInput rows="3" maxlength="500" [(ngModel)]="note"></textarea>
      </mat-form-field>
      @if (tried() && data.noteRequired && !note.trim()) { <mat-error>Please add a reason.</mat-error> }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="ref.close()">Cancel</button>
      <button mat-flat-button type="button" [color]="data.warn ? 'warn' : 'primary'" (click)="ok()">{{ data.confirm }}</button>
    </mat-dialog-actions>
  `,
  styles: ['.nd__full { width: 100%; }'],
})
export class NoteDialogComponent {
  protected readonly data = inject<NoteDialogData>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<NoteDialogComponent, { note: string } | undefined>);
  protected note = '';
  protected readonly tried = signal(false);
  protected ok(): void {
    this.tried.set(true);
    if (this.data.noteRequired && !this.note.trim()) return;
    this.ref.close({ note: this.note.trim() });
  }
}

@Component({
  selector: 'app-admin-discover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialModule, FormsModule, RouterLink, DatePipe, AdminLayoutComponent],
  templateUrl: './admin-discover.page.html',
  styleUrl: './admin-discover.page.scss',
})
export class AdminDiscoverPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  protected readonly statusLabels = VERIFICATION_LABELS;
  protected readonly statuses = Object.keys(VERIFICATION_LABELS) as VerificationStatus[];

  // Listings
  protected filters: AdminProviderQuery = { q: '', status: undefined, country: undefined, category: undefined, includeDeleted: false, page: 1, limit: 20 };
  protected readonly providers = signal<Paged<AdminProviderSummary> | null>(null);
  protected readonly providersLoading = signal(false);
  protected readonly providersError = signal<string | null>(null);
  protected readonly busyId = signal<string | null>(null);

  // Reviews
  protected reviewStatus: ReviewStatus | '' = 'PENDING';
  protected readonly reviews = signal<Paged<AdminReview> | null>(null);
  protected readonly reviewsLoading = signal(false);
  protected readonly reviewsError = signal<string | null>(null);

  // Categories
  protected readonly categories = signal<DiscoverCategory[]>([]);
  protected readonly categoriesError = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    // <app-admin-layout> renders the denied state; don't fire admin calls for non-admins.
    await this.auth.loadRole();
    if (!this.auth.isAdmin()) return;
    void this.loadProviders();
    void this.loadReviews(1);
    void this.loadCategories();
  }

  // ── Listings ────────────────────────────────────────────────────────────

  protected async loadProviders(page = this.filters.page ?? 1): Promise<void> {
    this.filters = { ...this.filters, page };
    this.providersLoading.set(true);
    this.providersError.set(null);
    try {
      const q: AdminProviderQuery = { ...this.filters, q: this.filters.q?.trim() || undefined };
      this.providers.set(await firstValueFrom(this.api.getAdminDiscoverProviders(q)));
    } catch (err) {
      this.providersError.set(apiErrorMessage(err, 'Could not load listings.'));
    } finally {
      this.providersLoading.set(false);
    }
  }

  protected setCountry(c: CountryCode | ''): void {
    this.filters = { ...this.filters, country: c || undefined };
    void this.loadProviders(1);
  }

  protected async setVerification(p: AdminProviderSummary, status: VerificationStatus): Promise<void> {
    const needsNote = status === 'REJECTED' || status === 'SUSPENDED';
    const res = await firstValueFrom(this.dialog.open(NoteDialogComponent, {
      width: '460px', maxWidth: '95vw',
      data: {
        title: `${this.statusLabels[status]}: ${p.displayName}`,
        message: status === 'VERIFIED'
          ? 'Confirm you have checked this business’s identity and contact details. Members will see a “Verified listing” badge.'
          : needsNote
            ? 'The listing will be hidden from members until it is set back to Pending or Verified.'
            : 'The listing stays visible without a verified badge.',
        confirm: `Set ${this.statusLabels[status].toLowerCase()}`,
        noteRequired: needsNote,
        warn: needsNote,
      } satisfies NoteDialogData,
    }).afterClosed());
    if (!res) return;
    this.busyId.set(p.id);
    try {
      await firstValueFrom(this.api.setAdminDiscoverVerification(p.id, status, res.note || null));
      this.snack.open('Verification updated', 'OK', { duration: 2500 });
      await this.loadProviders();
    } catch (err) {
      this.snack.open(apiErrorMessage(err, 'Could not update verification.'), 'OK', { duration: 5000 });
    } finally {
      this.busyId.set(null);
    }
  }

  protected async remove(p: AdminProviderSummary): Promise<void> {
    const res = await firstValueFrom(this.dialog.open(NoteDialogComponent, {
      width: '440px', maxWidth: '95vw',
      data: {
        title: `Delete ${p.displayName}?`,
        message: 'The listing is hidden from members and can be restored later from “Show deleted”.',
        confirm: 'Delete', noteRequired: false, warn: true,
      } satisfies NoteDialogData,
    }).afterClosed());
    if (!res) return;
    await this.run(p.id, () => this.api.deleteAdminDiscoverProvider(p.id), 'Listing deleted');
  }

  protected async restore(p: AdminProviderSummary): Promise<void> {
    await this.run(p.id, () => this.api.restoreAdminDiscoverProvider(p.id), 'Listing restored');
  }

  private async run(id: string, call: () => Observable<unknown>, ok: string): Promise<void> {
    this.busyId.set(id);
    try {
      await firstValueFrom(call());
      this.snack.open(ok, 'OK', { duration: 2500 });
      await this.loadProviders();
    } catch (err) {
      this.snack.open(apiErrorMessage(err, 'Action failed.'), 'OK', { duration: 5000 });
    } finally {
      this.busyId.set(null);
    }
  }

  // ── Reviews ─────────────────────────────────────────────────────────────

  protected async loadReviews(page: number): Promise<void> {
    this.reviewsLoading.set(true);
    this.reviewsError.set(null);
    try {
      this.reviews.set(await firstValueFrom(this.api.getAdminDiscoverReviews({
        status: this.reviewStatus || undefined, page, limit: 20,
      })));
    } catch (err) {
      this.reviewsError.set(apiErrorMessage(err, 'Could not load reviews.'));
    } finally {
      this.reviewsLoading.set(false);
    }
  }

  protected async moderate(r: AdminReview, status: ReviewStatus): Promise<void> {
    let note: string | null = null;
    if (status !== 'APPROVED') {
      const res = await firstValueFrom(this.dialog.open(NoteDialogComponent, {
        width: '440px', maxWidth: '95vw',
        data: {
          title: status === 'REJECTED' ? 'Reject review' : 'Hide review',
          message: 'The review will not be shown to members and won’t count towards the rating.',
          confirm: status === 'REJECTED' ? 'Reject' : 'Hide', noteRequired: false, warn: true,
        } satisfies NoteDialogData,
      }).afterClosed());
      if (!res) return;
      note = res.note || null;
    }
    this.busyId.set(r.id);
    try {
      await firstValueFrom(this.api.moderateAdminDiscoverReview(r.id, status, note));
      this.snack.open(`Review ${status.toLowerCase()}`, 'OK', { duration: 2500 });
      await this.loadReviews(this.reviews()?.page ?? 1);
    } catch (err) {
      this.snack.open(apiErrorMessage(err, 'Could not moderate the review.'), 'OK', { duration: 5000 });
    } finally {
      this.busyId.set(null);
    }
  }

  // ── Categories ──────────────────────────────────────────────────────────

  protected async loadCategories(): Promise<void> {
    this.categoriesError.set(null);
    try {
      this.categories.set(await firstValueFrom(this.api.getAdminDiscoverCategories()));
    } catch (err) {
      this.categoriesError.set(apiErrorMessage(err, 'Could not load categories.'));
    }
  }

  protected async toggleCategory(c: DiscoverCategory, isActive: boolean): Promise<void> {
    try {
      const saved = await firstValueFrom(this.api.updateAdminDiscoverCategory(c.id, { isActive }));
      this.categories.update((list) => list.map((x) => (x.id === c.id ? saved : x)));
      this.snack.open(`${c.name} ${isActive ? 'is live' : 'set to coming soon'}`, 'OK', { duration: 3000 });
    } catch (err) {
      this.snack.open(apiErrorMessage(err, 'Could not update the category.'), 'OK', { duration: 5000 });
      await this.loadCategories();
    }
  }
}
