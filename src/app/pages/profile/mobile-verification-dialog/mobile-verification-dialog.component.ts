import {
  Component, ChangeDetectionStrategy, inject, signal, computed, OnDestroy,
} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MobileVerificationService } from '../../../services/mobile-verification.service';
import {
  COUNTRIES, DEFAULT_COUNTRY_ISO, findCountry, flagUrl, splitDialCode,
} from '../../../shared/data/countries';

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
    MatIconModule, MatSelectModule, MatProgressSpinnerModule,
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

  /** National part only — the dial code comes from the country selector. */
  protected readonly numberForm = this.fb.group({
    mobileNumber: ['', [Validators.required, Validators.pattern(/^[1-9]\d{5,14}$/)]],
  });

  protected readonly otpForm = this.fb.group({
    otpCode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  // ── Country selector ────────────────────────────────────────────────────────
  protected readonly countries = COUNTRIES;
  protected readonly countryIso = signal(DEFAULT_COUNTRY_ISO);
  protected readonly countryQuery = signal('');
  protected readonly selectedCountry = computed(() => findCountry(this.countryIso()));

  protected readonly filteredCountries = computed(() => {
    const q = this.countryQuery().trim().toLowerCase();
    if (!q) return COUNTRIES;
    const digits = q.replace(/^\+/, '');
    return COUNTRIES.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.iso2.toLowerCase() === q ||
      (!!digits && c.dialCode.slice(1).startsWith(digits)));
  });

  constructor() {
    // An existing number arrives in E.164 form, so recover its country.
    const { iso2, national } = splitDialCode(this.data.mobileNumber);
    this.countryIso.set(iso2);
    this.numberForm.patchValue({ mobileNumber: national });
  }

  protected flagSrc(iso2: string): string { return flagUrl(iso2); }

  /** The E.164 value actually sent to the API. */
  protected fullNumber(): string {
    const national = (this.numberForm.value.mobileNumber ?? '').replace(/\D/g, '');
    return `${this.selectedCountry().dialCode}${national}`;
  }

  protected onCountrySelected(iso2: string): void {
    this.countryIso.set(iso2);
    this.countryQuery.set('');
  }

  /**
   * Keeps the field to digits only. Pasting a full international number
   * re-selects the matching country instead of doubling up the dial code.
   */
  protected onNumberInput(value: string): void {
    const ctrl = this.numberForm.controls.mobileNumber;

    if (value.trim().startsWith('+')) {
      const { iso2, national } = splitDialCode(value);
      this.countryIso.set(iso2);
      ctrl.setValue(national);
      return;
    }

    const digits = value.replace(/\D/g, '').replace(/^0+/, '');
    if (digits !== value) ctrl.setValue(digits);
  }

  async sendOtp(): Promise<void> {
    if (this.numberForm.invalid) { this.numberForm.markAllAsTouched(); return; }
    this.loading.set(true);
    this.errorMsg.set(null);
    try {
      await this.svc.sendOtp(this.fullNumber());
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
      const mobile = this.fullNumber();
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
      await this.svc.resendOtp(this.fullNumber());
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
