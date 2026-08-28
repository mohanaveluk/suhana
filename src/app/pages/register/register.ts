import { Component, ChangeDetectionStrategy, inject, signal, ViewChild, OnInit, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MatStepper } from '@angular/material/stepper';
import { MaterialModule } from '../../shared/modules/material.module';
import { ApiService, AuthService } from '../../services';
import { ProfileService } from '../../services';
import { Gender } from '../../models/user.model';
import { firstValueFrom } from 'rxjs';
import { encryptValue } from '../../shared/utils/crypto.util';
import { onSelectSearchKeydown } from '../../shared/utils/select-search.util';
import { SelectSearchDirective } from '../../shared/directives/select-search.directive';

interface CountryLookup {
  id: string;
  name: string;
  isoCode: string;
}

interface StateLookup {
  id: string;
  code: string;
  name: string;
  countryId: string;
}

/** Blocks submitting the literal "Others" sentinel — the user must specify a value first. */
function notLiteralOtherValidator(control: AbstractControl): ValidationErrors | null {
  return control.value === 'Others' ? { otherNotSpecified: true } : null;
}

/** Dedupes a lookup list and appends a single trailing "Others" — the backend's own list may already include one. */
function withTrailingOther(names: string[]): string[] {
  return [...new Set(names.filter(n => n !== 'Others')), 'Others'];
}

