import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MaterialModule } from '../../../../shared/modules/material.module';
import { DIMENSION_ORDER, PERSONALITY_TYPE_CATALOG } from '../../constants/personality.constants';
import { AssessmentResult, DimensionScore } from '../../models/personality.model';
import { DimensionScoreBarComponent } from '../dimension-score-bar/dimension-score-bar.component';
import { TypeBadgeComponent } from '../type-badge/type-badge.component';

/** Compact summary of one member's personality result, for embedding in profile pages. */
@Component({
  selector: 'app-personality-profile-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialModule, RouterLink, TypeBadgeComponent, DimensionScoreBarComponent],
  template: `
    @let r = result();
    <section class="ppcard" [attr.aria-label]="heading()">
      <header class="ppcard__head">
        <app-type-badge [type]="r.personalityType ?? ''" [showLabels]="true" />
        <div class="ppcard__title-wrap">
          <p class="ppcard__eyebrow">{{ heading() }}</p>
          <h3 class="ppcard__title">{{ r.personalityType }} · {{ title() }}</h3>
          @if (r.confidence) {
            <span class="ppcard__confidence">{{ r.confidence.level }} confidence</span>
          }
        </div>
      </header>

      @if (r.insights?.summary) {
        <p class="ppcard__summary">{{ r.insights?.summary }}</p>
      }

      <div class="ppcard__dims">
        @for (d of dimensions(); track d.dimension) {
          <app-dimension-score-bar [score]="d" />
        }
      </div>

      @if (r.insights; as insights) {
        <div class="ppcard__strengths" aria-label="Strengths">
          @for (s of insights.strengths; track s) {
            <span class="ppcard__chip"><mat-icon aria-hidden="true">star</mat-icon>{{ s }}</span>
          }
        </div>
        <blockquote class="ppcard__relationship">
          <mat-icon aria-hidden="true">favorite</mat-icon>
          <span>{{ insights.inRelationships }}</span>
        </blockquote>
      }

      @if (detailsLink(); as link) {
        <a mat-button class="ppcard__link" [routerLink]="link" [queryParams]="detailsQuery()">
          Full personality profile <mat-icon iconPositionEnd>arrow_forward</mat-icon>
        </a>
      }
    </section>
  `,
  styles: [`
    .ppcard { display: flex; flex-direction: column; gap: 16px; }
    .ppcard__head { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; }
    .ppcard__title-wrap { display: flex; flex-direction: column; gap: 2px; }
    .ppcard__eyebrow {
      margin: 0; font-size: 0.72rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
      color: var(--suhana-rose-gold);
    }
    .ppcard__title { margin: 0; font-size: 1.2rem; color: var(--suhana-maroon); }
    .ppcard__confidence {
      align-self: flex-start; margin-top: 4px; padding: 2px 10px; border-radius: 999px;
      font-size: 0.74rem; font-weight: 600; background: var(--suhana-blush); color: var(--suhana-maroon);
    }
    .ppcard__summary { margin: 0; line-height: 1.65; color: var(--suhana-text-secondary); }
    .ppcard__dims { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px 24px; }
    .ppcard__strengths { display: flex; flex-wrap: wrap; gap: 8px; }
    .ppcard__chip {
      display: inline-flex; align-items: center; gap: 4px; padding: 4px 12px; border-radius: 999px;
      background: var(--suhana-ivory-warm); border: 1px solid var(--suhana-rose-gold-lighter);
      font-size: 0.8rem; font-weight: 600; color: var(--suhana-text-primary);
      mat-icon { font-size: 15px; width: 15px; height: 15px; color: var(--suhana-gold); }
    }
    .ppcard__relationship {
      display: flex; gap: 10px; margin: 0; padding: 14px 16px; border-radius: 14px;
      background: var(--suhana-gradient-light); color: var(--suhana-text-primary); line-height: 1.6;
      mat-icon { color: var(--suhana-maroon); flex: 0 0 auto; }
    }
    .ppcard__link { align-self: flex-start; color: var(--suhana-maroon); }
    @media (max-width: 640px) { .ppcard__dims { grid-template-columns: 1fr; } }
  `],
})
export class PersonalityProfileCardComponent {
  readonly result = input.required<AssessmentResult>();
  /** Other member's first name; null/empty when showing the viewer's own result. */
  readonly name = input<string | null>(null);
  readonly detailsLink = input<string[] | null>(null);
  readonly detailsQuery = input<Record<string, string> | null>(null);

  protected readonly heading = computed(() =>
    this.name() ? `${this.name()}'s personality` : 'Your personality',
  );

  protected readonly title = computed(() => {
    const r = this.result();
    return r.insights?.title ?? (r.personalityType ? PERSONALITY_TYPE_CATALOG[r.personalityType]?.title : '') ?? '';
  });

  protected readonly dimensions = computed<DimensionScore[]>(() => {
    const byCode = new Map((this.result().dimensions ?? []).map(d => [d.dimension, d]));
    return DIMENSION_ORDER.map(code => byCode.get(code)).filter((d): d is DimensionScore => !!d);
  });
}
