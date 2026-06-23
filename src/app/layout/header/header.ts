import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MaterialModule } from '../../shared/modules/material.module';
import { AuthService } from '../../services';
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
  private   readonly router             = inject(Router);
  protected readonly mobileMenuOpen     = signal(false);

  protected readonly displayName = computed(() => {
    const u = this.auth.user();
    if (!u) return '';
    const full = [u.firstName, u.lastName].filter(Boolean).join(' ');
    return full || u.email;
  });

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
