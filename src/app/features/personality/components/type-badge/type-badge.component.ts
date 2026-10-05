import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { DIMENSION_META, POLE_DIMENSION, POLE_LABELS } from '../../constants/personality.constants';
import { PersonalityPole } from '../../models/personality.model';

/** Four colour-coded letter tiles for a personality type, e.g. I · N · F · J. */
@Component({
  selector: 'app-type-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tb" [class.tb--sm]="size() === 'sm'" [class.tb--lg]="size() === 'lg'"
         role="img" [attr.aria-label]="ariaLabel()">
      @for (letter of letters(); track $index) {
        <span class="tb__tile" [style.background]="letter.color" aria-hidden="true">
          <span class="tb__letter">{{ letter.pole }}</span>
          @if (showLabels()) {
            <span class="tb__caption">{{ letter.label }}</span>
          }
        </span>
      }
    </div>
  `,
  styles: [`
    :host { display: inline-block; }
    .tb { display: inline-flex; gap: 8px; }
    .tb__tile {
      display: inline-flex; flex-direction: column; align-items: center; justify-content: center;
      min-width: 64px; padding: 10px 8px 8px; border-radius: 16px; color: #fff;
      box-shadow: 0 6px 16px var(--suhana-shadow);
    }
    .tb__letter { font-size: 2.2rem; font-weight: 800; line-height: 1; letter-spacing: .02em; }
    .tb__caption { margin-top: 6px; font-size: 0.68rem; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; opacity: .95; }
    .tb--lg .tb__tile { min-width: 84px; padding: 14px 10px 10px; border-radius: 20px; }
    .tb--lg .tb__letter { font-size: 3rem; }
    .tb--sm { gap: 4px; }
    .tb--smm .tb__tile { min-width: 30px; padding: 5px 6px; border-radius: 8px; box-shadow: none; }
    .tb--sm .tb__tile { min-width: 20px; border-radius: 50px; box-shadow: none; }
    .tb--sm .tb__letter { font-size: 1rem; }
    @media (max-width: 480px) {
      .tb--lg .tb__tile { min-width: 64px; }
      .tb--lg .tb__letter { font-size: 2.2rem; }
      .tb__caption { font-size: 0.6rem; }
    }
  `],
})
export class TypeBadgeComponent {
  readonly type = input.required<string>();
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly showLabels = input(false);

  protected readonly letters = computed(() =>
    (this.type() ?? '').split('').map(ch => {
      const pole = ch as PersonalityPole;
      const dimension = POLE_DIMENSION[pole];
      return {
        pole,
        label: POLE_LABELS[pole] ?? '',
        color: dimension ? DIMENSION_META[dimension].color : 'var(--suhana-maroon)',
      };
    }),
  );

  protected readonly ariaLabel = computed(
    () => `Personality type ${this.type()}: ${this.letters().map(l => l.label).join(', ')}`,
  );
}
