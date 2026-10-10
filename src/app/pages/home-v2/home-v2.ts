import {
  ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, signal, viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MaterialModule } from '../../shared/modules/material.module';
import { BannerSlide, UserProfile } from '../../models/user.model';
import { AuthService, ProfileService } from '../../services';
import { MatchFixedService } from '../../features/match-fixed/match-fixed.service';
import { SuccessStoryResponse } from '../../features/match-fixed/models/success-story.model';
import { SuccessStoryDialogComponent } from '../../features/match-fixed/success-story-dialog/success-story-dialog.component';
import { SuccessStatsComponent } from '../../features/match-fixed/success-stats/success-stats.component';
import { FeaturedTestimonialsComponent } from '../../features/testimonials/components/featured-testimonials/featured-testimonials.component';
import { ProfileOrbitComponent } from './components/profile-orbit/profile-orbit';
import { StoryUniverseComponent } from './components/story-universe/story-universe';
import { LoveWallComponent } from './components/love-wall/love-wall';
import { RecentRailComponent } from './components/recent-rail/recent-rail';
import { prefersReducedMotion } from './utils/motion.util';

/**
 * Aurora Matrimony — alternate home page (route: /home-v2). Reuses the same services, models and
 * story dialog as the original home page; it only owns presentation and orchestration.
 */
@Component({
  selector: 'app-home-v2',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink, MaterialModule,
    ProfileOrbitComponent, StoryUniverseComponent, LoveWallComponent, RecentRailComponent,
    SuccessStatsComponent, FeaturedTestimonialsComponent,
  ],
  templateUrl: './home-v2.html',
  styleUrl: './home-v2.scss',
})
export class HomeV2Component implements OnInit {
  private readonly profileService = inject(ProfileService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly matchFixed = inject(MatchFixedService);

  private readonly rail = viewChild(RecentRailComponent);

  protected readonly isAuthenticated = this.auth.authenticated;

  // ── Hero (same slides as the original home page) ──────────────────────────
  protected readonly bannerSlides: BannerSlide[] = [
    { id: 1, imageUrl: '/banners/banner4.png', title: 'Find Your Perfect Match', subtitle: 'AI-powered matchmaking that understands your heart\'s desires', ctaText: 'Start Your Journey', ctaLink: '/register' },
    { id: 2, imageUrl: '/banners/banner5.png', title: 'Where Traditions Meet Modern Love', subtitle: 'Trusted by thousands of families since 2024', ctaText: 'Browse Profiles', ctaLink: '/search' },
    { id: 3, imageUrl: '/banners/banner6.png', title: 'Compatibility, Explained', subtitle: 'Smart insights powered by AI tell you exactly why you\'re meant to be', ctaText: 'See Your Matches', ctaLink: '/matchmaking' },
    { id: 4, imageUrl: '/banners/banner7.png', title: 'AI-Powered Horoscope Match', subtitle: 'Get Kundli matching, compatibility scores, and dosha analysis based on Vedic astrology.', ctaText: 'See Your Compatibility', ctaLink: '/matchmaking' },
    { id: 5, imageUrl: '/banners/banner8.png', title: '', subtitle: '', ctaText: '', ctaLink: '' },
  ];
  protected readonly currentSlide = signal(0);
  protected readonly slideHeld = signal(false);
  protected readonly slide = computed(() => this.bannerSlides[this.currentSlide()]);

  // ── Featured profiles ───────────────────────────────────────────────────
  protected readonly featuredProfiles = signal<UserProfile[]>([]);
  protected readonly profilesLoading = signal(true);
  protected readonly profilesError = signal(false);

  // ── Stories ───────────────────────────────────────────────────────────────
  protected readonly featuredStories = signal<SuccessStoryResponse[]>([]);
  protected readonly featuredLoading = signal(true);
  protected readonly wallStories = signal<SuccessStoryResponse[]>([]);
  protected readonly wallLoading = signal(true);
  protected readonly wallError = signal(false);

  protected readonly steps = [
    { icon: 'person_add', title: 'Create Profile', desc: 'Register as a bride or groom and complete your profile with preferences, photos, and family details.' },
    { icon: 'search', title: 'Discover Matches', desc: 'Our AI analyzes 50+ parameters to suggest highly compatible matches.' },
    { icon: 'compare', title: 'Compare & Connect', desc: 'View detailed compatibility scores, compare side-by-side, and express interest.' },
    { icon: 'favorite', title: 'Begin Your Story', desc: 'Chat with smart icebreakers, share introductions, and start your journey together.' },
  ];

  constructor() {
    // Hero auto-advance: one timeout per slide, cleared by onCleanup on change/destroy.
    effect(onCleanup => {
      this.currentSlide();
      if (this.slideHeld() || prefersReducedMotion()) return;
      const t = setTimeout(() => this.currentSlide.update(i => (i + 1) % this.bannerSlides.length), 6000);
      onCleanup(() => clearTimeout(t));
    });

    // Recent connections: fetch only for signed-in members, and again if the member signs in later.
    effect(() => {
      if (this.auth.authenticated() && this.rail()) void this.rail()!.reload();
    });
  }

  ngOnInit(): void {
    void this.loadProfiles();
    void this.loadFeatured();
    void this.loadWall();
  }

  protected async loadProfiles(): Promise<void> {
    this.profilesLoading.set(true);
    this.profilesError.set(false);
    try {
      await this.profileService.loadProfiles();
      const all = this.profileService.allProfiles();
      const brides = all.filter(p => p.gender === 'bride').slice(0, 4);
      const grooms = all.filter(p => p.gender === 'groom').slice(0, 4);
      // Interleave so the arc alternates between brides and grooms.
      const mixed: UserProfile[] = [];
      for (let i = 0; i < Math.max(brides.length, grooms.length); i++) {
        if (brides[i]) mixed.push(brides[i]);
        if (grooms[i]) mixed.push(grooms[i]);
      }
      this.featuredProfiles.set(mixed);
    } catch {
      this.profilesError.set(true);
    } finally {
      this.profilesLoading.set(false);
    }
  }

  protected async loadFeatured(): Promise<void> {
    this.featuredLoading.set(true);
    this.featuredStories.set(await this.matchFixed.getFeaturedStories());
    this.featuredLoading.set(false);
  }

  protected async loadWall(): Promise<void> {
    this.wallLoading.set(true);
    this.wallError.set(false);
    try {
      const res = await this.matchFixed.getPublicStories({ page: 1, limit: 12 });
      this.wallStories.set(res?.data ?? []);
      // getPublicStories swallows API errors and returns an empty page; the service records the message.
      this.wallError.set(!!this.matchFixed.error() && this.wallStories().length === 0);
    } catch {
      this.wallError.set(true);
    } finally {
      this.wallLoading.set(false);
    }
  }

  protected goToSlide(i: number): void { this.currentSlide.set(i); }
  protected setSlideHeld(v: boolean): void { this.slideHeld.set(v); }

  /** Same routing rule as the original home page, but through the router (no full page reload). */
  protected openProfile(profile: UserProfile): void {
    if (this.auth.isAuthenticated() && profile.userId) {
      void this.router.navigate(['/profile-view', profile.userId]);
    } else if (profile.profileCode) {
      void this.router.navigate(['/view', profile.profileCode]);
    } else {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: '/home-v2' } });
    }
  }

  protected openStory(story: SuccessStoryResponse): void {
    this.dialog.open(SuccessStoryDialogComponent, {
      data: story,
      width: '820px',
      maxWidth: '98vw',
      maxHeight: '92vh',
      panelClass: 'story-dialog-panel',
    });
  }
}
