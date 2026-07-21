import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MaterialModule } from '../../shared/modules/material.module';
import { AuthService } from '../../services';

type VerifyState = 'verifying' | 'success' | 'failed' | 'expired' | 'resent';

@Component({
  selector: 'app-verify-email',
  templateUrl: './verify-email.component.html',
  styleUrls: ['./verify-email.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MaterialModule],
})
export class VerifyEmailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);

  protected readonly state = signal<VerifyState>('verifying');
  protected readonly responseMessage = signal('Your email has been successfully verified!');
  protected readonly errorMessage = signal('We could not verify your email address.');
  protected readonly errorDetail = signal('The link may be invalid or already used.');
  protected readonly canRetry = signal(false);

  protected readonly isResending = signal(false);
  protected readonly resendError = signal('');
  protected readonly resendCooldown = signal(0);
  protected readonly registeredEmail = signal('');

  private userGuid = '';
  private verificationCode = '';
  private cooldownTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.userGuid = this.route.snapshot.paramMap.get('userGuid') ?? '';
    this.verificationCode = this.route.snapshot.paramMap.get('verificationCode') ?? '';

    if (!this.userGuid || !this.verificationCode) {
      this.setFailed(
        'Invalid verification link.',
        'The link is missing required parameters. Please check your email and try again.',
        false
      );
      return;
    }

    this.verify();
  }

  ngOnDestroy(): void {
    this.clearCooldown();
  }

  verify(): void {
    this.state.set('verifying');

    this.auth.verifyEmail(this.userGuid, this.verificationCode).subscribe({
      next: (response) => {
        this.responseMessage.set(response?.message ?? 'Your email has been successfully verified!');
        this.state.set('success');
      },
      error: (error) => this.handleError(error),
    });
  }

  retryVerification(): void {
    this.verify();
  }

  resendVerification(): void {
    if (this.isResending() || this.resendCooldown() > 0) return;

    this.isResending.set(true);
    this.resendError.set('');

    this.auth.resendVerificationMail(this.userGuid).subscribe({
      next: (response) => {
        this.isResending.set(false);
        this.registeredEmail.set(response?.email ?? '');
        if (response?.message.indexOf('Email already verified') >= 0) {
          this.responseMessage.set(response?.message ?? 'Your email has been successfully verified!');
          this.state.set('success');
        }
        else {
          this.state.set('resent');
          this.startCooldown(60);
        }
      },
      error: (error) => {
        this.isResending.set(false);
        this.resendError.set(error?.error?.message ?? 'Could not send the email. Please try again.');
      },
    });
  }

  private handleError(error: any): void {
    const status = error?.status;

    if (status === 410 || error?.error?.message?.toLowerCase().includes('expired')) {
      this.state.set('expired');
      return;
    }

    if (status === 404) {
      this.setFailed(
        'Verification link not found.',
        'This link does not exist or has already been used.',
        false
      );
      return;
    }

    if (status === 400) {
      this.setFailed(
        'Invalid verification link.',
        error?.error?.message ?? 'The link is malformed or the code is incorrect.',
        false
      );
      return;
    }

    if (status === 0) {
      this.setFailed(
        'Unable to reach the server.',
        'Please check your internet connection and try again.',
        true
      );
      return;
    }

    this.setFailed(
      error?.error?.message ?? 'Verification failed. Please try again.',
      'If the problem persists, please request a new verification email.',
      true
    );
  }

  private setFailed(message: string, detail: string, canRetry: boolean): void {
    this.state.set('failed');
    this.errorMessage.set(message);
    this.errorDetail.set(detail);
    this.canRetry.set(canRetry);
  }

  private startCooldown(seconds: number): void {
    this.resendCooldown.set(seconds);
    this.clearCooldown();
    this.cooldownTimer = setInterval(() => {
      this.resendCooldown.update(v => v - 1);
      if (this.resendCooldown() <= 0) {
        this.resendCooldown.set(0);
        this.clearCooldown();
      }
    }, 1000);
  }

  private clearCooldown(): void {
    if (this.cooldownTimer !== null) {
      clearInterval(this.cooldownTimer);
      this.cooldownTimer = null;
    }
  }
}
