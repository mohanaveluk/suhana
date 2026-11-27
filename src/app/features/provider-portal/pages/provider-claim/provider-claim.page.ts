import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { MaterialModule } from '../../../../shared/modules/material.module';
import { ApiService } from '../../../../services/api.service';
import { ClaimableListing } from '../../models/provider-portal.model';
import { apiErrorMessage } from '../../../discover/utils/discover.utils';
import { configBySlug } from '../../../discover/utils/category-config';
import { ProviderShellComponent } from '../../components/provider-shell/provider-shell.component';

/**
 * "Claim this business" (/providers/claim[/:providerId]). Finds an
 * admin-created listing and requests ownership; nothing changes until an
 * admin verifies and approves the claim.
 */
@Component({
  selector: 'app-provider-claim',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialModule, ReactiveFormsModule, RouterLink, ProviderShellComponent],
  templateUrl: './provider-claim.page.html',
  styleUrl: './provider-claim.page.scss',
})
export class ProviderClaimPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly snack = inject(MatSnackBar);

  protected readonly query = signal('');
  protected readonly results = signal<ClaimableListing[] | null>(null);
  protected readonly searching = signal(false);
  protected readonly selected = signal<ClaimableListing | null>(null);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly categoryName = (slug: string) => configBySlug(slug)?.name ?? slug;
  protected readonly categoryImage = (slug: string | undefined) => configBySlug(slug)?.image ?? '/avatar-default.svg';

  protected readonly form = this.fb.nonNullable.group({
    message: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(1000)]],
    contactName: [''],
    contactPhone: ['', Validators.pattern(/^\+?[0-9 ()-]{7,24}$/)],
    businessEmail: ['', Validators.email],
  });

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('providerId');
    if (!id) return;
    // Arrived from a listing's "Claim this business" button: load that listing.
    try {
      const p = await firstValueFrom(this.api.getDiscoverProvider(id, ''));
      if (!p.claimable) {
        this.error.set('This listing is already managed by its business, so it can’t be claimed.');
        return;
      }
      this.selected.set({
        id: p.id, displayName: p.displayName, businessName: p.businessName,
        place: p.place ? [p.place.city, p.place.state, p.place.country].filter(Boolean).join(', ') : null,
        categorySlugs: [p.categorySlug], photoUrl: p.photoUrl, myPendingClaim: false,
      });
    } catch (err) {
      this.error.set(apiErrorMessage(err, 'That listing could not be found.'));
    }
  }

  protected async search(): Promise<void> {
    const q = this.query().trim();
    if (q.length < 2) return;
    this.searching.set(true);
    this.error.set(null);
    try {
      this.results.set(await firstValueFrom(this.api.searchClaimableListings(q)));
    } catch (err) {
      this.error.set(apiErrorMessage(err, 'Search failed. Please try again.'));
    } finally {
      this.searching.set(false);
    }
  }

  protected choose(l: ClaimableListing): void {
    this.selected.set(l);
    this.error.set(null);
  }

  protected async submit(): Promise<void> {
    const l = this.selected();
    if (!l || this.form.invalid || this.saving()) return;
    this.saving.set(true);
    this.error.set(null);
    const v = this.form.getRawValue();
    try {
      await firstValueFrom(this.api.createListingClaim({
        providerId: l.id,
        message: v.message.trim(),
        contactName: v.contactName.trim() || null,
        contactPhone: v.contactPhone.trim() || null,
        businessEmail: v.businessEmail.trim() || null,
      }));
      this.snack.open('Claim submitted — we’ll verify and get back to you.', 'OK', { duration: 5000 });
      await this.router.navigate(['/providers/dashboard']);
    } catch (err) {
      this.error.set(apiErrorMessage(err, 'Could not submit the claim.'));
    } finally {
      this.saving.set(false);
    }
  }
}
