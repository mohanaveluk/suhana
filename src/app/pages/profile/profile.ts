import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TitleCasePipe, DatePipe } from '@angular/common';
import { MaterialModule } from '../../shared/modules/material.module';
import { ProfileService, AuthService, MatchService } from '../../services';
import { UserProfile, MatchResult, MembershipTier } from '../../models/user.model';

@Component({
  selector: 'app-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink, TitleCasePipe, DatePipe, MaterialModule,
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class ProfileComponent implements OnInit {
  private readonly profileService = inject(ProfileService);
  private readonly matchService  = inject(MatchService);
  private readonly auth          = inject(AuthService);

  protected readonly isLoading = signal(true);
  protected readonly profile   = signal<UserProfile | null>(null);
  protected readonly topMatch  = signal<MatchResult | null>(null);

  protected readonly membership = computed<MembershipTier>(() =>
    this.profile()?.user?.membership ?? this.auth.user()?.membership ?? 'free',
  );

  protected membershipIcon(tier: string): string {
    if (tier === 'platinum') return 'diamond';
    if (tier === 'gold')     return 'star';
    if (tier === 'silver')   return 'workspace_premium';
    return 'person_outline';
  }

  protected membershipUpgradeTarget(tier: MembershipTier): MembershipTier {
    if (tier === 'free')   return 'silver';
    if (tier === 'silver') return 'gold';
    return 'platinum';
  }

  protected onAvatarError(event: Event): void {
    (event.target as HTMLImageElement).src = '/avatar-default.svg';
  }

  async ngOnInit(): Promise<void> {
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

    const gender = this.profile()?.gender ?? 'bride';
    await this.matchService.loadMatchesFromApi();
    let matches = this.matchService.matches();
    if (matches.length === 0) {
      matches = this.matchService.generateMatches(gender, 4);
    }
    this.topMatch.set(matches[0] ?? null);
    this.isLoading.set(false);
  }

  protected compatClass(score: number): string {
    return score >= 80 ? 'strong' : score >= 65 ? 'medium' : 'low';
  }

  protected horoscopeDocIcon(url: string): string {
    const ext = url.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
    if (ext === 'pdf') return 'picture_as_pdf';
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'].includes(ext)) return 'image';
    return 'description';
  }

  protected horoscopeDocBadge(url: string): string {
    return url.split('?')[0].split('.').pop()?.toUpperCase() ?? 'DOC';
  }

  protected horoscopeDocFileName(url: string): string {
    return decodeURIComponent(url.split('?')[0].split('/').pop() ?? 'document');
  }
}
