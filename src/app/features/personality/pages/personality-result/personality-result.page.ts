import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Location } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { combineLatest } from 'rxjs';

import { MaterialModule } from '../../../../shared/modules/material.module';
import { PersonalityResultComponent } from '../../components/personality-result/personality-result.component';
import { AssessmentResult } from '../../models/personality.model';
import { PersonalityService } from '../../services/personality.service';
import { toErrorMessage } from '../../utils/personality.utils';

/**
 * `/personality/result`             → the signed-in member's own result
 * `/personality/result/:profileId`  → another member's result (`?name=` for display)
 */
@Component({
  selector: 'app-personality-result-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialModule, RouterLink, PersonalityResultComponent],
  templateUrl: './personality-result.page.html',
  styleUrl: './personality-result.page.scss',
})
export class PersonalityResultPage {
  private readonly svc = inject(PersonalityService);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);

  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly result = signal<AssessmentResult | null>(null);
  protected readonly profileId = signal<string | null>(null);
  protected readonly name = signal<string | null>(null);

  protected readonly isOwn = computed(() => !this.profileId());
  protected readonly available = computed(() => !!this.result()?.available);

  constructor() {
    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(takeUntilDestroyed())
      .subscribe(([params, query]) => {
        this.profileId.set(params.get('profileId'));
        this.name.set(query.get('name'));
        void this.load();
      });
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const id = this.profileId();
      this.result.set(id ? await this.svc.getProfileResult(id) : await this.svc.loadMyResult());
    } catch (err) {
      this.error.set(toErrorMessage(err, 'We couldn’t load this personality result.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected back(): void {
    this.location.back();
  }
}
