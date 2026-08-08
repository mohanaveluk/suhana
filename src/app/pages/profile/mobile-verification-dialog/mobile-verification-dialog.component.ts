import {
  Component, ChangeDetectionStrategy, inject, signal, OnDestroy,
} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MobileVerificationService } from '../../../services/mobile-verification.service';

export interface MobileVerificationDialogData {
  mobileNumber: string;
}

export interface MobileVerificationDialogResult {
  verified: boolean;
  mobileNumber: string;
}

type Step = 'number' | 'otp';

@Component({
  selector: 'app-mobile-verification-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    MatDialogModule, ReactiveFormsModule,
    MatButtonModule, MatFormFieldModule, MatInputModule,
    MatIconModule, MatProgressSpinnerModule,
  ],
  templateUrl: './mobile-verification-dialog.component.html',
  styleUrl: './mobile-verification-dialog.component.scss',
})
export class MobileVerificationDialogComponent implements OnDestroy {
  private readonly dialogRef = inject(MatDialogRef<MobileVerificationDialogComponent>);
  protected readonly data = inject<MobileVerificationDialogData>(MAT_DIALOG_DATA);
  private readonly svc = inject(MobileVerificationService);
  private readonly fb = inject(FormBuilder);

  protected step = signal<Step>('number');
  protected loading = signal(false);
  protected errorMsg = signal<string | null>(null);
  protected successMsg = signal<string | null>(null);
  protected resendCountdown = signal(0);

  private countdownTimer: ReturnType<typeof setInterval> | null = null;

  protected readonly numberForm = this.fb.group({
    mobileNumber: [this.data.mobileNumber, [Validators.required, Validators.pattern(/^\+?[1-9]\d{6,14}$/)]],
  });

  protected readonly otpForm = this.fb.group({
    otpCode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  async sendOtp(): Promise<void> {
    if (this.numberForm.invalid) { this.numberForm.markAllAsTouched(); return; }
    this.loading.set(true);
    this.errorMsg.set(null);
    try {
      await this.svc.sendOtp(this.numberForm.value.mobileNumber!);
      this.successMsg.set('Verification code sent successfully.');
      this.step.set('otp');
      this.startCountdown();
    } catch (e: any) {
      this.errorMsg.set(e?.error?.message ?? 'Failed to send code. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  async verifyOtp(): Promise<void> {
    if (this.otpForm.invalid) { this.otpForm.markAllAsTouched(); return; }
    this.loading.set(true);
    this.errorMsg.set(null);
    try {
      const mobile = this.numberForm.value.mobileNumber!;
      await this.svc.verifyOtp(mobile, this.otpForm.value.otpCode!);
      this.dialogRef.close({ verified: true, mobileNumber: mobile } satisfies MobileVerificationDialogResult);
    } catch (e: any) {
      this.errorMsg.set(e?.error?.message ?? 'Invalid code. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  async resendOtp(): Promise<void> {
    if (this.resendCountdown() > 0) return;
    this.loading.set(true);
    this.errorMsg.set(null);
    try {
      await this.svc.resendOtp(this.numberForm.value.mobileNumber!);
      this.successMsg.set('A new verification code has been sent.');
      this.startCountdown();
    } catch (e: any) {
      this.errorMsg.set(e?.error?.message ?? 'Failed to resend code.');
    } finally {
      this.loading.set(false);
    }
  }

  protected goBack(): void {
    this.step.set('number');
    this.otpForm.reset();
    this.errorMsg.set(null);
    this.successMsg.set(null);
  }

  protected cancel(): void {
    this.dialogRef.close(null);
  }

  private startCountdown(seconds = 30): void {
    this.clearCountdown();
    this.resendCountdown.set(seconds);
    this.countdownTimer = setInterval(() => {
      this.resendCountdown.update(v => {
        if (v <= 1) { this.clearCountdown(); return 0; }
        return v - 1;
      });
    }, 1000);
  }

  private clearCountdown(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  ngOnDestroy(): void { this.clearCountdown(); }
}
