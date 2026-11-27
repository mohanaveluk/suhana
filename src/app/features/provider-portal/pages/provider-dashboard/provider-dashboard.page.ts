import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { MaterialModule } from '../../../../shared/modules/material.module';
import { ApiService } from '../../../../services/api.service';
import {
  CLAIM_STATUS_LABELS, LISTING_STATUS_LABELS, ListingClaim, ProviderDashboard, ProviderListingSummary,
} from '../../models/provider-portal.model';
import { apiErrorMessage } from '../../../discover/utils/discover.utils';
import { configBySlug, providerLink } from '../../../discover/utils/category-config';
import { ProviderShellComponent } from '../../components/provider-shell/provider-shell.component';

/** /providers/dashboard — the provider's businesses, their review status, and ownership claims. */
@Component({
  selector: 'app-provider-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialModule, RouterLink, DatePipe, ProviderShellComponent],
  templateUrl: './provider-dashboard.page.html',
  styleUrl: './provider-dashboard.page.scss',
})
export class ProviderDashboardPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly snack = inject(MatSnackBar);

  protected readonly data = signal<ProviderDashboard | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal<string | null>(null);

  /** Not built yet — shown so providers know what's coming. */
  protected readonly tools = [
    { icon: 'forum', title: 'Customer enquiries', text: 'Messages from members interested in your services.' },
    { icon: 'event', title: 'Appointments', text: 'Consultation and visit requests.' },
    { icon: 'insights', title: 'Analytics', text: 'Listing views and enquiry trends.' },
  ];

  protected readonly statusLabels = LISTING_STATUS_LABELS;
  protected readonly claimLabels = CLAIM_STATUS_LABELS;
  protected readonly categoryName = (slug: string) => configBySlug(slug)?.name ?? slug;
  protected readonly categoryIcon = (slug: string) => configBySlug(slug)?.icon ?? 'storefront';
  protected readonly categoryImage = (slug: string) => configBySlug(slug)?.image ?? '/avatar-default.svg';
  protected readonly publicLink = (l: ProviderListingSummary) => providerLink(l.categorySlugs[0] ?? 'astrologer', l.id);

  protected readonly greeting = computed(() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  });
  protected readonly liveCount = computed(() => (this.data()?.listings ?? []).filter((l) => l.listingStatus === 'PUBLISHED').length);
  protected readonly pendingClaims = computed(() => (this.data()?.claims ?? []).filter((c) => c.status === 'PENDING').length);

  ngOnInit(): void {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.data.set(await firstValueFrom(this.api.getProviderDashboard()));
    } catch (err) {
      this.error.set(apiErrorMessage(err, 'Could not load your dashboard.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected checklistItems(l: ProviderListingSummary) {
    const c = l.checklist;
    return [
      { label: 'Category', done: c.category, required: true },
      { label: 'Location', done: c.location, required: true },
      { label: 'Description', done: c.about, required: true },
      { label: 'Contact', done: c.contact, required: true },
      { label: 'Services & prices', done: c.service, required: false },
      { label: 'Photos', done: c.photo, required: false },
    ];
  }

  protected canEdit(l: ProviderListingSummary): boolean {
    return l.listingStatus !== 'SUBMITTED';
  }

  protected async submit(l: ProviderListingSummary): Promise<void> {
    this.busy.set(l.id);
    try {
      await firstValueFrom(this.api.submitProviderListing(l.id));
      this.snack.open('Submitted! We’ll review your listing and let you know.', 'OK', { duration: 4000 });
      await this.load();
    } catch (err) {
      this.snack.open(apiErrorMessage(err, 'Could not submit the listing.'), 'OK', { duration: 6000 });
    } finally {
      this.busy.set(null);
    }
  }

  protected async withdraw(c: ListingClaim): Promise<void> {
    this.busy.set(c.id);
    try {
      await firstValueFrom(this.api.cancelListingClaim(c.id));
      this.snack.open('Claim withdrawn', 'OK', { duration: 2500 });
      await this.load();
    } catch (err) {
      this.snack.open(apiErrorMessage(err, 'Could not withdraw the claim.'), 'OK', { duration: 5000 });
    } finally {
      this.busy.set(null);
    }
  }
}
