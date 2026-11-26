import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MaterialModule } from '../../../../shared/modules/material.module';
import { AuthService } from '../../../../services/auth.service';
import { apiErrorMessage } from '../../../discover/utils/discover.utils';

/** Target of the provider verification email; reuses POST /auth/verify-email. */
@Component({
  selector: 'app-provider-verify',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialModule, RouterLink],
  template: `
    <div class="pa" style="--pa-img: url('/providers/venue.webp')">
      <aside class="pa__art">
        <a class="pa__brand" routerLink="/providers"><span class="pa__logo" aria-hidden="true"><mat-icon>storefront</mat-icon></span>
          <span>Aurora <strong>for Business</strong></span></a>
        <h2>Almost there</h2>
        <p>Once your email is verified, sign in to complete your business profile and submit it for review.</p>
      </aside>
      <section class="pa__panel">
        <div class="pa__card">
          @switch (state()) {
            @case ('working') {
              <div class="pa__done" aria-busy="true"><mat-spinner diameter="44" style="margin:0 auto 12px"></mat-spinner><p>Verifying your email…</p></div>
            }
            @case ('ok') {
              <div class="pa__done" role="status">
                <span class="pa__done-icon" aria-hidden="true"><mat-icon>verified</mat-icon></span>
                <h1>Email verified</h1>
                <p>Your business account is active. Sign in to build your listing.</p>
                <a mat-flat-button class="suhana-btn-primary" routerLink="/providers/login">Provider login</a>
              </div>
            }
            @default {
              <div class="pa__done" role="alert">
                <h1>We couldn't verify this link</h1>
                <p>{{ message() }}</p>
                <a mat-stroked-button routerLink="/providers/login">Go to provider login</a>
              </div>
            }
          }
        </div>
      </section>
    </div>
  `,
  styleUrl: '../provider-auth.scss',
})
export class ProviderVerifyPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  protected readonly state = signal<'working' | 'ok' | 'error'>('working');
  protected readonly message = signal('');

  async ngOnInit(): Promise<void> {
    const pm = this.route.snapshot.paramMap;
    try {
      await firstValueFrom(this.auth.verifyEmail(pm.get('userGuid') ?? '', pm.get('code') ?? ''));
      this.state.set('ok');
    } catch (err) {
      this.message.set(apiErrorMessage(err, 'The link may have expired. Try signing in — we will send a fresh verification email.'));
      this.state.set('error');
    }
  }
}
