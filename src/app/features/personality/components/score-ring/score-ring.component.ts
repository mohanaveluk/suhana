import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Circular 0–100 gauge used for confidence and compatibility scores. */
@Component({
  selector: 'app-score-ring',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ring" [style.width.px]="size()" [style.height.px]="size()" role="img" [attr.aria-label]="ariaLabel()">
      <svg [attr.viewBox]="'0 0 ' + box + ' ' + box" aria-hidden="true">
        <circle class="ring__track" [attr.cx]="center" [attr.cy]="center" [attr.r]="radius" />
        <circle
          class="ring__value"
          [attr.cx]="center"
          [attr.cy]="center"
          [attr.r]="radius"
          [attr.stroke]="color()"
          [attr.stroke-dasharray]="circumference"
          [attr.stroke-dashoffset]="dashOffset()" />
      </svg>
      <div class="ring__center" aria-hidden="true">
        <span class="ring__value-text">{{ rounded() }}<small>%</small></span>
        @if (label()) {
          <span class="ring__label">{{ label() }}</span>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: inline-block; }
    .ring { position: relative; }
    svg { width: 100%; height: 100%; transform: rotate(-90deg); }
    .ring__track { fill: none; stroke: var(--suhana-rose-gold-lighter); stroke-width: 10; }
    .ring__value {
      fill: none; stroke-width: 10; stroke-linecap: round;
      transition: stroke-dashoffset 900ms cubic-bezier(.2,.8,.2,1);
    }
    .ring__center {
      position: absolute; inset: 0; display: flex; flex-direction: column;
      align-items: center; justify-content: center; text-align: center;
    }
    .ring__value-text { font-size: 2rem; font-weight: 700; color: var(--suhana-maroon); line-height: 1; }
    .ring__value-text small { font-size: 0.9rem; font-weight: 600; margin-left: 1px; }
    .ring__label {
      margin-top: 4px; font-size: 0.72rem; font-weight: 600; letter-spacing: .06em;
      text-transform: uppercase; color: var(--suhana-text-secondary);
    }
    @media (prefers-reduced-motion: reduce) { .ring__value { transition: none; } }
  `],
})
export class ScoreRingComponent {
  readonly value = input.required<number>();
  readonly label = input<string>('');
  readonly color = input<string>('#800020');
  readonly size = input<number>(140);

  protected readonly box = 120;
  protected readonly center = 60;
  protected readonly radius = 50;
  protected readonly circumference = 2 * Math.PI * 50;

  protected readonly rounded = computed(() => Math.round(Math.min(100, Math.max(0, this.value() ?? 0))));
  protected readonly dashOffset = computed(() => this.circumference * (1 - this.rounded() / 100));
  protected readonly ariaLabel = computed(() => `${this.label() || 'Score'}: ${this.rounded()} percent`);
}
