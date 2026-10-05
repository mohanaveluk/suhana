import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MaterialModule } from '../../../../shared/modules/material.module';
import { COMPATIBILITY_COPY, PERSONALITY_TYPE_CATALOG } from '../../constants/personality.constants';
import { AssessmentResult, PersonalityMatchStatus } from '../../models/personality.model';
import { combinedInsight } from '../../utils/personality.utils';
import { PersonalityCompatibilityComponent } from '../personality-compatibility/personality-compatibility.component';
import { ScoreRingComponent } from '../score-ring/score-ring.component';
import { TypeBadgeComponent } from '../type-badge/type-badge.component';

interface StatusRow {
  who: string;
  done: boolean;
  type: string | null;
  title: string;
}

/**
 * Personality-match standing between the viewer and another member, for any
 * page that compares two profiles.
 *
 * Presentational: the host resolves the status (PersonalityService.getMatchStatus)
 * and passes it in, so it can also reuse the same status elsewhere (e.g. a hero pill).
 *
 * - `mode="full"`    — the complete report, opened with a "two lenses" summary
 *                      when `profileCompatibility` is provided.
 * - `mode="compact"` — score + level + one strength, linking to the full report.
 */
@Component({
  selector: 'app-personality-match-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialModule, RouterLink, ScoreRingComponent, TypeBadgeComponent, PersonalityCompatibilityComponent],
  templateUrl: './personality-match-panel.component.html',
  styleUrl: './personality-match-panel.component.scss',
})
export class PersonalityMatchPanelComponent {
  readonly status = input<PersonalityMatchStatus | null>(null);
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly theirName = input('This member');
  readonly mode = input<'full' | 'compact'>('full');
  /** Overall profile-compatibility %, shown beside (never merged with) the personality score. */
  readonly profileCompatibility = input<number | null>(null);
  readonly detailsLink = input<string[] | null>(null);
  readonly detailsQuery = input<Record<string, string> | null>(null);

  readonly retry = output<void>();

  protected readonly state = computed(() => this.status()?.state ?? null);
  protected readonly compatibility = computed(() => this.status()?.compatibility ?? null);

  protected readonly score = computed(() => this.compatibility()?.compatibilityScore ?? 0);
  protected readonly level = computed(() => this.compatibility()?.compatibilityLevel ?? 'Moderate');
  protected readonly levelCopy = computed(() => COMPATIBILITY_COPY[this.level()]);
  protected readonly topStrength = computed(() => this.compatibility()?.strengths?.[0] ?? '');

  protected readonly insight = computed(() => {
    const profilePct = this.profileCompatibility();
    return profilePct == null || this.state() !== 'ready' ? null : combinedInsight(profilePct, this.score());
  });

  /** "You" and the other member, each with their assessment status. */
  protected readonly statusRows = computed<StatusRow[]>(() => {
    const s = this.status();
    return [this.row('You', s?.mine ?? null), this.row(this.theirName(), s?.theirs ?? null)];
  });

  private row(who: string, result: AssessmentResult | null): StatusRow {
    const done = !!result?.available;
    const type = done ? (result?.personalityType ?? null) : null;
    return {
      who,
      done,
      type,
      title: type ? (PERSONALITY_TYPE_CATALOG[type as keyof typeof PERSONALITY_TYPE_CATALOG]?.title ?? '') : '',
    };
  }
}
