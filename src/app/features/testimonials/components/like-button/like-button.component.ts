import {
  Component, ChangeDetectionStrategy, Input, Output, EventEmitter, signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-like-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <button mat-button class="like-btn" [class.like-btn--liked]="_liked()"
            (click)="toggle()"
            [attr.aria-pressed]="_liked()"
            [attr.aria-label]="_liked() ? 'Unlike this review' : 'Like this review'"
            [matTooltip]="_liked() ? 'Remove like' : 'Mark as helpful'"
            [disabled]="disabled">
      <mat-icon aria-hidden="true">{{ _liked() ? 'favorite' : 'favorite_border' }}</mat-icon>
      @if (_count() > 0) { <span>{{ _count() }}</span> }
    </button>
  `,
  styles: [`
    .like-btn {
      display: inline-flex; align-items: center; gap: 4px;
      min-width: 0; padding: 4px 8px; border-radius: 20px !important;
      color: var(--suhana-text-secondary, #6b5557);
      font-size: 0.82rem; font-weight: 500;
      transition: color 0.15s, background 0.15s;
      &--liked { color: #c62828 !important; }
      &:hover { background: rgba(183,110,121,.08); }
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }
  `],
})
export class LikeButtonComponent {
  @Input() set liked(v: boolean)    { this._liked.set(v); }
  @Input() set likeCount(v: number) { this._count.set(v); }
  @Input() disabled = false;
  @Output() likeToggle = new EventEmitter<boolean>();

  protected readonly _liked = signal(false);
  protected readonly _count = signal(0);

  protected toggle(): void {
    const next = !this._liked();
    this._liked.set(next);
    this._count.update(c => next ? c + 1 : Math.max(0, c - 1));
    this.likeToggle.emit(next);
  }
}
