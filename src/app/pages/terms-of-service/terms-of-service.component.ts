import {
  Component, ChangeDetectionStrategy, signal, HostListener, inject,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MaterialModule } from '../../shared/modules/material.module';

interface TocItem { id: string; label: string; }

@Component({
  selector: 'app-terms-of-service',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MaterialModule],
  templateUrl: './terms-of-service.component.html',
  styleUrl: './terms-of-service.component.scss',
})
export class TermsOfServiceComponent {
  private readonly router = inject(Router);

  protected readonly effectiveDate = 'June 1, 2025';
  protected readonly lastUpdated   = 'June 6, 2026';
  protected readonly year          = new Date().getFullYear();
  protected readonly showBackToTop = signal(false);
  protected readonly activeSection = signal('acceptance');

  protected readonly toc: TocItem[] = [
    { id: 'acceptance',         label: '1. Acceptance of Terms' },
    { id: 'eligibility',        label: '2. Eligibility' },
    { id: 'registration',       label: '3. Account Registration' },
    { id: 'user-responsibilities', label: '4. User Responsibilities' },
    { id: 'profile-guidelines', label: '5. Profile Guidelines' },
    { id: 'prohibited',         label: '6. Prohibited Activities' },
    { id: 'membership',         label: '7. Premium Membership' },
    { id: 'payment',            label: '8. Payment Terms' },
    { id: 'refund',             label: '9. Refund Policy' },
    { id: 'communication',      label: '10. Communication Features' },
    { id: 'intellectual',       label: '11. Intellectual Property' },
    { id: 'privacy',            label: '12. Privacy & Data' },
    { id: 'suspension',         label: '13. Account Suspension' },
    { id: 'liability',          label: '14. Limitation of Liability' },
    { id: 'availability',       label: '15. Service Availability' },
    { id: 'dispute',            label: '16. Dispute Resolution' },
    { id: 'governing-law',      label: '17. Governing Law' },
    { id: 'changes',            label: '18. Changes to Terms' },
    { id: 'contact',            label: '19. Contact Us' },
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
    window.print();
  }

  protected openSocial(url: string): void {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  protected goHome(): void {
    this.router.navigate(['/']);
  }
}
