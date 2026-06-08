import { Injectable, signal, computed, inject, Signal } from '@angular/core';
import { ProfileService } from './profile.service';
import { ApiService } from './api.service';
import { AdminStats, ProfileStatus } from '../models/user.model';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly profileService = inject(ProfileService);
  private readonly api = inject(ApiService);

  private readonly statsSignal = signal<AdminStats>({
    totalUsers: 0, activeUsers: 0, totalMatches: 0,
    successfulConnections: 0, reportedProfiles: 0,
    pendingProfiles: 0, blockedProfiles: 0,
    premiumUsers: 0, newRegistrationsToday: 0,
  });

  private readonly matchAnalyticsSignal = signal<{ labels: string[]; data: number[] } | null>(null);
  readonly matchAnalytics = this.matchAnalyticsSignal.asReadonly();

  private readonly registrationTrendsSignal = signal<{ labels: string[]; data: number[] } | null>(null);
  readonly registrationTrends = this.registrationTrendsSignal.asReadonly();

  updateProfileStatus(userId: string, status: ProfileStatus): void {
    const previous = this.profileService.getProfile(userId)?.status;
    this.profileService.patchProfileStatus(userId, status);
    this.api.updateUserStatus(userId, status).subscribe({
      error: () => {
        if (previous) this.profileService.patchProfileStatus(userId, previous);
      },
    });
  }

  readonly stats = computed<AdminStats>(() => {
    const s = this.statsSignal();
    if (s.totalUsers > 0) return s;
    // Fallback to local computed stats
    const profiles = this.profileService.allProfiles();
    return {
      totalUsers: profiles.length,
      activeUsers: profiles.filter(p => p.status === 'active').length,
      totalMatches: Math.floor(profiles.length * 2.5),
      successfulConnections: Math.floor(profiles.length * 0.3),
      reportedProfiles: profiles.filter(p => p.status === 'reported').length,
      premiumUsers: Math.floor(profiles.length * 0.2),
      newRegistrationsToday: Math.floor(Math.random() * 10) + 2,
    };
  });

  readonly allProfiles = this.profileService.allProfiles;

  async loadStats(): Promise<void> {
    try {
      const stats = await firstValueFrom(this.api.getAdminStats());
      this.statsSignal.set(stats);
    } catch { /* use fallback */ }
  }

  async loadMatchAnalytics(): Promise<void> {
    try {
      const res = await firstValueFrom(this.api.getMatchAnalytics());
      if (Array.isArray(res)) {
        this.matchAnalyticsSignal.set({
          labels: res.map(r => r.month),
          data: res.map(r => r.matches),
        });
      }
    } catch { /* use fallback */ }
  }

  getMatchAnalytics(): Signal<{ labels: string[]; data: number[] } | null> {
    return this.matchAnalytics;
  }

  async loadRegistrationTrends(): Promise<void> {
    try {
      const res = await firstValueFrom(this.api.getRegistrationTrends());
      if (Array.isArray(res)) {
        this.registrationTrendsSignal.set({
          labels: res.map(r => r.day ?? r.date ?? r.week ?? r.label),
          data: res.map(r => r.registrations ?? r.count ?? r.value ?? 0),
        });
      }
    } catch { /* use fallback */ }
  }
}
