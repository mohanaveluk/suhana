import { Component, ChangeDetectionStrategy, inject, OnInit, signal } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { Router } from '@angular/router';
import { MaterialModule } from '../../shared/modules/material.module';
import { AdminService } from '../../services';
import { ProfileService } from '../../services';

@Component({
  selector: 'app-admin',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TitleCasePipe, MaterialModule,
  ],
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
})
export class AdminComponent implements OnInit {
  protected readonly profileService = inject(ProfileService);
  private readonly router = inject(Router);
  protected readonly adminService = inject(AdminService);
  protected readonly displayedColumns = ['photo', 'name', 'age', 'gender', 'location', 'status', 'actions'];
  protected readonly matchAnalytics = this.adminService.getMatchAnalytics();
  protected readonly registrationTrends = this.adminService.registrationTrends;

  // ── Profile list UI state ──────────────────────────────────────────────────
  protected readonly isLoadingProfiles = signal(false);
  protected readonly profilesError     = signal<string | null>(null);
  protected readonly searchTerm        = signal('');
  protected readonly genderFilter      = signal<'' | 'bride' | 'groom'>('');
  protected readonly statusFilter      = signal<'all' | 'active' | 'blocked'>('all');
  private searchDebounce?: ReturnType<typeof setTimeout>;

  protected readonly genderOptions = [
    { value: '',      label: 'All Genders' },
    { value: 'bride', label: 'Bride' },
    { value: 'groom', label: 'Groom' },
  ] as const;

  protected readonly statusOptions = [
    { value: 'all',     label: 'All Statuses' },
    { value: 'active',  label: 'Active' },
    { value: 'blocked', label: 'Blocked' },
  ] as const;

  protected getMax(data: number[]): number {
    return Math.max(...data);
  }

  async ngOnInit(): Promise<void> {
    await this.runProfileLoad(() => this.profileService.loadProfiles({ status: 'all' }));
    await this.adminService.loadStats();
    await this.adminService.loadMatchAnalytics();
    await this.adminService.loadRegistrationTrends();
  }

  // ── Pagination + Search ──────────────────────────────────────────────────────
  protected goToPage(page: number): void {
    void this.runProfileLoad(() => this.profileService.goToPage(page));
  }

  protected onSearchInput(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
    clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => this.applyFilters(), 350);
  }

  protected onGenderChange(value: '' | 'bride' | 'groom'): void {
    this.genderFilter.set(value);
    this.applyFilters();
  }

  protected onStatusChange(value: 'all' | 'active' | 'blocked'): void {
    this.statusFilter.set(value);
    this.applyFilters();
  }

  /** Push the current search term + gender + status filters to the server. */
  private applyFilters(): void {
    void this.runProfileLoad(() => this.profileService.applyFilters({
      query:  this.searchTerm(),
      gender: this.genderFilter(),
      status: this.statusFilter(),
    }));
  }

  /** Wraps a profile-list fetch with consistent loading + error state. */
  private async runProfileLoad(action: () => Promise<void>): Promise<void> {
    this.isLoadingProfiles.set(true);
    this.profilesError.set(null);
    try {
      await action();
    } catch {
      this.profilesError.set('Failed to load profiles. Please try again.');
    } finally {
      this.isLoadingProfiles.set(false);
    }
  }

  navigateToProfile(profileId: string): void {
    window.location.href = `/profile-view/${profileId}`;
  }

  navigateToAdminEdit(profileId: string): void {
    this.router.navigate(['/admin/edit-profile', profileId]);
  }
}
