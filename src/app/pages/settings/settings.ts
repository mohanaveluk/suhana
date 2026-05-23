import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MaterialModule } from '../../shared/modules/material.module';
import { AuthService } from '../../services';
import { CommonModule, TitleCasePipe } from '@angular/common';

@Component({
  selector: 'app-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, MaterialModule, CommonModule],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class SettingsComponent {
  private readonly fb     = inject(FormBuilder);
  private readonly auth   = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly user = this.auth.user;

  // Password change
  protected readonly hideCurrentPwd = signal(true);
  protected readonly hideNewPwd     = signal(true);
  protected readonly hideConfirmPwd = signal(true);
  protected readonly isChangingPwd  = signal(false);
  protected readonly pwdError       = signal<string | null>(null);
  protected readonly pwdSuccess     = signal(false);

  protected readonly passwordForm = this.fb.group({
    currentPassword: ['', [Validators.required, Validators.minLength(6)]],
    newPassword:     ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
  });

  // Notifications
  protected readonly notifications = signal({
    emailMatches:    true,
    emailMessages:   true,
    emailInterests:  true,
    emailMarketing:  false,
    smsAlerts:       false,
    pushMatches:     true,
    pushMessages:    true,
  });

  // Privacy
  protected readonly privacy = signal({
    showOnlineStatus:  true,
    showReadReceipts:  true,
    allowMessageFrom:  'matches' as 'everyone' | 'matches' | 'none',
    profileIndexed:    true,
  });

  // Danger zone confirmation
  protected readonly confirmDeactivate = signal(false);
  protected readonly confirmDelete     = signal(false);

  async changePassword(): Promise<void> {
    this.passwordForm.markAllAsTouched();
    if (this.passwordForm.invalid) return;

    const { newPassword, confirmPassword } = this.passwordForm.getRawValue();
    if (newPassword !== confirmPassword) {
      this.pwdError.set('New passwords do not match.');
      return;
    }

    this.isChangingPwd.set(true);
    this.pwdError.set(null);
    this.pwdSuccess.set(false);

    try {
      // TODO: wire to API when endpoint is available
      await new Promise(resolve => setTimeout(resolve, 800));
      this.pwdSuccess.set(true);
      this.passwordForm.reset();
    } catch (err: any) {
      this.pwdError.set(err?.error?.message ?? 'Failed to change password.');
    } finally {
      this.isChangingPwd.set(false);
    }
  }

  protected toggleNotification(key: keyof ReturnType<typeof this.notifications>): void {
    this.notifications.update(s => ({ ...s, [key]: !s[key] }));
  }

  protected togglePrivacy(key: keyof ReturnType<typeof this.privacy>): void {
    this.privacy.update(s => ({ ...s, [key]: !(s as any)[key] }));
  }

  protected setMessageFrom(value: 'everyone' | 'matches' | 'none'): void {
    this.privacy.update(s => ({ ...s, allowMessageFrom: value }));
  }

  protected deactivateAccount(): void {
    if (!this.confirmDeactivate()) { this.confirmDeactivate.set(true); return; }
    // TODO: call API
    this.auth.logout();
    this.router.navigate(['/']);
  }

  protected goBack(): void { this.router.navigate(['/profile']); }
}
