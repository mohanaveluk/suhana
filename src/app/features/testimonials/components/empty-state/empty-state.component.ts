import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [MatIconModule, MatButtonModule],
  template: `
    <div class="empty" role="status">
      <div class="empty__icon-wrap" aria-hidden="true">
        <mat-icon>{{ icon }}</mat-icon>
      </div>
      <h3 class="empty__title">{{ title }}</h3>
      <p class="empty__message">{{ message }}</p>
      @if (actionLabel) {
        <button mat-raised-button class="suhana-btn-primary empty__btn"
                (click)="action.emit()">{{ actionLabel }}</button>
      }
    </div>
  `,
  styles: [`
    .empty {
      display: flex; flex-direction: column; align-items: center; text-align: center;
      padding: 48px 24px; gap: 12px;
    }
    .empty__icon-wrap {
      width: 80px; height: 80px; border-radius: 50%;
      background: var(--suhana-rose-gold-lighter, #f0d4d8);
      display: flex; align-items: center; justify-content: center;
      mat-icon { font-size: 2.5rem; width: 2.5rem; height: 2.5rem; color: var(--suhana-maroon, #800020); }
    }
    .empty__title { font-size: 1.2rem; font-weight: 700; color: var(--suhana-maroon, #800020); margin: 0; }
    .empty__message { font-size: 0.9rem; color: var(--suhana-text-secondary, #6b5557); margin: 0; max-width: 360px; line-height: 1.6; }
    .empty__btn { margin-top: 8px; }
  `],
})
export class EmptyStateComponent {
  @Input() icon  = 'inbox';
  @Input() title = 'Nothing here yet';
  @Input() message = '';
  @Input() actionLabel = '';
  @Output() action = new EventEmitter<void>();
}
