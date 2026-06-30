import { Component, OnInit, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../services/auth.service';
import { decryptValue } from '../../shared/utils/crypto.util';

type PageState = 'success' | 'invalid';

@Component({
  selector: 'app-registration-success',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './registration-success.component.html',
  styleUrl:    './registration-success.component.scss',
})
export class RegistrationSuccessComponent implements OnInit {
  private readonly route   = inject(ActivatedRoute);
  private readonly auth    = inject(AuthService);
  private readonly snack   = inject(MatSnackBar);

  protected readonly state          = signal<PageState>('success');
  protected readonly email          = signal<string>('');
  protected readonly resendSending  = signal(false);
  protected readonly resendDone     = signal(false);

  ngOnInit(): void {
    const paramKey = this.route.snapshot.paramMap.get('paramKey') ?? '';
    try {
      const decrypted = decryptValue(paramKey);
      if (!decrypted || !decrypted.includes('@')) throw new Error('invalid');
      this.email.set(decrypted);
    } catch {
      this.state.set('invalid');
    }
  }

  async resendVerification(): Promise<void> {
    if (this.resendSending() || this.resendDone()) return;
    this.resendSending.set(true);
    try {
      await this.auth.sendVerificationEmail(this.email());
      this.resendDone.set(true);
      this.snack.open('Verification email sent! Please check your inbox.', 'OK', { duration: 5000 });
    } catch {
      this.snack.open('Failed to resend. Please try again later.', 'Dismiss', { duration: 4000 });
    } finally {
      this.resendSending.set(false);
    }
  }
}
