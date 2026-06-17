import {
  Component, ChangeDetectionStrategy, signal, HostListener, inject,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MaterialModule } from '../../shared/modules/material.module';

interface TocItem { id: string; label: string; }

@Component({
  selector: 'app-privacy-policy',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MaterialModule],
  templateUrl: './privacy-policy.component.html',
  styleUrl: './privacy-policy.component.scss',
})
export class PrivacyPolicyComponent {
  private readonly router = inject(Router);

  protected readonly effectiveDate   = 'June 1, 2025';
  protected readonly lastUpdated     = 'June 6, 2026';
  protected readonly year            = new Date().getFullYear();
  protected readonly showBackToTop   = signal(false);
  protected readonly activeSection   = signal('introduction');

  protected readonly toc: TocItem[] = [
    { id: 'introduction',           label: '1. Introduction' },
    { id: 'information-collect',    label: '2. Information We Collect' },
    { id: 'how-we-use',             label: '3. How We Use Your Information' },
    { id: 'photo-visibility',       label: '4. Photo & Profile Visibility' },
    { id: 'cookies',                label: '5. Cookies & Tracking' },
    { id: 'account-security',       label: '6. Account Security' },
    { id: 'data-sharing',           label: '7. Data Sharing Policy' },
    { id: 'third-party',            label: '8. Third-Party Services' },
    { id: 'childrens-privacy',      label: '9. Children\'s Privacy' },
    { id: 'user-rights',            label: '10. Your Rights' },
    { id: 'data-retention',         label: '11. Data Retention' },
    { id: 'international',          label: '12. International Users' },
    { id: 'policy-updates',         label: '13. Policy Updates' },
    { id: 'contact',                label: '14. Contact Us' },
  ];

  protected readonly socialLinks = {
    facebookUrl:  'https://facebook.com/suhanamatrimony',
    instagramUrl: 'https://instagram.com/suhanamatrimony',
    youtubeUrl:   'https://youtube.com/@suhanamatrimony',
    twitterUrl:   'https://x.com/suhanamatrimony',
  };

  @HostListener('window:scroll')
  onScroll(): void {
    this.showBackToTop.set(window.scrollY > 400);
  }

  protected scrollTo(id: string): void {
    this.activeSection.set(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  protected backToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected printPage(): void {
    window.print();
  }

  protected downloadPdf(): void {
    // Placeholder — wire to a server-side PDF endpoint when available
    window.print();
  }

  protected openSocial(url: string): void {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  protected goHome(): void {
    this.router.navigate(['/']);
  }
}
