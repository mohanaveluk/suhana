import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Location } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { combineLatest } from 'rxjs';

import { MaterialModule } from '../../../../shared/modules/material.module';
import { PersonalityCompatibilityComponent } from '../../components/personality-compatibility/personality-compatibility.component';
import { PersonalityCompatibility } from '../../models/personality.model';
import { PersonalityService } from '../../services/personality.service';
import { toErrorMessage } from '../../utils/personality.utils';

type CompatibilityState = 'loading' | 'ready' | 'self-missing' | 'other-missing' | 'self' | 'error';

/**
 * `/personality/compatibility/:profileId?name=` — the signed-in member compared
 * with another member. The member's own profile id comes from their result.
 */
@Component({
  selector: 'app-personality-compatibility-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialModule, RouterLink, PersonalityCompatibilityComponent],
  templateUrl: './personality-compatibility.page.html',
  styleUrl: './personality-compatibility.page.scss',
})
export class PersonalityCompatibilityPage {
  private readonly svc = inject(PersonalityService);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);

  protected readonly state = signal<CompatibilityState>('loading');
  protected readonly message = signal('');
  protected readonly compatibility = signal<PersonalityCompatibility | null>(null);
  protected readonly otherProfileId = signal<string | null>(null);
  protected readonly otherName = signal<string>('Your match');

  constructor() {
    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(takeUntilDestroyed())
      .subscribe(([params, query]) => {
        this.otherProfileId.set(params.get('profileId'));
        this.otherName.set(query.get('name')?.trim() || 'Your match');
        void this.load();
      });
  }

  protected async load(): Promise<void> {
    const otherId = this.otherProfileId();
    if (!otherId) {
      this.fail('No member was selected for comparison.');
      return;
    }

    this.state.set('loading');
    try {
      const mine = await this.svc.loadMyResult();
      if (!mine.available || !mine.profileId) {
        this.state.set('self-missing');
        return;
      }
      if (mine.profileId === otherId) {
        this.state.set('self');
        return;
      }

      const result = await this.svc.getCompatibility(mine.profileId, otherId);
      this.compatibility.set(result);
      if (result.available) {
        this.state.set('ready');
      } else {
        this.message.set(result.message ?? '');
        this.state.set('other-missing');
      }
    } catch (err) {
      this.fail(toErrorMessage(err, 'We couldn’t load the compatibility report.'));
    }
  }

  protected back(): void {
    this.location.back();
  }

  private fail(message: string): void {
    this.message.set(message);
    this.state.set('error');
  }
}
