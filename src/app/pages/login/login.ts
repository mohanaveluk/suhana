import { Component, ChangeDetectionStrategy, inject, signal, computed, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MaterialModule } from '../../shared/modules/material.module';
import { AuthService } from '../../services';

type LoginMode = 'password' | 'otc';
type OtcStep = 'email' | 'code';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule, RouterLink, MaterialModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginComponent implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** Seconds the user must wait before a resend is allowed. */
  private static readonly RESEND_WAIT = 30;

  /** Where to go after a successful login — set by authGuard, defaults to home. */
  private get returnUrl(): string {
    return this.route.snapshot.queryParamMap.get('returnUrl') || '/';
  }

  protected readonly hidePassword = signal(true);
  protected readonly isLoggingIn = signal(false);
  protected readonly isSendingVerification = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly showVerifyOption = signal(false);
  protected readonly verificationSent = signal(false);

  // ── Passwordless one-time-code (OTC) state ─────────────────────────────────
  protected readonly loginMode = signal<LoginMode>('otc');
  protected readonly otcStep = signal<OtcStep>('email');
  protected readonly isSendingOtc = signal(false);
  protected readonly isValidatingOtc = signal(false);
  protected readonly otcMessage = signal('');
  protected readonly resendCountdown = signal(0);
  protected readonly canResend = computed(() => this.resendCountdown() === 0);

  private resendTimer?: ReturnType<typeof setInterval>;

  protected readonly loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  protected readonly otcForm = this.fb.group({
    code: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(8)]],
  });

  ngOnDestroy(): void {
    this.stopResendCountdown();
  }

  // ── Mode switching ──────────────────────────────────────────────────────────
  protected switchMode(mode: LoginMode): void {
    if (this.loginMode() === mode) return;
    this.loginMode.set(mode);
    this.resetOtcFlow();
    this.errorMessage.set(null);
    this.showVerifyOption.set(false);
    this.verificationSent.set(false);
  }

  private resetOtcFlow(): void {
    this.stopResendCountdown();
    this.otcStep.set('email');
    this.otcForm.reset();
    this.isSendingOtc.set(false);
    this.isValidatingOtc.set(false);
    this.resendCountdown.set(0);
  }

  // ── Password login (existing flow) ────────────────────────────────────────────
  async onLogin(): Promise<void> {
    this.loginForm.markAllAsTouched();
    if (this.loginForm.invalid) return;

    this.isLoggingIn.set(true);
    this.errorMessage.set(null);
    this.showVerifyOption.set(false);
    this.verificationSent.set(false);

    const { email, password } = this.loginForm.getRawValue();
    try {
      await this.auth.login(email ?? '', password ?? '');
      this.router.navigateByUrl(this.returnUrl);
    } catch (err: any) {
      const msg: string = err?.error?.message ?? err?.message ?? 'Login failed. Please try again.';
      this.errorMessage.set(msg);
      this.showVerifyOption.set(/disabled|not verified|verify|verification/i.test(msg));
    } finally {
      this.isLoggingIn.set(false);
    }
  }

  // ── OTC login flow ──────────────────────────────────────────────────────────
  /** Step 1: validate the email server-side and request a one-time code. */
  async sendOtc(): Promise<void> {
    const emailCtrl = this.loginForm.controls.email;
    emailCtrl.markAsTouched();
    if (emailCtrl.invalid) return;

    this.isSendingOtc.set(true);
    this.errorMessage.set(null);

    const email = emailCtrl.getRawValue() ?? '';
    try {
      const otcResponse = await this.auth.sendLoginOtc(email);
      this.otcMessage.set(otcResponse.message);
      this.otcStep.set('code');
      this.otcForm.reset();
      this.startResendCountdown();
    } catch (err: any) {
      this.errorMessage.set(
        err?.error?.message ?? 'We could not send a code to this email. Please check the address and try again.',
      );
    } finally {
      this.isSendingOtc.set(false);
    }
  }

  /** Resend a fresh code (only allowed once the countdown reaches zero). */
  async resendOtc(): Promise<void> {
    this.otcMessage.set('');
    if (!this.canResend() || this.isSendingOtc()) return;
    await this.sendOtc();
  }

  /** Step 2: validate email + one-time code and establish the session. */
  async validateOtc(): Promise<void> {
    this.otcForm.markAllAsTouched();
    const emailCtrl = this.loginForm.controls.email;
    if (emailCtrl.invalid || this.otcForm.invalid) return;

    this.otcMessage.set('');
    this.isValidatingOtc.set(true);
    this.errorMessage.set(null);

    const email = emailCtrl.getRawValue() ?? '';
    const code = this.otcForm.controls.code.getRawValue() ?? '';
    try {
      await this.auth.loginWithOtc(email, code);
      this.router.navigateByUrl(this.returnUrl);
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message ?? 'Invalid or expired code. Please try again or resend a new code.');
      // Allow an immediate resend when the code is rejected.
      this.stopResendCountdown();
      this.resendCountdown.set(0);
    } finally {
      this.isValidatingOtc.set(false);
    }
  }

  /** Return to the email step so the user can send a code to a different address. */
  protected changeEmail(): void {
    this.resetOtcFlow();
    this.errorMessage.set(null);
  }

  private startResendCountdown(): void {
    this.stopResendCountdown();
    this.resendCountdown.set(LoginComponent.RESEND_WAIT);
    this.resendTimer = setInterval(() => {
      const next = this.resendCountdown() - 1;
      if (next <= 0) {
        this.resendCountdown.set(0);
        this.stopResendCountdown();
      } else {
        this.resendCountdown.set(next);
      }
    }, 1000);
  }

  private stopResendCountdown(): void {
    if (this.resendTimer) {
      clearInterval(this.resendTimer);
      this.resendTimer = undefined;
    }
  }

  async sendVerificationEmail(): Promise<void> {
    const email = this.loginForm.getRawValue().email ?? '';
    if (!email) return;

    this.isSendingVerification.set(true);
    try {
      await this.auth.sendVerificationEmail(email);
      this.verificationSent.set(true);
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message ?? 'Failed to send verification email. Please try again.');
    } finally {
      this.isSendingVerification.set(false);
    }
  }

  async loginAsDemo(role: 'registered' | 'admin' | 'tester'): Promise<void> {
    //await this.auth.loginAsRole(role);
    //this.router.navigate([role === 'admin' ? '/admin' : '/']);
  }
}
