import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TitleCasePipe, DatePipe, LowerCasePipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MaterialModule } from '../../shared/modules/material.module';
import { ProfileService, AuthService, MatchService } from '../../services';
import { UserProfile, MatchResult, MembershipTier, ProfileTrustIndicator } from '../../models/user.model';
import { MatchFixedService } from '../../features/match-fixed/match-fixed.service';
import { MatchFixedResponse, MATCH_SOURCE_LABELS } from '../../features/match-fixed/models/match-fixed.model';
import { MobileVerificationService } from '../../services/mobile-verification.service';
import { ProfileTrustIndicatorService } from '../../services/profile-trust-indicator.service';
import {
  MobileVerificationDialogComponent,
  MobileVerificationDialogData,
  MobileVerificationDialogResult,
} from './mobile-verification-dialog/mobile-verification-dialog.component';
import {
  VoiceIntroductionDialogComponent,
  VoiceIntroductionDialogData,
  VoiceIntroductionDialogResult,
} from './voice-introduction-dialog/voice-introduction-dialog.component';


@Component({
  selector: 'app-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink, TitleCasePipe, DatePipe, LowerCasePipe, MaterialModule,
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class ProfileComponent implements OnInit {
  private readonly profileService         = inject(ProfileService);
  private readonly matchService           = inject(MatchService);
  protected readonly auth                 = inject(AuthService);
  private readonly matchFixedService      = inject(MatchFixedService);
  private readonly mobileVerifSvc         = inject(MobileVerificationService);
  private readonly trustSvc               = inject(ProfileTrustIndicatorService);
  private readonly dialog                 = inject(MatDialog);

  protected readonly isLoading    = signal(true);
  protected readonly profile      = signal<UserProfile | null>(null);
  protected readonly topMatch     = signal<MatchResult | null>(null);
  protected readonly matchRecord  = signal<MatchFixedResponse | null | undefined>(undefined);
  protected readonly sourceLabels = MATCH_SOURCE_LABELS;
  protected readonly trustIndicator = signal<ProfileTrustIndicator | null>(null);
  protected readonly mobileStatus   = this.mobileVerifSvc.status;

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

    // Load match-fixed status (null = no record, undefined = loading)
    const mf = await this.matchFixedService.getMyMatchFixed();
    this.matchRecord.set(mf);

    // Load mobile verification status and trust indicator in parallel
    const profileId = this.profile()?.userId ?? '';
    await Promise.allSettled([
      this.mobileVerifSvc.loadStatus(),
      this.trustSvc.get(profileId).then(ti => this.trustIndicator.set(ti)),
    ]);

    this.isLoading.set(false);
  }

  protected openVerifyMobileDialog(): void {
    const mobile = this.auth.user()?.mobile ?? '';
    const ref = this.dialog.open(MobileVerificationDialogComponent, {
      data: { mobileNumber: mobile } satisfies MobileVerificationDialogData,
      width: '480px',
      maxWidth: '96vw',
      panelClass: 'suhana-dialog',
      disableClose: true,
    });
    ref.afterClosed().subscribe((result: MobileVerificationDialogResult | null) => {
      if (result?.verified) {
        this.profile.update(p => p ? { ...p, isMobileVerified: true } : p);
      }
    });
  }

  protected openVoiceIntroDialog(): void {
    const ref = this.dialog.open(VoiceIntroductionDialogComponent, {
      data: { existingUrl: this.profile()?.voiceIntroductionUrl } satisfies VoiceIntroductionDialogData,
      width: '540px',
      maxWidth: '96vw',
      panelClass: 'suhana-dialog',
      disableClose: false,
    });
    ref.afterClosed().subscribe(async (result: VoiceIntroductionDialogResult | null) => {
      if (result?.url) {
        await this.profileService.updateVoiceIntroductionUrl(result.url);
        this.profile.update(p => p ? { ...p, voiceIntroductionUrl: result.url } : p);
      }
    });
  }

  protected trustLabel(level: string): string {
    if (level === 'GREEN_FLAG') return 'Highly Active Profile';
    if (level === 'YELLOW_FLAG') return 'Moderately Active Profile';
    return 'Low Activity Profile';
  }

  protected trustIcon(level: string): string {
    if (level === 'GREEN_FLAG') return 'verified';
    if (level === 'YELLOW_FLAG') return 'info';
    return 'warning';
  }

  protected trustTooltip(level: string): string {
    if (level === 'GREEN_FLAG') return 'This profile is actively maintained and frequently updated.';
    if (level === 'YELLOW_FLAG') return 'This profile has been updated occasionally.';
    return 'This profile has not been updated recently.';
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