@Component({
  selector: 'app-register',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    SelectSearchDirective,
    ReactiveFormsModule, RouterLink, MaterialModule,
  ],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class RegisterComponent implements OnInit {
  @ViewChild('stepper') private readonly stepper!: MatStepper;

  private readonly api           = inject(ApiService);
  private readonly fb            = inject(FormBuilder);
  private readonly auth          = inject(AuthService);
  private readonly profileService = inject(ProfileService);
  private readonly router        = inject(Router);
  private readonly destroyRef    = inject(DestroyRef);

  protected readonly hidePassword       = signal(true);
  protected readonly hideConfirmPassword       = signal(true);
  protected readonly isSubmitting       = signal(false);
  protected readonly registrationError  = signal<string | null>(null);
  protected readonly profileError       = signal<string | null>(null);
  protected readonly registeredUserId   = signal<string | null>(null);
  protected readonly prefillNotice      = signal<string | null>(null);
  
  private readonly _availableCities       = signal<string[]>([]);
  private readonly _availableOccupations  = signal<string[]>([]);
  private readonly _availableEducation    = signal<string[]>([]);

  protected readonly availableCities      = this._availableCities.asReadonly();
  protected readonly availableOccupations = this._availableOccupations.asReadonly();
  protected readonly availableEducation   = this._availableEducation.asReadonly();

  protected readonly tempUserGuid      = signal<string | null>(null);

  // ── Country / State lookups ─────────────────────────────────────────────────
  private readonly _countries = signal<CountryLookup[]>([]);
  private readonly _states    = signal<StateLookup[]>([]);

  protected readonly countries      = this._countries.asReadonly();
  protected readonly selectedCountryId = signal<string | null>(null);
  protected readonly statesLoading  = signal(false);

  protected readonly countryNames = computed(() => this.countries().map(c => c.name));
  protected readonly stateNames   = computed(() => this._states().map(s => s.name));

  protected readonly countrySearch = signal('');
  protected readonly stateSearch   = signal('');

  protected readonly filteredCountries = computed(() => {
    const q = this.countrySearch().trim().toLowerCase();
    const all = this.countryNames();
    return q ? all.filter(c => c.toLowerCase().includes(q)) : all;
  });

  protected readonly filteredStates = computed(() => {
    const q = this.stateSearch().trim().toLowerCase();
    const all = this.stateNames();
    return q ? all.filter(s => s.toLowerCase().includes(q)) : all;
  });

  // ── "Other" custom entry for Education / Occupation ─────────────────────────
  protected readonly showCustomEducation  = signal(false);
  protected readonly showCustomOccupation = signal(false);
  protected readonly customEducationValue  = signal('');
  protected readonly customOccupationValue = signal('');
  
  protected readonly religions = ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Jain', 'Buddhist'];
  protected readonly educationLevels = ['High School', 'Bachelor\'s', 'Master\'s', 'PhD', 'MBA', 'Medical', 'Engineering'];
  protected readonly occupations1 = ['Software Engineer', 'Doctor', 'Lawyer', 'Business Analyst', 'Teacher', 'Designer', 'Entrepreneur', 'CA', 'Government'];
  protected readonly userReligions = [...this.religions, 'Others'];
  protected readonly occupations = computed(() => this.availableOccupations());

  /** Lets arrows/Enter reach mat-select while typing in the panel search box. */
  protected readonly onSelectSearchKeydown = onSelectSearchKeydown;

  // ── Searchable dropdowns ────────────────────────────────────────────────────
  // Both lists come from the lookup API and can run to hundreds of entries, so
  // the panels carry an inline filter box rather than making the user scroll.
  protected readonly educationSearch  = signal('');
  protected readonly occupationSearch = signal('');

  protected readonly filteredEducation = computed(() => {
    const q = this.educationSearch().trim().toLowerCase();
    const all = this.availableEducation();
    return q ? all.filter(e => e.toLowerCase().includes(q)) : all;
  });

  protected readonly filteredOccupations = computed(() => {
    const q = this.occupationSearch().trim().toLowerCase();
    const all = this.availableOccupations();
    return q ? all.filter(o => o.toLowerCase().includes(q)) : all;
  });

  // Preference dropdowns keep their own filter text. preferredEducation draws
  // from the same list as educationLevel, so sharing a signal would make typing
  // in one panel filter the others.
  protected readonly preferredReligionSearch  = signal('');
  protected readonly preferredEducationSearch = signal('');

  protected readonly filteredPreferredReligions = computed(() => {
    const q = this.preferredReligionSearch().trim().toLowerCase();
    const all = ['Any', ...this.religions];
    return q ? all.filter(r => r.toLowerCase().includes(q)) : all;
  });

  protected readonly filteredPreferredEducation = computed(() => {
    const q = this.preferredEducationSearch().trim().toLowerCase();
    const all = ['Any', ...this.availableEducation()];
    return q ? all.filter(e => e.toLowerCase().includes(q)) : all;
  });

  // Step 1: Account
  protected readonly accountForm = this.fb.group({
    email:           ['', [Validators.required, Validators.email]],
    password:        ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
    gender:          ['' as Gender, Validators.required],
    mobile:          ['0', Validators.required],
    agreeTerms:      [false, Validators.requiredTrue],
  });

  // Step 2: Personal
  protected readonly personalForm = this.fb.group({
    firstName:   ['', [Validators.required, Validators.minLength(2)]],
    lastName:    ['', [Validators.required, Validators.minLength(2)]],
    dateOfBirth: [null as Date | null, Validators.required],
    religion:    ['', Validators.required],
    caste:       [''],
    motherTongue: ['', Validators.required],
    height:      ['', Validators.required],
    city:        ['', Validators.required],
    state:       ['', Validators.required],
    country:     ['India', Validators.required],
  });

  // Step 3: Professional
  protected readonly professionalForm = this.fb.group({
    educationLevel: ['', [Validators.required, notLiteralOtherValidator]],
    educationField: ['', Validators.required],
    institution:    [''],
    occupation:     ['', [Validators.required, notLiteralOtherValidator]],
    company:        [''],
    annualIncome:   [''],
  });

  /**
   * Minimum legal marriageable age for the partner-preference range, based on
   * the registrant's own country (Step 2) and gender (Step 1). India requires
   * 21 for brides and 18 for grooms; everywhere else the floor is 18 for both.
   */
  protected requiredPartnerMinAge(): number {
    const country = (this.personalForm.controls.country.value ?? '').trim().toLowerCase();
    const gender  = this.accountForm.controls.gender.value;
    return country === 'india' && gender === 'bride' ? 21 : 18;
  }

  /** Cross-form validator — reads gender/country from the sibling forms at validation time. */
  private readonly ageRangeValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
    const ageMin = group.get('ageMin')?.value;
    const ageMax = group.get('ageMax')?.value;
    if (ageMin === null || ageMin === '' || ageMax === null || ageMax === '') return null;

    const requiredMinAge = this.requiredPartnerMinAge();
    if (ageMin < requiredMinAge) return { ageMinBelowLegal: { requiredMinAge } };
    if (ageMax < ageMin)         return { ageMaxBelowMin: true };
    return null;
  };

  // Step 4: Preferences
  protected readonly preferencesForm = this.fb.group({
    ageMin:             [21, Validators.required],
    ageMax:             [35, Validators.required],
    preferredReligions: [[] as string[]],
    preferredLocations: [[] as string[]],
    preferredEducation: [[] as string[]],
    aboutMe:            ['', [Validators.required, Validators.minLength(50)]],
  }, { validators: this.ageRangeValidator });

  /** Friendly, customer-facing message for the current preferencesForm age-range error, if any. */
  protected ageRangeErrorMessage(): string | null {
    const errors = this.preferencesForm.errors;
    if (!errors) return null;

    if (errors['ageMinBelowLegal']) {
      const requiredMinAge = errors['ageMinBelowLegal'].requiredMinAge as number;
      const gender  = this.accountForm.controls.gender.value;
      const country = (this.personalForm.controls.country.value ?? '').trim().toLowerCase();
      const who   = gender === 'groom' ? 'grooms' : 'brides';
      const where = country === 'india' ? 'India' : 'your country';
      return `Minimum age criteria does not match — the preferred minimum age must be at least `
        + `${requiredMinAge} for ${who} registering from ${where}. Please raise the minimum age below.`;
    }
    if (errors['ageMaxBelowMin']) {
      return 'Minimum age criteria does not match — the maximum preferred age must be '
        + 'greater than or equal to the minimum preferred age.';
    }
    return null;
  }

  async ngOnInit(): Promise<void> {
    // The age-range rule depends on country (Step 2) and gender (Step 1), which live
    // in sibling FormGroups — Angular only auto-revalidates a group's own descendants,
    // so re-run preferencesForm's validity check whenever either one changes.
    this.personalForm.controls.country.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.preferencesForm.updateValueAndValidity());
    this.accountForm.controls.gender.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.preferencesForm.updateValueAndValidity());

    await Promise.all([this.loadLookupValues(), this.loadCountries()]);
  }

  private async loadLookupValues(): Promise<void> {
    try {
      const res = await firstValueFrom(this.api.getLookupValues());
      if (res.cities?.length)          this._availableCities.set([...new Set(res.cities.map(c => c.name))]);
      if (res.occupations?.length)     this._availableOccupations.set(withTrailingOther(res.occupations.map(o => o.name)));
      if (res.educationLevels?.length) this._availableEducation.set(withTrailingOther(res.educationLevels.map(e => e.name)));
    } catch {
      this._availableCities.set(['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad', 'Pune', 'Kolkata', 'Jaipur', 'Ahmedabad', 'Surat']);
      this._availableOccupations.set(withTrailingOther(['Software Engineer', 'Doctor', 'Lawyer', 'Business Analyst', 'Teacher', 'Designer', 'Entrepreneur', 'CA', 'Architect', 'AI Engineer']));
      this._availableEducation.set(withTrailingOther(['Bachelor', 'Master', 'PhD', 'MBA', 'Medical', 'Engineering', 'Diploma', 'B.Tech', 'M.Tech']));
    }
  }

  private async loadCountries(): Promise<void> {
    try {
      const res = await firstValueFrom(this.api.getCountries());
      this._countries.set(res?.data ?? []);
    } catch {
      // Country dropdown stays empty — state lookup and location fields still work manually.
    }
    await this.selectCountryByName(this.personalForm.controls.country.value ?? '');
  }

  private async selectCountryByName(name: string): Promise<void> {
    const country = this.countries().find(c => c.name === name);
    if (!country) {
      this.selectedCountryId.set(null);
      this._states.set([]);
      this.personalForm.controls.state.disable();
      return;
    }
    this.selectedCountryId.set(country.id);
    this.personalForm.controls.state.enable();
    await this.loadStates(country.id);
  }

  private async loadStates(countryId: string): Promise<void> {
    this.statesLoading.set(true);
    try {
      const states = await firstValueFrom(this.api.getCountryStates(countryId));
      this._states.set(states ?? []);
    } catch {
      this._states.set([]);
    } finally {
      this.statesLoading.set(false);
    }
  }

  protected async onCountryChange(name: string): Promise<void> {
    this.personalForm.patchValue({ state: '' });
    this.stateSearch.set('');
    await this.selectCountryByName(name);
  }

  protected onEducationChange(value: string): void {
    this.showCustomEducation.set(value === 'Others');
    if (value !== 'Others') this.customEducationValue.set('');
  }

  protected onOccupationChange(value: string): void {
    this.showCustomOccupation.set(value === 'Others');
    if (value !== 'Others') this.customOccupationValue.set('');
  }

  protected addCustomEducation(): void {
    const value = this.customEducationValue().trim();
    if (!value) return;
    this._availableEducation.update(list =>
      list.includes(value) ? list : [...list.filter(v => v !== 'Others'), value, 'Others']);
    this.professionalForm.patchValue({ educationLevel: value });
    this.customEducationValue.set('');
    this.showCustomEducation.set(false);
  }

  protected addCustomOccupation(): void {
    const value = this.customOccupationValue().trim();
    if (!value) return;
    this._availableOccupations.update(list =>
      list.includes(value) ? list : [...list.filter(v => v !== 'Others'), value, 'Others']);
    this.professionalForm.patchValue({ occupation: value });
    this.customOccupationValue.set('');
    this.showCustomOccupation.set(false);
  }

  async onStep1Next(): Promise<void> {
    this.accountForm.markAllAsTouched();
    if (this.accountForm.invalid) return;

    this.isSubmitting.set(true);
    this.registrationError.set(null);
    this.prefillNotice.set(null);

    const { email, password, gender, mobile } = this.accountForm.getRawValue();

    try {
      // ── Normal registration path ──────────────────────────────────────────
      const userIdentity = await this.auth.register({
        email:    email    ?? '',
        password: password ?? '',
        gender:   gender   as string,
        mobile:   mobile   ?? '',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      this.registeredUserId.set(userIdentity.userId);
      this.tempUserGuid.set(userIdentity.tempGuid);

      // Fetch any pre-existing profile (e.g. user partially registered before)
      await this.tryPrefillFromProfile(email as string);

      this.stepper.next();

    } catch (err: any) {
      // ── Email already exists → try auto-login and pre-fill ─────────────────
      const status  = err?.status as number | undefined;
      const message = (err?.error?.message ?? err?.message ?? '').toLowerCase();
      const isPasswordValidationError =
        message.includes('password') &&
        (
          message.includes('at least') ||
          message.includes('minimum') ||
          message.includes('length')
        );
      const isEmailTaken = !isPasswordValidationError &&
        (
          status === 409 ||
          status === 400 ||
          message.includes('already') ||
          message.includes('exists') ||
          message.includes('duplicate') ||
          message.includes('taken')
        );

      if (isEmailTaken) {
        try {
          // Log in with the credentials they typed — if it works, their account
          // is there but unverified; fetch the profile and pre-fill all steps.
          await this.auth.login(email ?? '', password ?? '');
          const user = this.auth.user();
          if (user?.is_email_verified) {
            throw new Error('Email already verified. Please login instead, or use "Forgot Password" if you\'ve forgotten your credentials.');
          }
          if (user) {
            this.registeredUserId.set(user.id ?? '');
            const prefilled = await this.tryPrefillFromProfile(email as string);
            this.prefillNotice.set(
              prefilled
                ? 'Welcome back! We found your existing profile and pre-filled your details below. Please review and complete your registration.'
                : 'Welcome back! Your account already exists. Please complete your profile details.',
            );
            this.stepper.next();
            return;
          }
        } catch {
          // Auto-login failed (e.g. wrong password) — fall through to show error
          this.registrationError.set(
            'An account with this email already exists. ' +
            'Please login instead, or use "Forgot Password" if you\'ve forgotten your credentials.',
          );
          this.isSubmitting.set(false);
          return;
        }
      }

      this.registrationError.set(
        err?.error?.message ?? 'Registration failed. Please try again.',
      );
    } finally {
      this.isSubmitting.set(false);
    }
  }

  // Returns true if any profile data was actually found and applied
  private async tryPrefillFromProfile(id: string): Promise<boolean> {
    try {
      const res     = await firstValueFrom(this.api.getProfileByNewEmail(id));
      const profile = res?.data ?? res;
      if (profile && (profile.firstName && profile.firstName !== 'unknown') && (profile.firstName || profile.location?.city || profile.education?.level)) {
        this.prefillFormsFromProfile(profile);
        return true;
      }
    } catch {
      // No profile yet — that's fine for a brand-new account
    }
    return false;
  }

  private prefillFormsFromProfile(p: any): void {
    // ── Step 2: Personal ──────────────────────────────────────────────────────
    this.personalForm.patchValue({
      firstName:    p.firstName ?? '',
      lastName:     p.lastName     ?? '',
      dateOfBirth:  p.dateOfBirth  ? new Date(p.dateOfBirth) : null,
      religion:     p.religion     ?? '',
      caste:        p.caste        ?? '',
      motherTongue: p.motherTongue ?? '',
      height:       p.height       ?? '',
      city:         p.location?.city    ?? '',
      state:        p.location?.state   ?? '',
      country:      p.location?.country ?? 'India',
    });
    void this.selectCountryByName(p.location?.country ?? 'India').then(() => {
      // Re-apply the state now that its options have loaded from the resolved country.
      this.personalForm.patchValue({ state: p.location?.state ?? '' });
    });

    // ── Step 3: Professional ──────────────────────────────────────────────────
    this.professionalForm.patchValue({
      educationLevel: p.education?.level       ?? '',
      educationField: p.education?.field       ?? '',
      institution:    p.education?.institution ?? '',
      occupation:     p.occupation?.title      ?? '',
      company:        p.occupation?.company    ?? '',
      annualIncome:   p.occupation?.annualIncome ?? '',
    });

    // ── Step 4: Preferences ───────────────────────────────────────────────────
    this.preferencesForm.patchValue({
      ageMin:             p.preferences?.ageRange?.min ?? 21,
      ageMax:             p.preferences?.ageRange?.max ?? 35,
      preferredReligions: p.preferences?.religions    ?? [],
      preferredLocations: p.preferences?.locations    ?? [],
      preferredEducation: p.preferences?.education    ?? [],
      aboutMe:            p.aboutMe ?? '',
    });
    this.tempUserGuid.set(p.user.tempGuid);
  }

  async onSubmit(): Promise<void> {
    if (this.personalForm.invalid ||
        this.professionalForm.invalid || this.preferencesForm.invalid) return;

    this.isSubmitting.set(true);
    this.profileError.set(null);

    const personal      = this.personalForm.getRawValue();
    const professional  = this.professionalForm.getRawValue();
    const prefs         = this.preferencesForm.getRawValue();

    const age = personal.dateOfBirth
      ? Math.floor((Date.now() - new Date(personal.dateOfBirth).getTime()) / 31557600000)
      : 25;

    try {
      await this.profileService.updateNewProfile({
        userId:       this.registeredUserId() ?? this.auth.user()?.id ?? '',
        firstName:    personal.firstName  || '',
        lastName:     personal.lastName   || '',
        age,
        dateOfBirth:  personal.dateOfBirth ?? new Date(),
        gender:       this.accountForm.getRawValue().gender as Gender,
        religion:     personal.religion   || '',
        caste:        personal.caste      ?? undefined,
        motherTongue: personal.motherTongue || '',
        location: {
          city:               personal.city    || '',
          state:              personal.state   || '',
          country:            personal.country || '',
          willingToRelocate:  false,
        },
        education: {
          level:       professional.educationLevel  || '',
          field:       professional.educationField  || '',
          institution: professional.institution     ?? undefined,
        },
        occupation: {
          title:         professional.occupation    || '',
          company:       professional.company       ?? undefined,
          annualIncome:  professional.annualIncome  ?? undefined,
          workingStatus: 'Employed',
        },
        height:  personal.height || '',
        aboutMe: prefs.aboutMe   ?? '',
        photos:  [],
        familyDetails: { familyType: 'nuclear' },
        preferences: {
          ageRange:  { min: prefs.ageMin ?? 21, max: prefs.ageMax ?? 35 },
          religions: prefs.preferredReligions?.length ? prefs.preferredReligions : undefined,
          locations: prefs.preferredLocations?.length ? prefs.preferredLocations : undefined,
          education: prefs.preferredEducation?.length ? prefs.preferredEducation : undefined,
        },
        photoPrivacy:        'everyone',
        status:              'active',
        profileCompleteness: 75,
        tempGuid: this.tempUserGuid() ?? '',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      const paramKey = encryptValue(this.accountForm.getRawValue().email ?? '');
      this.router.navigate(['/registration-success', paramKey]);
    } catch (err: any) {
      this.profileError.set(err?.error?.message ?? 'Failed to save profile. Please try again.');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
