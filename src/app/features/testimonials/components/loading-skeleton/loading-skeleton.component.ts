import { Component, ChangeDetectionStrategy, Input } from '@angular/core';

@Component({
  selector: 'app-loading-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  template: `
    <div class="skeleton-grid" [attr.aria-busy]="true" aria-label="Loading…">
      @for (_ of items; track $index) {
        <div class="skeleton-card">
          <div class="skeleton-row">
            <div class="sk sk--avatar"></div>
            <div class="sk-group">
              <div class="sk sk--name"></div>
              <div class="sk sk--date"></div>
            </div>
          </div>
          <div class="sk sk--stars"></div>
          <div class="sk sk--title"></div>
          <div class="sk sk--line"></div>
          <div class="sk sk--line sk--line-short"></div>
          <div class="sk sk--actions"></div>
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes shimmer {
      0%   { background-position: -400px 0; }
      100% { background-position: 400px 0; }
    }
    .sk {
      border-radius: 6px;
      background: linear-gradient(90deg, #f0d4d8 25%, #fde8e8 50%, #f0d4d8 75%);
      background-size: 800px 100%;
      animation: shimmer 1.4s infinite;
    }
    .skeleton-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
    .skeleton-card {
      padding: 20px; border-radius: 16px;
      border: 1px solid #f0d4d8; background: white;
      display: flex; flex-direction: column; gap: 10px;
    }
    .skeleton-row { display: flex; align-items: center; gap: 12px; }
    .sk-group     { flex: 1; display: flex; flex-direction: column; gap: 6px; }
    .sk--avatar   { width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0; }
    .sk--name     { height: 14px; width: 60%; }
    .sk--date     { height: 10px; width: 35%; }
    .sk--stars    { height: 16px; width: 100px; }
    .sk--title    { height: 16px; width: 75%; }
    .sk--line     { height: 12px; }
    .sk--line-short { width: 55%; }
    .sk--actions  { height: 28px; width: 140px; margin-top: 4px; border-radius: 20px; }
  `],
})
export class LoadingSkeletonComponent {
  @Input() count = 6;
  protected get items() { return Array(this.count); }
}
