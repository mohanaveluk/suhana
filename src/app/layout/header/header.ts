import { Component, ChangeDetectionStrategy, inject, signal, computed, effect } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MaterialModule } from '../../shared/modules/material.module';
import { ApiService, AuthService } from '../../services';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProfileService } from '../../services/profile.service';
import { EmailHistoryService } from '../../pages/notifications/notification.service';
import { MemberInteractionsService } from '../../features/my-interests/services/member-interactions.service';

@Component({
  selector: 'app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, MaterialModule],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class HeaderComponent {
  protected readonly auth               = inject(AuthService);
  protected readonly emailHistoryService = inject(EmailHistoryService);
  /** New-interest and unread-message counts for the nav badges. */
  protected readonly interactions = inject(MemberInteractionsService);
  private   readonly profileSvc         = inject(ProfileService);
  private   readonly router             = inject(Router);
  private   readonly api                = inject(ApiService);
  protected readonly mobileMenuOpen     = signal(false);
  protected readonly avatarError        = signal(false);

  protected readonly displayName = computed(() => {
    const u = this.auth.user();
    if (!u) return '';
    const full = [u.firstName, u.lastName].filter(Boolean).join(' ');
    return full || u.email;
  });

  /** Primary profile photo URL for the current user, or null if none/failed. */
  protected readonly profilePhoto = computed<string | null>(() => {
    const photos = this.profileSvc.myProfile()?.photos ?? [];
    if (!photos.length) return null;
    return (photos.find(p => p.isPrimary) ?? photos[0]).url ?? null;
  });

  constructor() {
    // Load the current user's profile (for the avatar) once authenticated.
    effect(() => {
      if (this.auth.authenticated() && !this.profileSvc.myProfile()) {
        void this.profileSvc.loadMyProfile();
      }
    });
  }

  protected onAvatarError(): void {
    this.avatarError.set(true);
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update(v => !v);
  }

  logout(): void {
    this.auth.logout();
    this.mobileMenuOpen.set(false);
  }

  openNotifications(): void {
    this.router.navigate(['/notifications']);
  }

  // ── One Aurora identity, several apps ─────────────────────────────────────
  /** Aurora for Providers (separate web app). */
  protected readonly providersUrl = environment.providersUrl;
  protected readonly switching = signal(false);

  /**
   * "Switch Aurora experience" → Aurora for Providers without logging in again. The API
   * issues a 60-second single-use code only to accounts with a provider role; the
   * provider app exchanges it for its own session. No tokens travel in the URL.
   */
  protected async switchToProviders(): Promise<void> {
    if (this.switching()) return;
    this.switching.set(true);
    try {
      const { code } = await firstValueFrom(this.api.createHandoff('providers'));
      window.location.assign(`${this.providersUrl}/auth/handoff?code=${encodeURIComponent(code)}`);
    } catch {
      this.switching.set(false);
      window.location.assign(`${this.providersUrl}/login`); // fall back to a normal sign-in there
    }
  }
}
