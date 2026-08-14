import { Component, ChangeDetectionStrategy, computed, inject, OnInit, signal } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MaterialModule } from '../../shared/modules/material.module';
import { AdminService } from '../../services';
import { ProfileService } from '../../services';
import { AuthService } from '../../services/auth.service';

/** One entry in the admin navigation hub. Every route already exists. */
export interface AdminLink {
  title: string;
  description: string;
  icon: string;
  route: string;
  /** Short label for the Quick Access row. */
  short: string;
  /** Extra terms the search box should match on. */
  keywords: string;
}

const ADMIN_LINKS: AdminLink[] = [
  {
    title: 'Match Fixed Dashboard',
    description: 'Manage match-fixed workflows and approvals.',
    icon: 'favorite',
    route: '/match-fixed/admin',
    short: 'Match Fixed',
    keywords: 'match fixed workflow approval matchmaking',
  },
  {
    title: 'Testimonials Review Dashboard',
    description: 'Review and moderate testimonials.',
    icon: 'rate_review',
    route: '/testimonials/admin',
    short: 'Testimonials',
    keywords: 'testimonial review moderate success story rating',
  },
  {
    title: 'Feedback Management',
    description: 'Review user feedback and complaints.',
    icon: 'feedback',
    route: '/admin/feedback',
    short: 'Feedback',
    keywords: 'feedback complaint support ticket',
  },
  {
    title: 'AI Search Analytics',
    description: 'View AI search trends and analytics.',
    icon: 'analytics',
    route: '/admin/search-analytics',
    short: 'Analytics',
    keywords: 'ai search analytics trends fallback insights reports',
  },
];

@Component({
  selector: 'app-admin',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TitleCasePipe, MaterialModule, RouterModule,
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
  protected readonly adminLinks = ADMIN_LINKS;
  protected readonly hubSearch = signal('');

  protected readonly filteredLinks = computed<AdminLink[]>(() => {
    const q = this.hubSearch().trim().toLowerCase();
    if (!q) return ADMIN_LINKS;
    return ADMIN_LINKS.filter(l =>
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
    // Non-admins get the permission notice instead — don't fire admin-only calls.
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
