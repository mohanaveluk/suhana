import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';

import { MaterialModule } from '../../../../shared/modules/material.module';
import { CONFIDENCE_COPY, DIMENSION_META, DIMENSION_ORDER, PERSONALITY_TYPE_CATALOG } from '../../constants/personality.constants';
import { AssessmentResult, ConfidenceLevel, DimensionScore } from '../../models/personality.model';
import { DimensionScoreBarComponent } from '../dimension-score-bar/dimension-score-bar.component';
import { ScoreRingComponent } from '../score-ring/score-ring.component';
import { TypeBadgeComponent } from '../type-badge/type-badge.component';

/**
 * Presents a completed assessment: personality type, dimension scores,
 * confidence and the personality description/insights.
 */
@Component({
  selector: 'app-personality-result',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialModule, DatePipe, TypeBadgeComponent, DimensionScoreBarComponent, ScoreRingComponent],
  templateUrl: './personality-result.component.html',
  styleUrl: './personality-result.component.scss',
})
export class PersonalityResultComponent {
  readonly result = input.required<AssessmentResult>();
  /** "You" for the member's own result, otherwise the other member's first name. */
  readonly subjectName = input<string | null>(null);
  readonly showRawScores = input(false);

  protected readonly isOwn = computed(() => !this.subjectName());

  protected readonly typeTitle = computed(() => {
    const r = this.result();
    return r.insights?.title ?? (r.personalityType ? PERSONALITY_TYPE_CATALOG[r.personalityType]?.title : '') ?? '';
  });

  /** Dimension scores in canonical E/I-S/N-T/F-J/P order, tolerant of a missing dimension. */
  protected readonly dimensions = computed<DimensionScore[]>(() => {
    const byCode = new Map((this.result().dimensions ?? []).map(d => [d.dimension, d]));
    return DIMENSION_ORDER.map(code => byCode.get(code)).filter((d): d is DimensionScore => !!d);
  });

  protected readonly confidenceLevel = computed<ConfidenceLevel>(() => this.result().confidence?.level ?? 'Low');
  protected readonly confidenceCopy = computed(() => CONFIDENCE_COPY[this.confidenceLevel()]);

  protected readonly heading = computed(() =>
    this.isOwn() ? 'Your personality type' : `${this.subjectName()}'s personality type`,
  );

  protected dimensionIcon(d: DimensionScore): string {
    return DIMENSION_META[d.dimension].icon;
  }

  protected dimensionTitle(d: DimensionScore): string {
    return DIMENSION_META[d.dimension].title;
  }
}
