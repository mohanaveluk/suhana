import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TitleCasePipe } from '@angular/common';
import { MaterialModule } from '../../shared/modules/material.module';
import { ProfileService } from '../../services';
import { AuthService } from '../../services';
import { UserProfile } from '../../models/user.model';

@Component({
  selector: 'app-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink, TitleCasePipe, MaterialModule,
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class ProfileComponent implements OnInit {
  private readonly profileService = inject(ProfileService);
  private readonly auth = inject(AuthService);

  protected readonly profile = signal<UserProfile | null>(null);

  protected onAvatarError(event: Event): void {
    (event.target as HTMLImageElement).src = '/avatar-default.svg';
  }

  async ngOnInit(): Promise<void> {
    // Try loading from API first
    await this.profileService.loadMyProfile();
    await this.profileService.loadProfiles();

    const myProfile = this.profileService.myProfile();
    if (myProfile) {
      this.profile.set(myProfile);
    } else {
      const allProfiles = this.profileService.allProfiles();
      if (allProfiles.length > 0) {
        this.profile.set(allProfiles[0]);
      }
    }
  }
}
