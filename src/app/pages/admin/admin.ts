import { Component, ChangeDetectionStrategy, computed, inject, OnInit, signal } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MaterialModule } from '../../shared/modules/material.module';
import { AdminService } from '../../services';
import { ProfileService } from '../../services';
import { AuthService } from '../../services/auth.service';
import { AdminLayoutComponent } from './layout/admin-layout.component';
import { ADMIN_MODULES, AdminNavItem } from './admin-nav';

@Component({
  selector: 'app-admin',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TitleCasePipe, MaterialModule, RouterModule, AdminLayoutComponent,
  ],
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
})
export class AdminComponent implements OnInit {
  protected readonly profileService = inject(ProfileService);
  private readonly router = inject(Router);
  protected readonly adminService = inject(AdminService);
  protected readonly auth = inject(AuthService);

  // ── Navigation hub ─────────────────────────────────────────────────────────
  protected readonly adminLinks = ADMIN_MODULES;
  protected readonly hubSearch = signal('');

  protected readonly filteredLinks = computed<AdminNavItem[]>(() => {
    const q = this.hubSearch().trim().toLowerCase();
    if (!q) return ADMIN_MODULES;
    return ADMIN_MODULES.filter(l =>
      `${l.title} ${l.description} ${l.keywords}`.toLowerCase().includes(q));
  });

  /** Roles are stored lowercase ('admin'), so this reuses AuthService's check. */
  protected readonly isAdmin = this.auth.isAdmin;

  protected navigate(route: string): void {
    void this.router.navigateByUrl(route);
  }
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
    // The layout gates what renders, but this component's ngOnInit still runs
    // for a non-admin, so the admin-only fetches below need their own guard.
    // loadRole() shares one in-flight request with the layout's call.
    await this.auth.loadRole();
    if (!this.isAdmin()) return;

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
