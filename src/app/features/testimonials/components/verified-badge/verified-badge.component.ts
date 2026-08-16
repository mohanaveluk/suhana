import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

type BadgeVariant = 'review' | 'marriage';

@Component({
  selector: 'app-verified-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [MatIconModule, MatTooltipModule],
  template: `
    @if (isPremium || isSuccessStory) {
      <!-- Multi-credential group -->
      <div class="badge-group" [class.badge-group--inline]="!showLabel">
        @if (show) {
          <span class="badge" matTooltip="Verified member review" role="img" aria-label="Verified member">
            <mat-icon aria-hidden="true">verified</mat-icon>
            @if (showLabel) { <span>Verified Member</span> }
          </span>
        }
        @if (isPremium) {
          <span class="badge badge--premium" matTooltip="Premium member" role="img" aria-label="Premium member">
            <mat-icon aria-hidden="true">star</mat-icon>
            @if (showLabel) { <span>Premium</span> }
          </span>
        }
        @if (isSuccessStory) {
          <span class="badge badge--story" matTooltip="Success story contributor" role="img" aria-label="Success story contributor">
            <mat-icon aria-hidden="true">favorite</mat-icon>
            @if (showLabel) { <span>Success Story</span> }
          </span>
        }
      </div>
    } @else if (show) {
      <!-- Single badge — backward-compatible -->
      <span class="badge" [class.badge--marriage]="variant === 'marriage'"
            [matTooltip]="tooltip" role="img" [attr.aria-label]="tooltip">
        <mat-icon aria-hidden="true">{{ icon }}</mat-icon>
        @if (showLabel) { <span>{{ label }}</span> }
      </span>
    }
  `,
  styles: [`
    .badge-group {
      display: flex; flex-direction: column; gap: 4px;
      &--inline { flex-direction: row; }
    }
    .badge {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 3px 10px 3px 6px; border-radius: 20px;
      background: rgba(46,125,50,.1); border: 1px solid rgba(46,125,50,.3);
      font-size: 0.75rem; font-weight: 600; color: #2e7d32;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }

      &--marriage {
        background: rgba(201,168,76,.12); border-color: rgba(201,168,76,.35);
        color: #7a5c00;
        mat-icon { color: #c9a84c; }
      }
      &--premium {
        background: rgba(201,168,76,.12); border-color: rgba(201,168,76,.35);
        color: #7a5c00;
        mat-icon { color: #c9a84c; }
      }
      &--story {
        background: rgba(128,0,32,.08); border-color: rgba(183,110,121,.3);
        color: #800020;
        mat-icon { color: #b76e79; }
      }
    }
  `],
})
export class VerifiedBadgeComponent {
  @Input() show = false;
  @Input() variant: BadgeVariant = 'review';
  @Input() showLabel = true;
  @Input() isPremium = false;
  @Input() isSuccessStory = false;

  get icon(): string  { return this.variant === 'marriage' ? 'workspace_premium' : 'verified'; }
  get label(): string { return this.variant === 'marriage' ? 'Verified Marriage' : 'Verified'; }
  get tooltip(): string {
    return this.variant === 'marriage'
      ? 'Marriage certificate verified by Aurora team'
      : 'Verified member review';
  }
}
