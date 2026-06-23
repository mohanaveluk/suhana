import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MaterialModule } from '../../shared/modules/material.module';
import { AuthService } from '../../services';
import { InterestService } from '../../services/interest.service';

type PageState = 'loading' | 'success' | 'already_accepted' | 'invalid';

@Component({
  selector: 'app-accept-interest',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MaterialModule],
  templateUrl: './accept-interest.component.html',
  styleUrl: './accept-interest.component.scss',
})
export class AcceptInterestComponent implements OnInit {
  private readonly route           = inject(ActivatedRoute);
  private readonly interestService = inject(InterestService);
  protected readonly auth          = inject(AuthService);

  protected readonly state         = signal<PageState>('loading');
  protected readonly requesterName = signal<string>('');

  async ngOnInit(): Promise<void> {
    const interestId = this.route.snapshot.paramMap.get('interestId') ?? '';
    const guid       = this.route.snapshot.paramMap.get('guid') ?? '';

    try {
      const res = await this.interestService.acceptInterestByLink(interestId, guid);
      this.requesterName.set(res.requesterName ?? '');
      this.state.set('success');
    } catch (err: any) {
      const status  = err?.status as number | undefined;
      const message = (err?.error?.message ?? err?.message ?? '').toLowerCase() as string;

      if (status === 409 || message.includes('already accepted') || message.includes('already been accepted')) {
        this.state.set('already_accepted');
      } else {
        this.state.set('invalid');
      }
    }
  }
}
