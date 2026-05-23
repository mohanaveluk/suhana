import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  ViewChildren,
  QueryList,
  ElementRef,
  OnDestroy,
  AfterViewChecked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MaterialModule } from '../../shared/modules/material.module';
import { AuthService } from '../../services';

function passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
  const pw = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return pw && confirm && pw !== confirm ? { mismatch: true } : null;
}

@Component({
  selector: 'app-forgot-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, MaterialModule],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss',
})
export class ForgotPasswordComponent implements OnDestroy, AfterViewChecked {
  @ViewChildren('otpInput') private readonly otpInputs!: QueryList<ElementRef<HTMLInputElement>>;

  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  protected readonly currentStep = signal(1);
  protected readonly isLoading = signal(false);
  protected readonly isResending = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly otpValues = signal<string[]>(Array(6).fill(''));
  protected readonly otpHasError = signal(false);
  protected readonly hidePassword = signal(true);
  protected readonly hideConfirm = signal(true);
  protected readonly timeLeft = signal(300);
  protected readonly resendCooldown = signal(0);
  protected readonly resendSuccess = signal(false);

  protected readonly otpBoxes = Array(6).fill(null);

  private resetToken = '';
  private shouldFocusOtp = false;
  private countdownInterval: ReturnType<typeof setInterval> | null = null;
  private cooldownInterval: ReturnType<typeof setInterval> | null = null;

  protected readonly emailForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected readonly passwordForm = this.fb.group(
    {
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordMatchValidator },
  );

  ngAfterViewChecked(): void {
    if (this.shouldFocusOtp && this.otpInputs?.first) {
      this.otpInputs.first.nativeElement.focus();
      this.shouldFocusOtp = false;
    }
  }

  ngOnDestroy(): void {
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    if (this.cooldownInterval) clearInterval(this.cooldownInterval);
  }

  protected get isOtpComplete(): boolean {
    return this.otpValues().every(v => v !== '');
  }

  protected get fullOtp(): string {
    return this.otpValues().join('');
  }

  protected get passwordStrength(): 'weak' | 'medium' | 'strong' {
    const val = this.passwordForm.get('password')?.value ?? '';
    if (val.length < 6) return 'weak';
    const hasUpper = /[A-Z]/.test(val);
    const hasNum = /[0-9]/.test(val);
    const hasSpecial = /[^A-Za-z0-9]/.test(val);
    return val.length >= 10 && hasUpper && hasNum && hasSpecial ? 'strong' : 'medium';
  }

  protected get passwordStrengthLabel(): string {
    return { weak: 'Weak', medium: 'Medium', strong: 'Strong' }[this.passwordStrength];
  }

  protected formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  protected goToStep(step: number): void {
    this.errorMessage.set(null);
    this.currentStep.set(step);
  }

  async onRequestCode(): Promise<void> {
    this.emailForm.markAllAsTouched();
    if (this.emailForm.invalid || this.isLoading()) return;
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      await this.auth.requestPasswordReset(this.emailForm.value.email ?? '');
      this.goToStep(2);
      this.startCountdown();
      this.shouldFocusOtp = true;
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message ?? 'Could not send reset code. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  protected onOtpKeyDown(event: KeyboardEvent, index: number): void {
    const inputs = this.otpInputs.toArray();
    if (event.key === 'Backspace') {
      event.preventDefault();
      const vals = [...this.otpValues()];
      if (vals[index]) {
        vals[index] = '';
      } else if (index > 0) {
        vals[index - 1] = '';
        inputs[index - 1].nativeElement.focus();
      }
      this.otpValues.set(vals);
      this.otpHasError.set(false);
      this.errorMessage.set(null);
    } else if (event.key === 'ArrowLeft' && index > 0) {
      inputs[index - 1].nativeElement.focus();
    } else if (event.key === 'ArrowRight' && index < 5) {
      inputs[index + 1].nativeElement.focus();
    }
  }

  protected onOtpInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const digit = input.value.replace(/\D/g, '').slice(-1);
    const vals = [...this.otpValues()];
    vals[index] = digit;
    input.value = digit;
    this.otpValues.set(vals);
    this.otpHasError.set(false);
    this.errorMessage.set(null);
    if (digit && index < 5) {
      this.otpInputs.toArray()[index + 1].nativeElement.focus();
    }
  }

  protected onOtpPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const digits = (event.clipboardData?.getData('text') ?? '')
      .replace(/\D/g, '').slice(0, 6).split('');
    const vals = Array(6).fill('');
    digits.forEach((d, i) => { if (i < 6) vals[i] = d; });
    this.otpValues.set(vals);
    const nextEmpty = vals.findIndex((v: string) => !v);
    const inputs = this.otpInputs.toArray();
    inputs[nextEmpty === -1 ? 5 : nextEmpty].nativeElement.focus();
  }

  async onVerifyCode(): Promise<void> {
    if (!this.isOtpComplete || this.isLoading()) return;
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      const res = await this.auth.verifyPasswordResetCode(
        this.emailForm.value.email ?? '',
        this.fullOtp,
      );
      this.resetToken = res?.data?.resetToken ?? res?.resetToken ?? '';
      this.clearCountdown();
      this.goToStep(3);
    } catch (err: any) {
      this.otpHasError.set(true);
      this.errorMessage.set(err?.error?.message ?? 'Invalid code. Please try again.');
      this.otpValues.set(Array(6).fill(''));
      setTimeout(() => {
        this.otpInputs?.first?.nativeElement.focus();
        this.otpHasError.set(false);
      }, 600);
    } finally {
      this.isLoading.set(false);
    }
  }

  async onResendCode(): Promise<void> {
    if (this.isResending() || this.resendCooldown() > 0) return;
    this.isResending.set(true);
    this.resendSuccess.set(false);
    this.errorMessage.set(null);
    try {
      await this.auth.requestPasswordReset(this.emailForm.value.email ?? '');
      this.resendSuccess.set(true);
      this.timeLeft.set(300);
      this.restartCountdown();
      this.startCooldown(60);
      this.otpValues.set(Array(6).fill(''));
      setTimeout(() => this.resendSuccess.set(false), 4000);
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message ?? 'Failed to resend code.');
    } finally {
      this.isResending.set(false);
    }
  }

  async onUpdatePassword(): Promise<void> {
    this.passwordForm.markAllAsTouched();
    if (this.passwordForm.invalid || this.isLoading()) return;
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      await this.auth.updatePassword({
        email: this.emailForm.value.email ?? '',
        resetToken: this.resetToken,
        password: this.passwordForm.value.password ?? '',
      });
      this.goToStep(4);
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message ?? 'Failed to update password. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  private startCountdown(): void {
    this.timeLeft.set(300);
    this.countdownInterval = setInterval(() => {
      const left = this.timeLeft() - 1;
      this.timeLeft.set(Math.max(0, left));
      if (left <= 0) {
        this.clearCountdown();
        this.errorMessage.set('Code expired. Please request a new one.');
      }
    }, 1000);
  }

  private restartCountdown(): void {
    this.clearCountdown();
    this.startCountdown();
  }

  private clearCountdown(): void {
    if (this.countdownInterval) { clearInterval(this.countdownInterval); this.countdownInterval = null; }
  }

  private startCooldown(seconds: number): void {
    this.resendCooldown.set(seconds);
    if (this.cooldownInterval) clearInterval(this.cooldownInterval);
    this.cooldownInterval = setInterval(() => {
      const next = this.resendCooldown() - 1;
      this.resendCooldown.set(Math.max(0, next));
      if (next <= 0) { clearInterval(this.cooldownInterval!); this.cooldownInterval = null; }
    }, 1000);
  }
}
