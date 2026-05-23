import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
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
  protected readonly adminService = inject(AdminService);
  protected readonly displayedColumns = ['photo', 'name', 'age', 'gender', 'location', 'status', 'actions'];
  protected readonly matchAnalytics = this.adminService.getMatchAnalytics();
  protected readonly registrationTrends = this.adminService.getRegistrationTrends();

  async ngOnInit(): Promise<void> {
    await this.profileService.loadProfiles();
    await this.adminService.loadStats();
  }
}
