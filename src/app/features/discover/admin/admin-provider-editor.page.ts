import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { MaterialModule } from '../../../shared/modules/material.module';
import { ApiService } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import { AdminLayoutComponent } from '../../../pages/admin/layout/admin-layout.component';
import {
  AdminLocation, AdminProvider, ConsultationMode, CountryCode, DiscoverCategory, GeocodeSource, LocationInput,
  ProviderInput, VerificationStatus,
} from '../models/discover.model';
import {
  DISCOVER_COUNTRIES, LANGUAGE_LABELS, MODE_LABELS, SPECIALIZATION_LABELS, VERIFICATION_LABELS, WEEK_DAYS,
  apiErrorMessage,
} from '../utils/discover.utils';
import { NoteDialogComponent, NoteDialogData } from './admin-discover.page';
import { CategoryConfig, configBySlug } from '../utils/category-config';
import { CategoryDetailInput } from '../models/discover.model';

const GEOCODE_TEXT: Record<GeocodeSource, string> = {
  manual: 'coordinates entered manually',
  postal: 'located from the postal code',
  city: 'located from the city centre (approximate)',
  none: 'NOT located — add a valid postal code or coordinates so it appears in distance searches',
};

const optionalUrl = Validators.pattern(/^https?:\/\/\S+$/i);

