import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MaterialModule } from '../../../../shared/modules/material.module';
import { AuthService } from '../../../../services/auth.service';

/** Public "For Providers" landing page (/providers). Marketing copy describes only real features. */
@Component({
  selector: 'app-providers-landing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialModule, RouterLink],
  templateUrl: './providers-landing.page.html',
  styleUrl: './providers-landing.page.scss',
})
export class ProvidersLandingPage {
  protected readonly auth = inject(AuthService);

  protected readonly audiences = [
    { title: 'Astrologers', text: 'Kundli, horoscope matching, dosha and muhurtham consultations.', image: '/providers/astrologer.webp', icon: 'auto_awesome' },
    { title: 'Wedding planners', text: 'Full planning, coordination and décor for the big day.', image: '/providers/planner.webp', icon: 'event_available' },
    { title: 'Venues & halls', text: 'Kalyana mandapams, banquet halls, lawns and ballrooms.', image: '/providers/venue.webp', icon: 'account_balance' },
    { title: 'Photographers', text: 'Candid, traditional and cinematic wedding coverage.', image: '/providers/photographer.webp', icon: 'photo_camera' },
  ];

  protected readonly steps = [
    { icon: 'person_add', title: 'Register your business', text: 'Business name, contact details and your main category. Takes two minutes.' },
    { icon: 'mark_email_read', title: 'Verify your email', text: 'We send a link to confirm the address belongs to you.' },
    { icon: 'edit_note', title: 'Build your profile', text: 'Services and prices, locations, hours, languages and photos. Save and come back any time.' },
    { icon: 'fact_check', title: 'Submit for review', text: 'Our team reviews every listing before it goes live in Aurora Discover.' },
  ];

  protected readonly benefits = [
    { icon: 'travel_explore', title: 'Be found nearby', text: 'Members search by ZIP/PIN code, city or their location across India and the United States.' },
    { icon: 'balance', title: 'Fair, transparent ranking', text: 'Order is based on distance, reviews, experience and verification — placement is never sold.' },
    { icon: 'verified', title: 'Earn a verified badge', text: 'Once we confirm your business details, your listing shows “Verified listing”.' },
    { icon: 'tune', title: 'Stay in control', text: 'Update services, prices, hours and photos yourself from your dashboard.' },
  ];
}
