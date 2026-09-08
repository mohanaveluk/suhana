import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { ProfileVisit, VisitStats } from '../models/profile-visit.model';

/**
 * Recently/frequently visited profiles for the authenticated member.
 * Every endpoint behind this service requires auth (JwtAuthGuard on the
 * backend controller) — callers must check AuthService.authenticated()
 * before calling in, rather than relying on this service to gate itself.
 */
@Injectable({ providedIn: 'root' })
export class ProfileVisitService {
  private readonly api = inject(ApiService);

  private readonly _profiles = signal<ProfileVisit[]>([]);
  private readonly _stats    = signal<VisitStats | null>(null);
  private readonly _loading  = signal(false);
  private readonly _error    = signal<string | null>(null);
  private readonly _total    = signal(0);

  readonly profiles = this._profiles.asReadonly();
  readonly stats    = this._stats.asReadonly();
  readonly loading  = this._loading.asReadonly();
  readonly error    = this._error.asReadonly();
  readonly total    = this._total.asReadonly();

  async getRecentProfiles(page = 1, limit = 20): Promise<ProfileVisit[]> {
    return this.load(() => this.api.getRecentProfileVisits(page, limit));
  }

  async getFrequentProfiles(page = 1, limit = 20): Promise<ProfileVisit[]> {
    return this.load(() => this.api.getFrequentProfileVisits(page, limit));
  }

  async getVisitStats(): Promise<VisitStats | null> {
    try {
      const stats = await firstValueFrom(this.api.getProfileVisitStats());
      this._stats.set(stats);
      return stats;
    } catch {
      // Non-critical — the stats tile just won't render; the profile list still works.
      return null;
    }
  }

  /** Removes one profile from history and drops it from the local list immediately. */
  async deleteProfile(profileId: string): Promise<boolean> {
    const previous = this._profiles();
    this._profiles.set(previous.filter(p => p.profileId !== profileId)); // optimistic
    try {
      await firstValueFrom(this.api.deleteProfileVisit(profileId));
      this._total.update(n => Math.max(0, n - 1));
      return true;
    } catch {
      this._profiles.set(previous); // roll back
      return false;
    }
  }

  /** Clears the whole history and empties the local list immediately. */
  async clearHistory(): Promise<boolean> {
    const previous = this._profiles();
    this._profiles.set([]);
    try {
      await firstValueFrom(this.api.clearProfileVisitHistory());
      this._total.set(0);
      return true;
    } catch {
      this._profiles.set(previous); // roll back
      return false;
    }
  }

  private async load(fetch: () => ReturnType<ApiService['getRecentProfileVisits']>): Promise<ProfileVisit[]> {
    this._loading.set(true);
    this._error.set(null);
    try {
      const res = await firstValueFrom(fetch());
      const data = res?.data ?? [];
      this._profiles.set(data);
      this._total.set(res?.total ?? data.length);
      return data;
    } catch (err: any) {
      this._error.set(err?.error?.message ?? 'Could not load recently visited profiles.');
      this._profiles.set([]);
      this._total.set(0);
      return [];
    } finally {
      this._loading.set(false);
    }
  }
}
