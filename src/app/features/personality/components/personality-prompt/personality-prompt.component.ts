import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MaterialModule } from '../../../../shared/modules/material.module';
import { ASSESSMENT_ESTIMATED_MINUTES } from '../../constants/personality.constants';
import { PersonalityService } from '../../services/personality.service';
import { TypeBadgeComponent } from '../type-badge/type-badge.component';

type PromptState = 'hidden' | 'start' | 'resume' | 'done';

let nextId = 0;

/**
 * Invitation to take (or continue) the Aurora Personality Assessment, embeddable
 * anywhere a signed-in member spends time.
 *
 * - `variant="card"`   — full card for the member's own profile page; once the
 *                        assessment is done it turns into a compact result summary.
 * - `variant="banner"` — slim strip for contextual pages (e.g. matchmaking); hides
 *                        itself once the assessment is done.
 *
 * Renders nothing while loading, on error (e.g. no profile yet), or while a
 * dismissed prompt is snoozed — host pages need no extra logic.
 */
@Component({
  selector: 'app-personality-prompt',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialModule, RouterLink, TypeBadgeComponent],
  // Collapse the host entirely when there's nothing to show, so margins a host
  // page puts on <app-personality-prompt> don't leave an empty gap.
  host: { '[style.display]': "state() === 'hidden' ? 'none' : 'block'" },
  templateUrl: './personality-prompt.component.html',
  styleUrl: './personality-prompt.component.scss',
})
export class PersonalityPromptComponent implements OnInit {
  private readonly svc = inject(PersonalityService);

  readonly variant = input<'card' | 'banner'>('card');
  /** Key for remembering a dismissal, e.g. 'profile' or 'matchmaking'. */
  readonly placement = input.required<string>();
  /** Show a "remind me later" control that snoozes this placement for 7 days. */
  readonly dismissible = input(false);

  protected readonly titleId = `pp-prompt-title-${nextId++}`;
  protected readonly minutes = ASSESSMENT_ESTIMATED_MINUTES;

  private readonly loading = signal(true);
  private readonly failed = signal(false);
  private readonly snoozed = signal(false);
  protected readonly draftCount = signal(0);
  protected readonly result = this.svc.myResult;

  protected readonly state = computed<PromptState>(() => {
    if (this.loading() || this.failed() || this.snoozed()) return 'hidden';
    if (this.svc.hasCompleted()) return this.variant() === 'card' ? 'done' : 'hidden';
    return this.draftCount() > 0 ? 'resume' : 'start';
  });

  async ngOnInit(): Promise<void> {
    this.draftCount.set(this.svc.draftAnswerCount());
    this.snoozed.set(this.dismissible() && this.svc.isPromptSnoozed(this.placement()));
    if (this.snoozed()) {
      this.loading.set(false);
      return;
    }
    try {
      await this.svc.loadMyResult();
    } catch {
      // Typically "no profile yet" (404) — the assessment can't start, so stay hidden.
      this.failed.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  protected dismiss(): void {
    this.svc.snoozePrompt(this.placement());
    this.snoozed.set(true);
  }
}
