import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/** Read-only star rating. Renders "No reviews yet" when there is no average — never a made-up score. */
@Component({
  selector: 'app-rating-stars',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    @if (average() !== null) {
      <span class="rs" [attr.aria-label]="label()" role="img">
        @for (s of stars(); track $index) {
          <mat-icon class="rs__star" aria-hidden="true">{{ s }}</mat-icon>
        }
        <span class="rs__value" aria-hidden="true">{{ average()!.toFixed(1) }}</span>
        @if (showCount()) {
          <span class="rs__count" aria-hidden="true">({{ count() }})</span>
        }
      </span>
    } @else {
      <span class="rs rs--none">No reviews yet</span>
    }
  `,
  styles: [`
    :host { display: inline-flex; }
    .rs { display: inline-flex; align-items: center; gap: 1px; font-size: 13px; color: var(--suhana-text-secondary); }
    .rs__star { font-size: 16px; width: 16px; height: 16px; color: var(--suhana-gold); }
    .rs__value { margin-left: 4px; font-weight: 600; color: var(--suhana-text-primary); }
    .rs__count { margin-left: 2px; }
    .rs--none { font-style: italic; }
  `],
})
export class RatingStarsComponent {
  readonly average = input<number | null>(null);
  readonly count = input(0);
  readonly showCount = input(true);

  protected readonly stars = computed(() => {
    const a = this.average() ?? 0;
    return [1, 2, 3, 4, 5].map((i) => (a >= i - 0.25 ? 'star' : a >= i - 0.75 ? 'star_half' : 'star_border'));
  });

  protected readonly label = computed(() => {
    const a = this.average();
    const n = this.count();
    return a === null ? 'No reviews yet' : `Rated ${a.toFixed(1)} out of 5 from ${n} review${n === 1 ? '' : 's'}`;
  });
}
