import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
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
  private readonly profileService = inject(ProfileService);
  private readonly router = inject(Router);
  protected readonly adminService = inject(AdminService);
  protected readonly displayedColumns = ['photo', 'name', 'age', 'gender', 'location', 'status', 'actions'];
  protected readonly matchAnalytics = this.adminService.getMatchAnalytics();
  protected readonly registrationTrends = this.adminService.registrationTrends;

  protected getMax(data: number[]): number {
    return Math.max(...data);
  }

  async ngOnInit(): Promise<void> {
    await this.profileService.loadProfiles({status: 'all'});
    await this.adminService.loadStats();
    await this.adminService.loadMatchAnalytics();
    await this.adminService.loadRegistrationTrends();
  }

  navigateToProfile(profileId: string): void {
    window.location.href = `/profile-view/${profileId}`;
  }

  navigateToAdminEdit(profileId: string): void {
    this.router.navigate(['/admin/edit-profile', profileId]);
  }
}
