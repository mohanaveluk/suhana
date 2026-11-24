import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialModule } from '../../../../shared/modules/material.module';
import { Paged, ProviderCard } from '../../models/discover.model';
import { DiscoverService } from '../../services/discover.service';
import { apiErrorMessage } from '../../utils/discover.utils';
import { ProviderCardComponent } from '../../components/provider-card/provider-card.component';
import { ContactDialogComponent } from '../../components/contact-dialog/contact-dialog.component';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-discover-favorites',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialModule, RouterLink, ProviderCardComponent],
  template: `
    <div class="df suhana-container">
      <nav class="df__crumbs" aria-label="Breadcrumb">
        <a routerLink="/discover">Aurora Discover</a> <span aria-hidden="true">›</span> <span>Saved</span>
      </nav>
      <h1>Saved services</h1>

      @if (loading()) {
        <div class="df__sk" aria-busy="true" aria-label="Loading saved services"></div>
        <div class="df__sk"></div>
      } @else if (error()) {
        <div class="df__state" role="alert">
          <p>{{ error() }}</p>
          <button mat-stroked-button type="button" (click)="load(page())">Try again</button>
        </div>
      } @else if (data(); as d) {
        @if (!d.items.length && d.total === 0) {
          <div class="df__state">
            <mat-icon aria-hidden="true">bookmark_border</mat-icon>
            <h2>Nothing saved yet</h2>
            <p>Tap the bookmark on any listing to keep it here.</p>
            <a mat-flat-button class="suhana-btn-primary" routerLink="/discover">Explore Aurora Discover</a>
          </div>
        } @else {
          @if (d.items.length < d.total && d.totalPages === 1) {
            <p class="df__muted">Some saved listings are no longer available and are hidden.</p>
          }
          <div class="df__list" aria-live="polite">
            @for (p of d.items; track p.id; let i = $index) {
              <app-provider-card [provider]="p" [index]="i" [favoriteBusy]="busy() === p.id"
                                 (favoriteToggled)="remove($event)" (contactRequested)="contact($event)" />
            }
          </div>
          @if (d.totalPages > 1) {
            <nav class="df__pager" aria-label="Pages">
              <button mat-button type="button" [disabled]="d.page <= 1" (click)="load(d.page - 1)">Previous</button>
              <span class="df__muted">Page {{ d.page }} of {{ d.totalPages }}</span>
              <button mat-button type="button" [disabled]="d.page >= d.totalPages" (click)="load(d.page + 1)">Next</button>
            </nav>
          }
        }
      }
    </div>
  `,
  styles: [`
    :host { display: block; background: var(--suhana-ivory-warm); min-height: 100%; }
    .df { padding: 16px 16px 48px; max-width: 960px; }
    .df h1 { color: var(--suhana-maroon); margin: 8px 0 16px; }
    .df__crumbs { font-size: 13px; color: var(--suhana-text-secondary);
      a { color: var(--suhana-maroon); text-decoration: none; } a:hover { text-decoration: underline; } }
    .df__list { display: flex; flex-direction: column; gap: 16px; }
    .df__state { text-align: center; padding: 40px 16px; background: #fff; border-radius: 16px;
      mat-icon { font-size: 48px; width: 48px; height: 48px; color: var(--suhana-rose-gold); }
      h2 { color: var(--suhana-maroon); margin: 8px 0 4px; } }
    .df__muted { color: var(--suhana-text-secondary); font-size: 13px; }
    .df__pager { display: flex; justify-content: center; align-items: center; gap: 12px; margin-top: 20px; }
    .df__sk { height: 180px; border-radius: 16px; margin-bottom: 16px;
      background: linear-gradient(90deg, #f6eeee 25%, #fbf6f6 37%, #f6eeee 63%); background-size: 400% 100%;
      animation: df-sh 1.4s ease infinite; }
    @keyframes df-sh { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }
    @media (prefers-reduced-motion: reduce) { .df__sk { animation: none; } }
  `],
})
export class DiscoverFavoritesPage implements OnInit {
  private readonly discover = inject(DiscoverService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  protected readonly data = signal<Paged<ProviderCard> | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly page = signal(1);
  protected readonly busy = signal<string | null>(null);

  ngOnInit(): void {
    void this.load(1);
  }

  protected async load(page: number): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.page.set(page);
    try {
      this.data.set(await this.discover.getFavorites(page, PAGE_SIZE));
    } catch (err) {
      this.error.set(apiErrorMessage(err, 'Could not load your saved services.'));
    } finally {
      this.loading.set(false);
    }
  }

  /** Optimistic removal with rollback. */
  protected async remove(p: ProviderCard): Promise<void> {
    const before = this.data();
    if (!before) return;
    this.busy.set(p.id);
    this.data.set({ ...before, items: before.items.filter((i) => i.id !== p.id), total: before.total - 1 });
    try {
      await this.discover.toggleFavorite({ id: p.id, isFavorite: true });
      this.snack.open('Removed from your list', 'OK', { duration: 2500 });
    } catch (e) {
      this.data.set(before);
      this.snack.open((e as Error).message, 'OK', { duration: 4000 });
    } finally {
      this.busy.set(null);
    }
  }

  protected async contact(p: ProviderCard): Promise<void> {
    try {
      const contact = await this.discover.getContact(p.id);
      this.dialog.open(ContactDialogComponent, { data: { name: p.displayName, contact }, width: '440px', maxWidth: '95vw' });
    } catch (err) {
      this.snack.open(apiErrorMessage(err, 'Could not load contact details.'), 'OK', { duration: 4000 });
    }
  }
}
