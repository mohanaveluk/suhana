import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { SafetyTip, FALLBACK_TIPS } from './safety-tips.model';

@Injectable({ providedIn: 'root' })
export class SafetyTipsService {
  private readonly api = inject(ApiService);

  readonly tips      = signal<SafetyTip[]>([]);
  readonly isLoading = signal(false);
  readonly error     = signal<string | null>(null);

  async loadTips(): Promise<void> {
    if (this.tips().length > 0) return;
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const res  = await firstValueFrom(this.api.getSafetyTips());
      const list: SafetyTip[] = res?.data ?? res ?? [];
      this.tips.set(list.length > 0 ? list : FALLBACK_TIPS);
    } catch {
      this.tips.set(FALLBACK_TIPS);
    } finally {
      this.isLoading.set(false);
    }
  }
}
