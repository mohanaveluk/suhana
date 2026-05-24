import { Component, ChangeDetectionStrategy, signal, OnInit, OnDestroy, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TitleCasePipe } from '@angular/common';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';
import { MaterialModule } from '../../shared/modules/material.module';
import { BannerSlide, Testimonial, UserProfile } from '../../models/user.model';
import { ProfileService } from '../../services';

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink, TitleCasePipe, MaterialModule,
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class HomeComponent implements OnInit, OnDestroy {
  private readonly profileService = inject(ProfileService);
  private readonly sanitizer = inject(DomSanitizer);
  private bannerInterval: ReturnType<typeof setInterval> | null = null;

  protected readonly currentSlide = signal(0);
  protected readonly hoveredCard = signal<string | null>(null);

  protected readonly bannerSlides: BannerSlide[] = [
    {
      id: 1,
      imageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1600&h=600&fit=crop',
      title: 'Find Your Perfect Match',
      subtitle: 'AI-powered matchmaking that understands your heart\'s desires',
      ctaText: 'Start Your Journey',
      ctaLink: '/register',
    },
    {
      id: 2,
      imageUrl: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=1600&h=600&fit=crop',
      title: 'Where Traditions Meet Modern Love',
      subtitle: 'Trusted by thousands of families since 2024',
      ctaText: 'Browse Profiles',
      ctaLink: '/search',
    },
    {
      id: 3,
      imageUrl: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1600&h=600&fit=crop',
      title: '92% Compatibility Match',
      subtitle: 'Smart insights powered by AI tell you exactly why you\'re meant to be',
      ctaText: 'See Your Matches',
      ctaLink: '/matchmaking',
    },
  ];

  protected readonly featuredProfiles = signal<UserProfile[]>([]);

  protected readonly testimonials: Testimonial[] = [
    { id: 1, name: 'Priya & Arjun', partnerName: '', photo: 'https://randomuser.me/api/portraits/women/32.jpg', quote: 'Suhana\'s AI matching found us a 94% compatibility match. We connected over shared love for travel and family values. Getting married next month!', matchDate: 'March 2026' },
    { id: 2, name: 'Meera & Karthik', partnerName: '', photo: 'https://randomuser.me/api/portraits/women/44.jpg', quote: 'We were skeptical about online matchmaking, but the compatibility insights were so accurate. The platform respects tradition while embracing modern expectations.', matchDate: 'January 2026' },
    { id: 3, name: 'Aisha & Rahul', partnerName: '', photo: 'https://randomuser.me/api/portraits/women/68.jpg', quote: 'The video introduction feature helped us see each other\'s personalities before we even met. The icebreaker chat made the first conversation so easy!', matchDate: 'February 2026' },
  ];

  protected readonly features = [
    { icon: 'psychology', title: 'AI-Powered Matching', desc: 'Smart algorithms analyze 50+ parameters to find your ideal partner with detailed compatibility scores.' },
    { icon: 'verified_user', title: 'Verified Profiles', desc: 'Every profile undergoes thorough verification for authenticity, giving you peace of mind.' },
    { icon: 'lock', title: 'Privacy Controls', desc: 'You control who sees your photos. Choose from mutual matches, premium members, or approval-based access.' },
    { icon: 'auto_awesome', title: 'Horoscope Matching', desc: 'Optional Kundli Milan integration for traditional compatibility checks based on birth details.' },
    { icon: 'videocam', title: 'Video Introductions', desc: 'Upload 30-60 second videos to showcase your personality and build trust before meeting.' },
    { icon: 'chat_bubble', title: 'Smart Chat', desc: 'Chat unlocks on mutual interest with AI-suggested icebreakers to kick off great conversations.' },
  ];

  protected readonly stats = [
    { value: '2M+', label: 'Verified Profiles' },
    { value: '50K+', label: 'Successful Matches' },
    { value: '92%', label: 'Avg. Compatibility' },
    { value: '4.8', label: 'User Rating' },
  ];

  async ngOnInit(): Promise<void> {
    await this.profileService.loadProfiles();
    const allProfiles = this.profileService.allProfiles();
    const brides = allProfiles.filter((p: UserProfile) => p.gender === 'bride').slice(0, 4);
    const grooms = allProfiles.filter((p: UserProfile) => p.gender === 'groom').slice(0, 4);
    this.featuredProfiles.set([...brides, ...grooms].slice(0, 8));

    this.bannerInterval = setInterval(() => {
      this.currentSlide.update(i => (i + 1) % this.bannerSlides.length);
    }, 5000);
  }

  ngOnDestroy(): void {
    if (this.bannerInterval) clearInterval(this.bannerInterval);
  }

  goToSlide(index: number): void {
    this.currentSlide.set(index);
  }

  setHoveredCard(id: string | null): void {
    this.hoveredCard.set(id);
  }

  protected cardBg(url: string | undefined): SafeStyle {
    return this.sanitizer.bypassSecurityTrustStyle(`url('${url || '/avatar-default.svg'}')`);
  }
}
