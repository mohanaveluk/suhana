import { ChangeDetectionStrategy, Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MaterialModule } from '../../shared/modules/material.module';
import { ApiService, AuthService } from '../../services';

/**
 * /auth/handoff?code=… — arriving from Aurora for Providers' "Switch Aurora
 * experience". The one-time code (60 s, single use, only issued to accounts with
 * the MEMBER role) is exchanged for a session here and removed from the address
 * bar immediately; tokens never travel in URLs. Never prerendered / indexed.
 */
@Component({
  selector: 'app-auth-handoff',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MaterialModule],
  templateUrl: './auth-handoff.component.html',
  styleUrl: './auth-handoff.component.scss',
})
export class AuthHandoffComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly failed = signal(false);

  async ngOnInit(): Promise<void> {
    if (!this.isBrowser) return;
    const code = this.route.snapshot.queryParamMap.get('code') ?? '';
    try { history.replaceState(history.state, '', '/auth/handoff'); } catch { /* ignore */ }
    if (!code) { this.failed.set(true); return; }
    try {
      const res = await firstValueFrom(this.api.exchangeHandoff(code));
      this.auth.clearSession(); // never mix with a previous session in this browser
      this.auth.adoptSession(res?.data ?? res);
      await this.router.navigateByUrl(this.auth.hasMemberAccess() ? '/profile' : '/login', { replaceUrl: true });
    } catch {
      this.failed.set(true);
    }
  }
}
