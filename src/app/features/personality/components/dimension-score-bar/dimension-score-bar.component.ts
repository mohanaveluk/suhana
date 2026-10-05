import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { DIMENSION_META, POLE_LABELS } from '../../constants/personality.constants';
import { DimensionScore } from '../../models/personality.model';

/** Two-sided bar showing the share of each pole on one dimension. */
@Component({
  selector: 'app-dimension-score-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let v = view();
    <div class="dsb">
      <div class="dsb__head">
        <span class="dsb__title">{{ v.title }}</span>
        <span class="dsb__code">{{ v.code }}</span>
      </div>
      <div class="dsb__poles">
        <span class="dsb__pole" [class.dsb__pole--dominant]="v.leftDominant">
          <strong>{{ v.leftPole }}</strong> {{ v.leftLabel }} <em>{{ v.leftPct }}%</em>
        </span>
        <span class="dsb__pole dsb__pole--right" [class.dsb__pole--dominant]="!v.leftDominant">
          <em>{{ v.rightPct }}%</em> {{ v.rightLabel }} <strong>{{ v.rightPole }}</strong>
        </span>
      </div>
      <div class="dsb__track" role="img" [attr.aria-label]="v.aria">
        <span class="dsb__fill dsb__fill--left" [style.width.%]="v.leftPct"
              [style.background]="v.leftDominant ? v.color : null"></span>
        <span class="dsb__fill dsb__fill--right" [style.width.%]="v.rightPct"
              [style.background]="!v.leftDominant ? v.color : null"></span>
      </div>
      @if (showRaw()) {
        <div class="dsb__raw">Points — {{ v.leftPole }}: {{ v.leftRaw }} · {{ v.rightPole }}: {{ v.rightRaw }}</div>
      }
    </div>
  `,
  styles: [`
    .dsb { display: flex; flex-direction: column; gap: 6px; }
    .dsb__head { display: flex; justify-content: space-between; align-items: baseline; }
    .dsb__title { font-weight: 600; color: var(--suhana-text-primary); font-size: 0.95rem; }
    .dsb__code {
      font-size: 0.7rem; font-weight: 700; letter-spacing: .08em; color: var(--suhana-text-secondary);
      background: var(--suhana-blush); border-radius: 10px; padding: 2px 8px;
    }
    .dsb__poles { display: flex; justify-content: space-between; gap: 8px; font-size: 0.85rem; color: var(--suhana-text-secondary); }
    .dsb__pole em { font-style: normal; font-weight: 600; }
    .dsb__pole--dominant { color: var(--suhana-maroon); font-weight: 600; }
    .dsb__track {
      display: flex; height: 12px; border-radius: 999px; overflow: hidden;
      background: var(--suhana-rose-gold-lighter);
    }
    .dsb__fill { height: 100%; background: var(--suhana-rose-gold-lighter); transition: width 700ms ease; }
    .dsb__fill--left { border-right: 2px solid #fff; }
    .dsb__raw { font-size: 0.75rem; color: var(--suhana-text-secondary); }
    @media (prefers-reduced-motion: reduce) { .dsb__fill { transition: none; } }
  `],
})
export class DimensionScoreBarComponent {
  readonly score = input.required<DimensionScore>();
  readonly showRaw = input(false);

  protected readonly view = computed(() => {
    const s = this.score();
    const meta = DIMENSION_META[s.dimension];
    const [left, right] = meta.poles;
    const leftPct = s.percentages?.[left] ?? 50;
    const rightPct = s.percentages?.[right] ?? 100 - leftPct;
    return {
      title: meta.label,
      code: s.dimension,
      color: meta.color,
      leftPole: left,
      rightPole: right,
      leftLabel: POLE_LABELS[left],
      rightLabel: POLE_LABELS[right],
      leftPct,
      rightPct,
      leftRaw: s.scores?.[left] ?? 0,
      rightRaw: s.scores?.[right] ?? 0,
      leftDominant: s.dominant === left,
      aria: `${meta.label}: ${POLE_LABELS[left]} ${leftPct} percent, ${POLE_LABELS[right]} ${rightPct} percent. Preference: ${s.dominantLabel}.`,
    };
  });
}
