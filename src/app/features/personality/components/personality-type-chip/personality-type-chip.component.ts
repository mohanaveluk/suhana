import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { PERSONALITY_TYPE_CATALOG } from '../../constants/personality.constants';
import { PersonalityTypeCode } from '../../models/personality.model';

/**
 * Compact "INFJ · The Counselor" pill for profile cards (search results etc.).
 * Renders nothing — and collapses its host — when the member hasn't taken the
 * assessment or the type is unrecognised, so cards without a type are unchanged.
 */
@Component({
  selector: 'app-personality-type-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, MatTooltipModule],
  host: { '[style.display]': "info() ? null : 'none'" },
  template: `
    @if (info(); as t) {
      <span class="ptc" [class.ptc--overlay]="variant() === 'overlay'"
            [matTooltip]="t.title + ' — ' + t.tagline + '. From the Aurora Personality Assessment.'"
            matTooltipPosition="above">
        <mat-icon aria-hidden="true">psychology</mat-icon>
        <span class="ptc__code">{{ t.code }}</span>
        <span class="ptc__title">· {{ t.title }}</span>
      </span>
    }
  `,
  styles: [`
    :host { display: inline-flex; max-width: 100%; }
    .ptc {
      display: inline-flex; align-items: center; gap: 4px; max-width: 100%;
      padding: 3px 10px 3px 6px; border-radius: 999px;
      background: var(--suhana-blush); color: var(--suhana-maroon);
      font-size: 0.75rem; font-weight: 600; line-height: 1.4; white-space: nowrap;
      mat-icon { font-size: 15px; width: 15px; height: 15px; flex: 0 0 auto; }
    }
    .ptc__code { font-weight: 800; letter-spacing: .03em; }
    .ptc__title { overflow: hidden; text-overflow: ellipsis; min-width: 0; }
    .ptc--overlay {
      background: rgba(255, 255, 255, 0.94);
      box-shadow: 0 2px 10px rgba(61, 44, 46, 0.22);
      backdrop-filter: blur(4px);
    }
  `],
})
export class PersonalityTypeChipComponent {
  readonly type = input<string | null | undefined>(null);
  /** 'overlay' sits on a photo; 'inline' sits in text content. */
  readonly variant = input<'overlay' | 'inline'>('inline');

  protected readonly info = computed(() => {
    const code = (this.type() ?? '').toUpperCase() as PersonalityTypeCode;
    const entry = PERSONALITY_TYPE_CATALOG[code];
    return entry ? { code, ...entry } : null;
  });
}
