import {
  Component, ChangeDetectionStrategy, Input, Output, EventEmitter, computed, signal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-rating-stars',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [MatIconModule, MatTooltipModule],
  template: `
    <div class="stars" [class.stars--interactive]="interactive" [attr.aria-label]="ariaLabel()"
         role="group">
      @for (star of stars; track star) {
        <button class="star-btn" type="button"
                [disabled]="!interactive"
                [class.star-btn--interactive]="interactive"
                (click)="rate(star)"
                (mouseenter)="hover.set(star)"
                (mouseleave)="hover.set(0)"
                [attr.aria-label]="star + ' star' + (star > 1 ? 's' : '')"
                [matTooltip]="interactive ? labels[star - 1] : ''">
          <mat-icon [class.filled]="star <= displayRating()"
                    [class.half]="!interactive && star - 0.5 <= displayRating() && star > displayRating()">
            {{ getIcon(star) }}
          </mat-icon>
        </button>
      }
      @if (showValue) {
        <span class="stars__value" aria-hidden="true">{{ value }}</span>
      }
    </div>
  `,
  styles: [`
    :host { display: inline-block; }
    .stars { display: inline-flex; align-items: center; gap: 2px; }
    .star-btn {
      background: none; border: none; padding: 2px; cursor: default;
      display: flex; align-items: center; line-height: 1;
      &--interactive { cursor: pointer; }
      &:disabled { cursor: default; }
    }
    mat-icon {
      font-size: 20px; width: 20px; height: 20px;
      color: #ccc; transition: color 0.12s, transform 0.12s;
      &.filled { color: #cc9127; }
      &.half   { color: #cc9127; }
    }
    .stars--interactive .star-btn:hover mat-icon,
    .stars--interactive .star-btn:focus mat-icon { transform: scale(1.2); }
    .stars__value {
      margin-left: 6px; font-size: 0.9rem; font-weight: 700;
      color: var(--suhana-text-primary, #3d2c2e);
    }
    :host([size='large']) mat-icon { font-size: 28px; width: 28px; height: 28px; }
    :host([size='small']) mat-icon { font-size: 16px; width: 16px; height: 16px; }
  `],
})
export class RatingStarsComponent {
  @Input() value = 0;
  @Input() interactive = false;
  @Input() showValue = false;
  @Output() ratingChange = new EventEmitter<number>();

  protected readonly hover = signal(0);
  protected readonly stars = [1, 2, 3, 4, 5];
  protected readonly labels = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

  protected displayRating = computed(() => this.hover() || this.value);

  protected getIcon(star: number): string {
    const d = this.displayRating();
    if (star <= d) return 'star';
    if (star - 0.5 <= d) return 'star_half';
    return 'star_border';
  }

  protected ariaLabel = computed(() =>
    this.interactive
      ? `Rate: ${this.value} of 5 stars`
      : `Rating: ${this.value} of 5 stars`
  );

  protected rate(star: number): void {
    if (!this.interactive) return;
    this.ratingChange.emit(star);
  }
}
