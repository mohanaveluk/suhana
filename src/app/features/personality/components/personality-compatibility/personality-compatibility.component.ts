import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { MaterialModule } from '../../../../shared/modules/material.module';
import {
  COMPATIBILITY_COPY,
  DIMENSION_META,
  DIMENSION_ORDER,
  PERSONALITY_TYPE_CATALOG,
  POLE_LABELS,
} from '../../constants/personality.constants';
import { CompatibilityLevel, DimensionCompatibility, PersonalityCompatibility } from '../../models/personality.model';
import { buildRecommendations } from '../../utils/personality.utils';
import { ScoreRingComponent } from '../score-ring/score-ring.component';
import { TypeBadgeComponent } from '../type-badge/type-badge.component';

/**
 * Presents personality compatibility between two members: score, per-dimension
 * breakdown, communication style, strengths, challenges and recommendations.
 */
@Component({
  selector: 'app-personality-compatibility',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialModule, ScoreRingComponent, TypeBadgeComponent],
  templateUrl: './personality-compatibility.component.html',
  styleUrl: './personality-compatibility.component.scss',
})
export class PersonalityCompatibilityComponent {
  readonly compatibility = input.required<PersonalityCompatibility>();
  readonly nameA = input('You');
  readonly nameB = input('Your match');

  protected readonly level = computed<CompatibilityLevel>(
    () => this.compatibility().compatibilityLevel ?? 'Moderate',
  );
  protected readonly levelCopy = computed(() => COMPATIBILITY_COPY[this.level()]);

  protected readonly typeA = computed(() => this.compatibility().profiles?.[0]?.personalityType ?? '');
  protected readonly typeB = computed(() => this.compatibility().profiles?.[1]?.personalityType ?? '');

  protected readonly breakdown = computed<DimensionCompatibility[]>(() => {
    const byCode = new Map((this.compatibility().dimensionBreakdown ?? []).map(d => [d.dimension, d]));
    return DIMENSION_ORDER.map(code => byCode.get(code)).filter((d): d is DimensionCompatibility => !!d);
  });

  protected readonly recommendations = computed(() => buildRecommendations(this.breakdown()));

  protected typeTitle(code: string): string {
    return PERSONALITY_TYPE_CATALOG[code as keyof typeof PERSONALITY_TYPE_CATALOG]?.title ?? '';
  }

  protected dimensionLabel(d: DimensionCompatibility): string {
    return DIMENSION_META[d.dimension].title;
  }

  protected dimensionColor(d: DimensionCompatibility): string {
    return DIMENSION_META[d.dimension].color;
  }

  protected poleLabel(pole: string): string {
    return POLE_LABELS[pole as keyof typeof POLE_LABELS] ?? pole;
  }
}
