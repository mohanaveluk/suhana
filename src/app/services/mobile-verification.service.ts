import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { MobileVerificationStatus } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class MobileVerificationService {
  private readonly api = inject(ApiService);

  private readonly _status = signal<MobileVerificationStatus | null>(null);
  readonly status = this._status.asReadonly();

  async loadStatus(): Promise<void> {
    try {
      const s = await firstValueFrom(this.api.getMobileVerificationStatus());
      this._status.set(s);
    } catch {
      this._status.set(null);
    }
  }

  async sendOtp(mobileNumber: string): Promise<void> {
    await firstValueFrom(this.api.sendMobileVerification(mobileNumber));
  }

  async verifyOtp(mobileNumber: string, otpCode: string): Promise<void> {
    await firstValueFrom(this.api.verifyMobileOtp(mobileNumber, otpCode));
    this._status.set({ mobileNumber, isMobileVerified: true });
  }

  async resendOtp(mobileNumber: string): Promise<void> {
    await firstValueFrom(this.api.resendMobileVerification(mobileNumber));
  }

  markVerified(mobileNumber: string): void {
    this._status.set({ mobileNumber, isMobileVerified: true });
  }
}
