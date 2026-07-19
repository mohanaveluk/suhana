import { Component, ChangeDetectionStrategy, inject, signal, computed, effect } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MaterialModule } from '../../shared/modules/material.module';
import { AuthService } from '../../services';
import { ProfileService } from '../../services/profile.service';
import { EmailHistoryService } from '../../pages/notifications/notification.service';

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
  private   readonly profileSvc         = inject(ProfileService);
  private   readonly router             = inject(Router);
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
}