@Component({
  selector: 'app-admin-provider-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialModule, ReactiveFormsModule, RouterLink, DatePipe, AdminLayoutComponent],
  templateUrl: './admin-provider-editor.page.html',
  styleUrl: './admin-provider-editor.page.scss',
})
export class AdminProviderEditorPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  protected readonly specializations = Object.entries(SPECIALIZATION_LABELS);
  protected readonly languages = Object.entries(LANGUAGE_LABELS);
  protected readonly modes = Object.entries(MODE_LABELS) as [ConsultationMode, { label: string }][];
  protected readonly countries = Object.entries(DISCOVER_COUNTRIES) as [CountryCode, { name: string; postalLabel: string }][];
  protected readonly weekDays = WEEK_DAYS;
  protected readonly statusLabels = VERIFICATION_LABELS;

  protected readonly id = signal<string | null>(null);
  protected readonly provider = signal<AdminProvider | null>(null);
  protected readonly categories = signal<DiscoverCategory[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly locBusy = signal<number | null>(null);
  protected readonly uploading = signal(false);
  protected readonly geocodeNotes = signal<string[]>([]);

  protected readonly form = this.fb.group({
    displayName: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(150)]),
    businessName: this.fb.control<string | null>(null, Validators.maxLength(150)),
    headline: this.fb.control<string | null>(null, Validators.maxLength(200)),
    about: this.fb.control<string | null>(null, Validators.maxLength(5000)),
    photoUrl: this.fb.control<string | null>(null, optionalUrl),
    email: this.fb.control<string | null>(null, Validators.email),
    phone: this.fb.control<string | null>(null, Validators.pattern(/^\+?[0-9 ()-]{7,24}$/)),
    website: this.fb.control<string | null>(null, optionalUrl),
    isActive: this.fb.nonNullable.control(true),
    acceptingClients: this.fb.nonNullable.control(true),
    categorySlugs: this.fb.nonNullable.control<string[]>(['astrologer'], Validators.required),
    languages: this.fb.nonNullable.control<string[]>([]),
    astrologer: this.fb.group({
      experienceYears: this.fb.control<number | null>(null, [Validators.min(0), Validators.max(80)]),
      specializations: this.fb.nonNullable.control<string[]>([]),
      availabilityNote: this.fb.control<string | null>(null, Validators.maxLength(255)),
      businessHours: this.fb.array<FormGroup>([]),
      certifications: this.fb.array<FormGroup>([]),
    }),
    services: this.fb.array<FormGroup>([]),
    locations: this.fb.array<FormGroup>([]),
    /** One group per selected non-astrologer category (typed attributes from CATEGORY_CONFIGS). */
    categoryDetails: this.fb.array<FormGroup>([]),
  });

  protected get categoryDetails(): FormArray<FormGroup> { return this.form.controls.categoryDetails; }
  protected cfgFor(slug: string): CategoryConfig | undefined { return configBySlug(slug); }
  protected specialtyOptions(slug: string): [string, string][] { return Object.entries(configBySlug(slug)?.specialties ?? {}); }

  constructor() {
    this.form.controls.categorySlugs.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((slugs) => this.syncCategoryDetails(slugs));
  }

  /** Keeps one details group per selected category (except astrologer), preserving entered values. */
  private syncCategoryDetails(slugs: string[], saved: CategoryDetailInput[] = []): void {
    const wanted = slugs.filter((s) => s !== 'astrologer' && configBySlug(s));
    const current = new Map(this.categoryDetails.controls.map((g) => [g.value.categorySlug as string, g]));
    this.categoryDetails.clear({ emitEvent: false });
    for (const slug of wanted) {
      const cfg = configBySlug(slug)!;
      const existing = current.get(slug);
      if (existing) { this.categoryDetails.push(existing, { emitEvent: false }); continue; }
      const prior = saved.find((d) => d.categorySlug === slug);
      const attrs: Record<string, unknown> = {};
      for (const a of cfg.attributes) {
        const v = prior?.attributes?.[a.key];
        attrs[a.key] = [a.type === 'bool' ? v === true : v ?? null, a.type === 'int' ? [Validators.min(0)] : []];
      }
      this.categoryDetails.push(this.fb.group({
        categorySlug: [slug],
        experienceYears: [prior?.experienceYears ?? null, [Validators.min(0), Validators.max(80)]],
        specialties: [prior?.specialties ?? []],
        attributes: this.fb.group(attrs),
      }), { emitEvent: false });
    }
  }

  protected get services(): FormArray<FormGroup> { return this.form.controls.services; }
  protected get locations(): FormArray<FormGroup> { return this.form.controls.locations; }
  protected get hours(): FormArray<FormGroup> { return this.form.controls.astrologer.controls.businessHours; }
  protected get certs(): FormArray<FormGroup> { return this.form.controls.astrologer.controls.certifications; }

  async ngOnInit(): Promise<void> {
    await this.auth.loadRole();
    if (!this.auth.isAdmin()) return;
    const id = this.route.snapshot.paramMap.get('id');
    this.id.set(id);
    try {
      this.categories.set(await firstValueFrom(this.api.getAdminDiscoverCategories()));
      if (id) {
        this.patch(await firstValueFrom(this.api.getAdminDiscoverProvider(id)));
      } else {
        this.addLocation();
      }
    } catch (err) {
      this.loadError.set(apiErrorMessage(err, 'Could not load this listing.'));
    } finally {
      this.loading.set(false);
    }
  }

  // ── Form rows ───────────────────────────────────────────────────────────

  private serviceGroup(s?: Partial<ProviderInput['services'][number]>): FormGroup {
    return this.fb.group({
      name: [s?.name ?? '', [Validators.required, Validators.maxLength(150)]],
      specialization: [s?.specialization ?? null],
      consultationMode: [s?.consultationMode ?? 'IN_PERSON', Validators.required],
      price: [s?.price ?? null, [Validators.min(0)]],
      currency: [s?.currency ?? null],
      durationMinutes: [s?.durationMinutes ?? null, [Validators.min(5), Validators.max(1440)]],
      description: [s?.description ?? null, Validators.maxLength(500)],
      isActive: [s?.isActive ?? true],
    });
  }

  private locationGroup(l?: Partial<AdminLocation>): FormGroup {
    return this.fb.group({
      id: [l?.id ?? null],
      label: [l?.label ?? null, Validators.maxLength(100)],
      addressLine1: [l?.addressLine1 ?? null, Validators.maxLength(255)],
      addressLine2: [l?.addressLine2 ?? null, Validators.maxLength(255)],
      city: [l?.city ?? '', [Validators.required, Validators.maxLength(100)]],
      state: [l?.state ?? null, Validators.maxLength(100)],
      postalCode: [l?.postalCode ?? null, Validators.maxLength(12)],
      country: [l?.country ?? 'IN', Validators.required],
      latitude: [l?.latitude ?? null, [Validators.min(-90), Validators.max(90)]],
      longitude: [l?.longitude ?? null, [Validators.min(-180), Validators.max(180)]],
      showStreetAddress: [l?.showStreetAddress ?? true],
      isPrimary: [l?.isPrimary ?? false],
      isActive: [l?.isActive ?? true],
    });
  }

  protected addService(): void { this.services.push(this.serviceGroup()); }
  protected removeService(i: number): void { this.services.removeAt(i); }
  protected addLocation(): void { this.locations.push(this.locationGroup({ isPrimary: this.locations.length === 0 })); }
  protected addHours(day = 'mon'): void {
    this.hours.push(this.fb.group({
      day: [day, Validators.required],
      open: ['09:00', [Validators.required, Validators.pattern(/^([01]\d|2[0-3]):[0-5]\d$/)]],
      close: ['18:00', [Validators.required, Validators.pattern(/^([01]\d|2[0-3]):[0-5]\d$/)]],
    }));
  }
  protected removeHours(i: number): void { this.hours.removeAt(i); }
  protected fillWeekHours(): void {
    this.hours.clear();
    ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'].forEach((d) => this.addHours(d));
  }
  protected addCert(c?: { name: string; issuer: string | null; year: number | null; verified: boolean }): void {
    this.certs.push(this.fb.group({
      name: [c?.name ?? '', [Validators.required, Validators.maxLength(150)]],
      issuer: [c?.issuer ?? null, Validators.maxLength(150)],
      year: [c?.year ?? null, [Validators.min(1900), Validators.max(2100)]],
      verified: [c?.verified ?? false],
    }));
  }
  protected removeCert(i: number): void { this.certs.removeAt(i); }

  private patch(p: AdminProvider): void {
    this.provider.set(p);
    this.form.patchValue({
      displayName: p.displayName, businessName: p.businessName, headline: p.headline, about: p.about,
      photoUrl: p.photoUrl, email: p.email, phone: p.phone, website: p.website, isActive: p.isActive,
      acceptingClients: p.acceptingClients, languages: p.languages,
      astrologer: {
        experienceYears: p.astrologer?.experienceYears ?? null,
        specializations: p.astrologer?.specializations ?? [],
        availabilityNote: p.astrologer?.availabilityNote ?? null,
      },
    });
    this.categoryDetails.clear({ emitEvent: false });
    this.form.controls.categorySlugs.setValue(p.categorySlugs, { emitEvent: false });
    this.syncCategoryDetails(p.categorySlugs, p.categoryDetails ?? []);
    this.services.clear();
    p.services.forEach((s) => this.services.push(this.serviceGroup(s)));
    this.locations.clear();
    p.locations.forEach((l) => this.locations.push(this.locationGroup(l)));
    this.hours.clear();
    (p.astrologer?.businessHours ?? []).forEach((h) => {
      this.addHours(h.day);
      this.hours.at(this.hours.length - 1).patchValue(h);
    });
    this.certs.clear();
    (p.astrologer?.certifications ?? []).forEach((c) => this.addCert(c));
    this.form.markAsPristine();
    if (p.geocoding?.length) {
      this.geocodeNotes.set(p.geocoding.map((g) => `${g.city}: ${GEOCODE_TEXT[g.source]}`));
    }
  }

  private payload(): ProviderInput {
    const v = this.form.getRawValue();
    const blank = (x: string | null | undefined) => (x && x.trim() ? x.trim() : null);
    return {
      displayName: v.displayName.trim(),
      businessName: blank(v.businessName),
      headline: blank(v.headline),
      about: blank(v.about),
      photoUrl: blank(v.photoUrl),
      email: blank(v.email),
      phone: blank(v.phone),
      website: blank(v.website),
      isActive: v.isActive,
      acceptingClients: v.acceptingClients,
      categorySlugs: v.categorySlugs,
      languages: v.languages,
      services: v.services.map((s) => ({
        name: s['name'], specialization: s['specialization'] || null, consultationMode: s['consultationMode'],
        price: s['price'] === '' || s['price'] === null ? null : Number(s['price']),
        currency: s['currency'] || null,
        durationMinutes: s['durationMinutes'] ? Number(s['durationMinutes']) : null,
        description: blank(s['description']), isActive: s['isActive'],
      })),
      astrologer: v.categorySlugs.includes('astrologer') ? {
        experienceYears: v.astrologer.experienceYears === null ? null : Number(v.astrologer.experienceYears),
        specializations: v.astrologer.specializations,
        availabilityNote: blank(v.astrologer.availabilityNote),
        businessHours: v.astrologer.businessHours.map((h) => ({ day: h['day'], open: h['open'], close: h['close'] })),
        certifications: v.astrologer.certifications.map((c) => ({
          name: c['name'], issuer: blank(c['issuer']), year: c['year'] ? Number(c['year']) : null, verified: !!c['verified'],
        })),
      } : undefined,
      categoryDetails: v.categoryDetails.map((d): CategoryDetailInput => {
        const cfg = configBySlug(d['categorySlug']);
        const attributes: Record<string, number | boolean | string> = {};
        for (const a of cfg?.attributes ?? []) {
          const raw = d['attributes']?.[a.key];
          if (a.type === 'bool') attributes[a.key] = !!raw;
          else if (raw !== null && raw !== undefined && String(raw).trim() !== '') {
            attributes[a.key] = a.type === 'int' ? Number(raw) : String(raw).trim();
          }
        }
        return {
          categorySlug: d['categorySlug'],
          experienceYears: d['experienceYears'] === null || d['experienceYears'] === '' ? null : Number(d['experienceYears']),
          specialties: d['specialties'] ?? [],
          attributes,
        };
      }),
    };
  }

  private locationPayload(i: number): LocationInput {
    const l = this.locations.at(i).getRawValue();
    const blank = (x: string | null | undefined) => (x && String(x).trim() ? String(x).trim() : null);
    const num = (x: unknown) => (x === null || x === '' || x === undefined ? null : Number(x));
    return {
      label: blank(l.label), addressLine1: blank(l.addressLine1), addressLine2: blank(l.addressLine2),
      city: String(l.city).trim(), state: blank(l.state), postalCode: blank(l.postalCode), country: l.country,
      latitude: num(l.latitude), longitude: num(l.longitude),
      showStreetAddress: !!l.showStreetAddress, isPrimary: !!l.isPrimary, isActive: !!l.isActive,
    };
  }

  // ── Save ────────────────────────────────────────────────────────────────

  protected async save(): Promise<void> {
    if (this.form.invalid || this.saving()) {
      this.snack.open('Please fix the highlighted fields.', 'OK', { duration: 3000 });
      return;
    }
    this.saving.set(true);
    try {
      const id = this.id();
      if (!id) {
        const created = await firstValueFrom(this.api.createAdminDiscoverProvider({
          ...this.payload(),
          locations: this.locations.controls.map((_, i) => this.locationPayload(i)),
        }));
        this.snack.open('Listing created (pending verification)', 'OK', { duration: 3000 });
        await this.router.navigate(['/discover/admin/providers', created.id], { replaceUrl: true });
        this.id.set(created.id);
        this.patch(created);
      } else {
        this.patch(await firstValueFrom(this.api.updateAdminDiscoverProvider(id, this.payload())));
        this.snack.open('Listing saved', 'OK', { duration: 2500 });
      }
    } catch (err) {
      this.snack.open(apiErrorMessage(err, 'Could not save the listing.'), 'OK', { duration: 6000 });
    } finally {
      this.saving.set(false);
    }
  }

  /** Edit mode only: each location saves through its own endpoint (geocoded server-side). */
  protected async saveLocation(i: number): Promise<void> {
    const id = this.id();
    const group = this.locations.at(i);
    group.markAllAsTouched();
    if (!id || group.invalid) return;
    this.locBusy.set(i);
    try {
      const locId = group.value.id as string | null;
      const body = this.locationPayload(i);
      const p = await firstValueFrom(locId
        ? this.api.updateAdminDiscoverLocation(id, locId, body)
        : this.api.addAdminDiscoverLocation(id, body));
      this.patchKeepingDraft(p);
      this.snack.open('Location saved', 'OK', { duration: 2500 });
    } catch (err) {
      this.snack.open(apiErrorMessage(err, 'Could not save the location.'), 'OK', { duration: 6000 });
    } finally {
      this.locBusy.set(null);
    }
  }

  protected async deleteLocation(i: number): Promise<void> {
    const id = this.id();
    const locId = this.locations.at(i).value.id as string | null;
    if (!id || !locId) { this.locations.removeAt(i); return; }
    this.locBusy.set(i);
    try {
      this.patchKeepingDraft(await firstValueFrom(this.api.deleteAdminDiscoverLocation(id, locId)));
    } catch (err) {
      this.snack.open(apiErrorMessage(err, 'Could not delete the location.'), 'OK', { duration: 6000 });
    } finally {
      this.locBusy.set(null);
    }
  }

  /** Refresh from the server without discarding unsaved edits in the main form. */
  private patchKeepingDraft(p: AdminProvider): void {
    const dirty = this.form.dirty;
    const draft = dirty ? this.form.getRawValue() : null;
    this.patch(p);
    if (draft) {
      const { locations: _ignored, ...rest } = draft;
      this.form.patchValue(rest as never);
      this.form.markAsDirty();
    }
  }

  protected async lookup(i: number): Promise<void> {
    const l = this.locationPayload(i);
    try {
      const r = await firstValueFrom(this.api.geocodeAdminDiscover(l.country, l.postalCode ?? undefined, l.postalCode ? undefined : l.city, l.state ?? undefined));
      this.locations.at(i).patchValue({ latitude: Number(r.lat.toFixed(6)), longitude: Number(r.lng.toFixed(6)) });
      this.snack.open(`Found: ${r.label}`, 'OK', { duration: 3000 });
    } catch (err) {
      this.snack.open(apiErrorMessage(err, 'No coordinates found.'), 'OK', { duration: 5000 });
    }
  }

  // ── Media ───────────────────────────────────────────────────────────────

  protected async upload(input: HTMLInputElement, caption: string, setAsPhoto: boolean): Promise<void> {
    const id = this.id();
    const file = input.files?.[0];
    if (!id || !file) return;
    this.uploading.set(true);
    try {
      this.patchKeepingDraft(await firstValueFrom(this.api.uploadAdminDiscoverMedia(id, file, caption.trim() || null, setAsPhoto)));
      input.value = '';
      this.snack.open('Photo uploaded', 'OK', { duration: 2500 });
    } catch (err) {
      this.snack.open(apiErrorMessage(err, 'Upload failed.'), 'OK', { duration: 6000 });
    } finally {
      this.uploading.set(false);
    }
  }

  protected async deleteMedia(mediaId: string): Promise<void> {
    const id = this.id();
    if (!id) return;
    try {
      this.patchKeepingDraft(await firstValueFrom(this.api.deleteAdminDiscoverMedia(id, mediaId)));
    } catch (err) {
      this.snack.open(apiErrorMessage(err, 'Could not delete the photo.'), 'OK', { duration: 5000 });
    }
  }

  protected async useAsPhoto(url: string): Promise<void> {
    const id = this.id();
    if (!id) return;
    try {
      const p = await firstValueFrom(this.api.updateAdminDiscoverProvider(id, { photoUrl: url }));
      this.form.controls.photoUrl.setValue(p.photoUrl);
      this.provider.set(p);
      this.snack.open('Listing photo updated', 'OK', { duration: 2500 });
    } catch (err) {
      this.snack.open(apiErrorMessage(err, 'Could not set the photo.'), 'OK', { duration: 5000 });
    }
  }

  // ── Verification ────────────────────────────────────────────────────────

  protected async setVerification(status: VerificationStatus): Promise<void> {
    const p = this.provider();
    if (!p) return;
    const needsNote = status === 'REJECTED' || status === 'SUSPENDED';
    const res = await firstValueFrom(this.dialog.open(NoteDialogComponent, {
      width: '460px', maxWidth: '95vw',
      data: {
        title: this.statusLabels[status],
        message: status === 'VERIFIED'
          ? 'Confirm you have checked this business’s identity and contact details.'
          : needsNote ? 'The listing will be hidden from members.' : 'The verified badge will be removed.',
        confirm: 'Confirm', noteRequired: needsNote, warn: needsNote,
      } satisfies NoteDialogData,
    }).afterClosed());
    if (!res) return;
    try {
      this.patchKeepingDraft(await firstValueFrom(this.api.setAdminDiscoverVerification(p.id, status, res.note || null)));
      this.snack.open('Verification updated', 'OK', { duration: 2500 });
    } catch (err) {
      this.snack.open(apiErrorMessage(err, 'Could not update verification.'), 'OK', { duration: 5000 });
    }
  }

  protected isAstrologer(): boolean {
    return this.form.controls.categorySlugs.value.includes('astrologer');
  }
}
