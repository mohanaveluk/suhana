import {
  ChangeDetectionStrategy, Component, DestroyRef, OnInit, PLATFORM_ID, computed, effect, inject, signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { combineLatest } from 'rxjs';
import { MaterialModule } from '../../../../shared/modules/material.module';
import { AuthService } from '../../../../services/auth.service';
import {
  ConsultationMode, CountryCode, DiscoverCategory, DiscoverSearchQuery, DiscoverSort, DistanceUnit, ProviderCard,
  RadiusOption,
} from '../../models/discover.model';
import { DiscoverService } from '../../services/discover.service';
import {
  DISCOVER_COUNTRIES, LANGUAGE_LABELS, MODE_LABELS, RADIUS_OPTIONS, RANKING_FACTOR_LABELS, SORT_LABELS, apiErrorMessage,
  guessCountry,
} from '../../utils/discover.utils';
import { CATEGORY_CONFIGS, CategoryConfig, configBySegment } from '../../utils/category-config';
import { ProviderCardComponent } from '../../components/provider-card/provider-card.component';
import { ContactDialogComponent } from '../../components/contact-dialog/contact-dialog.component';

const PAGE_SIZE = 12;
const csv = (v: string | null) => (v ? v.split(',').map((x) => x.trim()).filter(Boolean) : []);
const num = (v: string | null) => (v === null || v === '' || isNaN(Number(v)) ? null : Number(v));

/**
 * One search page for every Discover category (/discover/:category).
 * The URL is the source of truth for filters; it never carries device
 * coordinates (only `near=me` — the rounded coords live in DiscoverService).
 */
@Component({
  selector: 'app-discover-category-search',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialModule, ReactiveFormsModule, RouterLink, ProviderCardComponent],
  templateUrl: './category-search.page.html',
  styleUrl: './category-search.page.scss',
})
export class CategorySearchPage implements OnInit {
  protected readonly discover = inject(DiscoverService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly countries = Object.entries(DISCOVER_COUNTRIES) as [CountryCode, (typeof DISCOVER_COUNTRIES)[CountryCode]][];
  protected readonly radiusOptions = RADIUS_OPTIONS;
  protected readonly languages = Object.entries(LANGUAGE_LABELS);
  protected readonly modes = Object.entries(MODE_LABELS) as [ConsultationMode, { label: string; icon: string }][];
  protected readonly factorLabels = RANKING_FACTOR_LABELS;

  /** Current category config (null = unknown segment → "not found" state). */
  protected readonly cfg = signal<CategoryConfig | null>(null);
  protected readonly categoryState = signal<'loading' | 'live' | 'soon' | 'unknown'>('loading');
  /** Live categories for the switcher strip. */
  protected readonly liveCategories = signal<CategoryConfig[]>([]);

  protected readonly specialties = computed(() => Object.entries(this.cfg()?.specialties ?? {}));
  protected readonly sorts = computed(() =>
    (Object.entries(SORT_LABELS) as [DiscoverSort, string][]));

  protected readonly form = this.fb.nonNullable.group({
    country: this.fb.nonNullable.control<CountryCode>('IN'),
    where: '',
    state: '',
    radius: this.fb.nonNullable.control<RadiusOption>('25'),
    unit: this.fb.nonNullable.control<DistanceUnit>('km'),
    q: '',
    specialization: this.fb.nonNullable.control<string[]>([]),
    consultationMode: this.fb.nonNullable.control<ConsultationMode[]>([]),
    language: this.fb.nonNullable.control<string[]>([]),
    minRating: this.fb.control<number | null>(null),
    minExperience: this.fb.control<number | null>(null),
    minCapacity: this.fb.control<number | null>(null),
    minPrice: this.fb.control<number | null>(null),
    maxPrice: this.fb.control<number | null>(null),
    verifiedOnly: false,
    sortBy: this.fb.nonNullable.control<DiscoverSort>('recommended'),
  });

  protected readonly usingDevice = signal(false);
  protected readonly locating = signal(false);
  protected readonly locateError = signal<string | null>(null);
  protected readonly favBusy = signal<string | null>(null);
  protected readonly filtersOpen = signal(false);
  protected readonly activeFilterCount = signal(0);
  /** Selected specialty chips (mirrors the form control for signal-based rendering). */
  protected readonly selectedSpecs = signal<string[]>([]);

  /** Only show results that belong to the category on screen. */
  protected readonly results = computed(() =>
    this.discover.resultsCategory() === this.cfg()?.slug ? this.discover.results() : null);
  protected readonly pages = computed(() => {
    const r = this.results();
    if (!r || r.totalPages <= 1) return [] as number[];
    const start = Math.max(1, Math.min(r.page - 2, r.totalPages - 4));
    return Array.from({ length: Math.min(5, r.totalPages) }, (_, i) => start + i);
  });
  protected readonly factors = computed(() =>
    Object.entries(this.results()?.ranking.factors ?? {}).map(([k, w]) => ({ label: this.factorLabels[k] ?? k, pct: Math.round(w * 100) })));
  protected readonly geoSupported = this.isBrowser && typeof navigator !== 'undefined' && 'geolocation' in navigator;

  /** Animated count-up for the result total. */
  protected readonly shownTotal = signal(0);

  constructor() {
    effect((onCleanup) => {
      const target = this.results()?.total ?? 0;
      const reduce = this.isBrowser && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (!this.isBrowser || reduce || target === 0) {
        this.shownTotal.set(target);
        return;
      }
      const from = 0;
      const start = performance.now();
      let raf = 0;
      const step = (t: number) => {
        const k = Math.min(1, (t - start) / 600);
        this.shownTotal.set(Math.round(from + (target - from) * (1 - Math.pow(1 - k, 3))));
        if (k < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
      onCleanup(() => cancelAnimationFrame(raf));
    });
  }

  ngOnInit(): void {
    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([params, query]) => void this.onRoute(params.get('category'), query));
  }

  private async onRoute(segment: string | null, pm: ParamMap): Promise<void> {
    const cfg = configBySegment(segment);
    this.cfg.set(cfg ?? null);
    if (!cfg) {
      this.categoryState.set('unknown');
      return;
    }
    let cats: DiscoverCategory[] = [];
    try {
      cats = await this.discover.loadCategories();
    } catch {
      /* the search call below surfaces errors */
    }
    const active = new Set(cats.filter((c) => c.isActive).map((c) => c.slug));
    this.liveCategories.set(CATEGORY_CONFIGS.filter((c) => active.has(c.slug)));
    if (cats.length && !active.has(cfg.slug)) {
      this.categoryState.set('soon');
      return;
    }
    this.categoryState.set('live');
    this.fromUrl(cfg, pm);
  }

  private fromUrl(cfg: CategoryConfig, pm: ParamMap): void {
    const profileCountry = (this.auth.user()?.profile as { country?: string } | undefined)?.country;
    const country = (pm.get('country') as CountryCode) || guessCountry(profileCountry);
    const validCountry: CountryCode = country in DISCOVER_COUNTRIES ? country : 'IN';
    const unit = (pm.get('unit') as DistanceUnit) || DISCOVER_COUNTRIES[validCountry].unit;
    const radius = (pm.get('radius') as RadiusOption) || '25';
    const specs = csv(pm.get('specialization')).filter((s) => s in cfg.specialties);

    this.form.reset({
      country: validCountry,
      where: pm.get('postalCode') ?? pm.get('city') ?? '',
      state: pm.get('state') ?? '',
      radius: RADIUS_OPTIONS.includes(radius) ? radius : '25',
      unit: unit === 'mi' || unit === 'km' ? unit : 'km',
      q: pm.get('q') ?? '',
      specialization: specs,
      consultationMode: cfg.showModes ? (csv(pm.get('consultationMode')) as ConsultationMode[]) : [],
      language: csv(pm.get('language')),
      minRating: num(pm.get('minRating')),
      minExperience: num(pm.get('minExperience')),
      minCapacity: cfg.capacityLabel ? num(pm.get('minCapacity')) : null,
      minPrice: num(pm.get('minPrice')),
      maxPrice: num(pm.get('maxPrice')),
      verifiedOnly: pm.get('verifiedOnly') === 'true',
      sortBy: (pm.get('sortBy') as DiscoverSort) || 'recommended',
    }, { emitEvent: false });
    this.selectedSpecs.set(specs);

    const device = pm.get('near') === 'me' ? this.discover.deviceLocation() : null;
    this.usingDevice.set(!!device);
    this.locateError.set(pm.get('near') === 'me' && !device ? 'Tap “Use my location” again to search near you.' : null);

    const query: DiscoverSearchQuery = {
      ...this.queryFromForm(),
      ...(device ? { lat: device.lat, lng: device.lng, postalCode: undefined, city: undefined, state: undefined } : {}),
      page: Math.max(1, num(pm.get('page')) ?? 1),
      limit: PAGE_SIZE,
    };
    this.activeFilterCount.set(this.countFilters());
    void this.discover.search(cfg.slug, query);
  }

  /** Form → API query. "where" is a ZIP/PIN when it looks like one, otherwise a city. */
  private queryFromForm(): DiscoverSearchQuery {
    const v = this.form.getRawValue();
    const where = v.where.trim();
    const looksPostal = /^[\d\s-]{5,10}$/.test(where);
    return {
      country: v.country,
      postalCode: where && looksPostal ? where : undefined,
      city: where && !looksPostal ? where : undefined,
      state: v.state.trim() || undefined,
      radius: v.radius,
      unit: v.unit,
      q: v.q.trim() || undefined,
      specialization: v.specialization,
      consultationMode: v.consultationMode,
      language: v.language,
      minRating: v.minRating ?? undefined,
      minExperience: v.minExperience ?? undefined,
      minCapacity: v.minCapacity ?? undefined,
      minPrice: v.minPrice ?? undefined,
      maxPrice: v.maxPrice ?? undefined,
      verifiedOnly: v.verifiedOnly || undefined,
      sortBy: v.sortBy,
    };
  }

  private countFilters(): number {
    const v = this.form.getRawValue();
    return [v.specialization.length, v.consultationMode.length, v.language.length, v.minRating, v.minExperience,
      v.minCapacity, v.minPrice, v.maxPrice, v.verifiedOnly, v.q.trim()].filter((x) => !!x).length;
  }

  /** Writes the current form to the URL (which triggers the search). */
  protected apply(page = 1, opts: { near?: boolean } = {}): void {
    const q = this.queryFromForm();
    const near = opts.near ?? this.usingDevice();
    const params: Record<string, string | null> = {
      country: q.country ?? null,
      postalCode: near ? null : q.postalCode ?? null,
      city: near ? null : q.city ?? null,
      state: near ? null : q.state ?? null,
      near: near ? 'me' : null,
      radius: q.radius ?? null,
      unit: q.unit ?? null,
      q: q.q ?? null,
      specialization: q.specialization?.join(',') || null,
      consultationMode: q.consultationMode?.join(',') || null,
      language: q.language?.join(',') || null,
      minRating: q.minRating?.toString() ?? null,
      minExperience: q.minExperience?.toString() ?? null,
      minCapacity: q.minCapacity?.toString() ?? null,
      minPrice: q.minPrice?.toString() ?? null,
      maxPrice: q.maxPrice?.toString() ?? null,
      verifiedOnly: q.verifiedOnly ? 'true' : null,
      sortBy: q.sortBy && q.sortBy !== 'recommended' ? q.sortBy : null,
      page: page > 1 ? String(page) : null,
    };
    this.locateError.set(null);
    void this.router.navigate([], { relativeTo: this.route, queryParams: params });
  }

  protected onSubmit(): void {
    this.usingDevice.set(false);
    this.discover.clearDeviceLocation();
    this.apply(1, { near: false });
  }

  protected onCountryChange(c: CountryCode): void {
    this.form.patchValue({ unit: DISCOVER_COUNTRIES[c].unit, minPrice: null, maxPrice: null });
  }

  protected clearFilters(): void {
    this.form.patchValue({
      q: '', specialization: [], consultationMode: [], language: [], minRating: null, minExperience: null,
      minCapacity: null, minPrice: null, maxPrice: null, verifiedOnly: false,
    });
    this.apply(1);
  }

  /** Quick chip above the results: toggles a specialty and searches immediately. */
  protected toggleChip(code: string): void {
    this.toggleIn('specialization', code);
    this.apply(1);
  }

  protected toggleIn<T>(control: 'specialization' | 'consultationMode', value: T): void {
    const ctrl = this.form.controls[control] as unknown as { value: T[]; setValue(v: T[]): void };
    const cur = ctrl.value;
    ctrl.setValue(cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value]);
    if (control === 'specialization') this.selectedSpecs.set(ctrl.value as unknown as string[]);
  }

  /** Geolocation is requested only here, after an explicit click. */
  protected useMyLocation(): void {
    if (!this.geoSupported) return;
    this.locating.set(true);
    this.locateError.set(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.locating.set(false);
        this.discover.setDeviceLocation(pos.coords.latitude, pos.coords.longitude);
        this.usingDevice.set(true);
        this.form.patchValue({ where: '', state: '' });
        if (this.form.value.sortBy === 'recommended') this.form.patchValue({ sortBy: 'nearest' });
        this.apply(1, { near: true });
      },
      (err) => {
        this.locating.set(false);
        this.locateError.set(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission was declined. You can search by ZIP/PIN code or city instead.'
            : 'We couldn’t get your location. Please search by ZIP/PIN code or city instead.',
        );
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  protected stopUsingLocation(): void {
    this.discover.clearDeviceLocation();
    this.usingDevice.set(false);
    this.apply(1, { near: false });
  }

  protected goToPage(p: number): void {
    this.apply(p);
    if (this.isBrowser) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected retry(): void {
    const cfg = this.cfg();
    if (cfg) this.fromUrl(cfg, this.route.snapshot.queryParamMap);
  }

  /** Category switcher keeps the location part of the search. */
  protected switchQuery(): Record<string, string | null> {
    const pm = this.route.snapshot.queryParamMap;
    return {
      country: pm.get('country'), postalCode: pm.get('postalCode'), city: pm.get('city'), state: pm.get('state'),
      near: pm.get('near'), radius: pm.get('radius'), unit: pm.get('unit'),
    };
  }

  protected async toggleFavorite(p: ProviderCard): Promise<void> {
    this.favBusy.set(p.id);
    try {
      const saved = await this.discover.toggleFavorite(p);
      this.snack.open(saved ? 'Saved to your list' : 'Removed from your list', 'OK', { duration: 2500 });
    } catch (e) {
      this.snack.open((e as Error).message, 'OK', { duration: 4000 });
    } finally {
      this.favBusy.set(null);
    }
  }

  protected async contact(p: ProviderCard): Promise<void> {
    try {
      const contact = await this.discover.getContact(p.id);
      this.dialog.open(ContactDialogComponent, { data: { name: p.displayName, contact }, width: '440px', maxWidth: '95vw' });
    } catch (err) {
      this.snack.open(apiErrorMessage(err, 'Could not load contact details.'), 'OK', { duration: 4000 });
    }
  }

  protected postalHint(): string {
    const c = DISCOVER_COUNTRIES[this.form.controls.country.value];
    return `${c.postalLabel} (${c.postalHint}) or a city`;
  }
}
