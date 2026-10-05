import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MaterialModule } from '../../../../shared/modules/material.module';
import { TypeBadgeComponent } from '../../components/type-badge/type-badge.component';
import {
  ASSESSMENT_ESTIMATED_MINUTES,
  DIMENSION_META,
  DIMENSION_ORDER,
  PERSONALITY_TYPE_CATALOG,
  POLE_LABELS,
} from '../../constants/personality.constants';
import { PERSONALITY_TYPES, PersonalityTypeCode } from '../../models/personality.model';
import { PersonalityService } from '../../services/personality.service';
import { toErrorMessage } from '../../utils/personality.utils';

/** Landing page: explains the assessment, or summarises the member's current result. */
@Component({
  selector: 'app-personality-home-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialModule, RouterLink, TypeBadgeComponent],
  templateUrl: './personality-home.page.html',
  styleUrl: './personality-home.page.scss',
})
export class PersonalityHomePage implements OnInit {
  private readonly svc = inject(PersonalityService);

  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly draftCount = signal(0);

  protected readonly result = this.svc.myResult;
  protected readonly completed = this.svc.hasCompleted;
  protected readonly myType = computed(() => this.result()?.personalityType ?? null);

  protected readonly minutes = ASSESSMENT_ESTIMATED_MINUTES;
  protected readonly dimensions = DIMENSION_ORDER.map(code => {
    const meta = DIMENSION_META[code];
    return { ...meta, poleLabels: meta.poles.map(p => `${p} · ${POLE_LABELS[p]}`) };
  });
  protected readonly types = PERSONALITY_TYPES.map(code => ({ code, ...PERSONALITY_TYPE_CATALOG[code] }));

  async ngOnInit(): Promise<void> {
    this.draftCount.set(this.svc.draftAnswerCount());
    try {
      await this.svc.loadMyResult();
    } catch (err) {
      this.error.set(toErrorMessage(err, 'We couldn’t load your personality profile.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected isMine(code: PersonalityTypeCode): boolean {
    return this.myType() === code;
  }
}
