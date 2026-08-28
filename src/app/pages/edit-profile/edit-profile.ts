import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import {
  AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators,
} from '@angular/forms';
import { TitleCasePipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MaterialModule } from '../../shared/modules/material.module';
import { SelectSearchDirective } from '../../shared/directives/select-search.directive';
import { onSelectSearchKeydown } from '../../shared/utils/select-search.util';
import { ProfileService } from '../../services';
import { ApiService } from '../../services/api.service';
import {
  ImageCropperDialogComponent,
  ImageCropperDialogData,
  ImageCropperDialogResult,
} from '../../shared/components/image-cropper-dialog/image-cropper-dialog.component';
import {
  UserProfile, Gender, PhotoPrivacy, ProfileStatus,
  FamilyType, FoodPreference,
  User,
  ProfilePhoto,
  ProfilePhotoVariant,
} from '../../models/user.model';
import { VoiceIntroductionService } from '../../services/voice-introduction.service';
import {
  VoiceIntroductionDialogComponent,
  VoiceIntroductionDialogData,
  VoiceIntroductionDialogResult,
} from '../profile/voice-introduction-dialog/voice-introduction-dialog.component';
import {
  MobileVerificationDialogComponent,
  MobileVerificationDialogData,
  MobileVerificationDialogResult,
} from '../profile/mobile-verification-dialog/mobile-verification-dialog.component';
import {
  WeightEntryDialogComponent,
  WeightEntryDialogData,
  WeightEntryDialogResult,
} from './weight-entry-dialog/weight-entry-dialog.component';
import { firstValueFrom } from 'rxjs';
import { CommonService } from '../../services/common.service';

const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PHOTO_MB = 2;

const ALLOWED_HOROSCOPE_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_HOROSCOPE_MB = 10;

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
  selector: 'app-edit-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, MaterialModule, TitleCasePipe, SelectSearchDirective],
  templateUrl: './edit-profile.html',
  styleUrl: './edit-profile.scss',
})
export class EditProfileComponent implements OnInit {
  private readonly fb             = inject(FormBuilder);
  private readonly profileService = inject(ProfileService);
  protected readonly commonService = inject(CommonService);
  private readonly api            = inject(ApiService);
  private readonly router         = inject(Router);
  private readonly dialog         = inject(MatDialog);
  private readonly voiceSvc       = inject(VoiceIntroductionService);
  private readonly destroyRef     = inject(DestroyRef);

  /** Lets arrows/Enter reach mat-select while typing in the panel search box. */
  protected readonly onSelectSearchKeydown = onSelectSearchKeydown;
  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly saveSuccess = signal(false);

  protected readonly currentAvatarUrl = signal<string | null>(null);
  protected readonly originalAvatarUrl = signal<string | null>(null);
  protected readonly photoVariants = signal<ProfilePhotoVariant | null>(null);
  protected readonly currentAvatar = signal<ProfilePhotoVariant | null>(null);
  protected readonly avatarPreview = signal<string | null>(null);
  protected readonly avatarFile = signal<File | null>(null);
  protected readonly avatarError = signal<string | null>(null);

  // ── Horoscope document ──────────────────────────────────────────────────────
  protected readonly horoscopeDocUrl = signal<string | null>(null);
  protected readonly horoscopeDocFile = signal<File | null>(null);
  protected readonly horoscopeDocName = signal<string | null>(null);
  protected readonly horoscopeDocError = signal<string | null>(null);
  protected readonly isDragOverHoroscope = signal(false);
  protected readonly isUploadingHoroscopeDoc = signal(false);
  protected readonly showRemoveHoroscopeConfirm = signal(false);

  // ── Voice Introduction ──────────────────────────────────────────────────────
  protected readonly voiceIntroUrl       = signal<string | null>(null);
  protected readonly isUploadingVoice    = signal(false);
  protected readonly voiceUploadError    = signal<string | null>(null);

  protected readonly user = signal<User | null>(null);
  protected readonly profileId = signal<string | null>(null);

  private readonly _availableCities            = signal<string[]>([]);
  private readonly _availableOccupations       = signal<string[]>([]);
  private readonly _availableEducation         = signal<string[]>([]);
  private readonly _availableWorkingStatuses   = signal<string[]>(withTrailingOther(
    ['Employed', 'Self-Employed', 'Business', 'Not Working', 'Student']));

  protected readonly availableCities           = this._availableCities.asReadonly();
  protected readonly availableOccupations      = this._availableOccupations.asReadonly();
  protected readonly availableEducation        = this._availableEducation.asReadonly();
  protected readonly availableWorkingStatuses  = this._availableWorkingStatuses.asReadonly();

  // ── Country / State lookups ─────────────────────────────────────────────────
  private readonly _countries = signal<CountryLookup[]>([]);
  private readonly _states    = signal<StateLookup[]>([]);

  protected readonly countries         = this._countries.asReadonly();
  protected readonly selectedCountryId = signal<string | null>(null);
  protected readonly statesLoading     = signal(false);

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

  // ── Searchable dropdowns for Education Level / Job Title / Working Status ───
  protected readonly educationSearch     = signal('');
  protected readonly occupationSearch    = signal('');
  protected readonly workingStatusSearch = signal('');

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

  protected readonly filteredWorkingStatuses = computed(() => {
    const q = this.workingStatusSearch().trim().toLowerCase();
    const all = this.availableWorkingStatuses();
    return q ? all.filter(w => w.toLowerCase().includes(q)) : all;
  });

  // ── "Others" custom entry for Education Level / Job Title / Working Status ──
  protected readonly showCustomEducation      = signal(false);
  protected readonly showCustomOccupation     = signal(false);
  protected readonly showCustomWorkingStatus  = signal(false);
  protected readonly customEducationValue     = signal('');
  protected readonly customOccupationValue    = signal('');
  protected readonly customWorkingStatusValue = signal('');

  protected membershipIcon(tier: string): string {
    if (tier === 'platinum') return 'diamond';
    if (tier === 'gold')     return 'star';
    if (tier === 'silver')   return 'workspace_premium';
    return 'person_outline';
  }

  protected get initials(): string {
    const first = this.basicForm.value.firstName?.[0] ?? '';
    const last  = this.basicForm.value.lastName?.[0]  ?? '';
    return (first + last).toUpperCase() || '?';
  }

  protected async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    input.value = '';
    if (!file) return;

    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      this.avatarError.set('Please select a JPG, PNG or WebP image.');
      return;
    }
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
      this.avatarError.set(`Image must be smaller than ${MAX_PHOTO_MB} MB.`);
      return;
    }
    //const origUrl = await this.profileService.uploadPhoto(file);
    //this.originalAvatarUrl.set(origUrl);
    const variants = await this.profileService.uploadPhotoVariant(file);
    this.photoVariants.set(variants);

    this.avatarError.set(null);

    // Open the image cropper dialog
    const dialogRef = this.dialog.open(ImageCropperDialogComponent, {
      data:          { imageFile: file } satisfies ImageCropperDialogData,
      width:         '95vw',
      maxWidth:      '960px',
      height:        '90vh',
      maxHeight:     '700px',
      panelClass:    'suhana-image-cropper-panel',
      disableClose:  true,
    });

    const result: ImageCropperDialogResult | null = await firstValueFrom(dialogRef.afterClosed());
    if (!result) return; // user cancelled

    // Show cropped base64 as instant preview while uploading
    const prev = this.avatarPreview();
    if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
    this.avatarPreview.set(result.base64);

    this.isSaving.set(true);
    this.saveError.set(null);
    try {
      const croppedFile = new File([result.blob], file.name, { type: 'image/jpeg' });
      const url = await this.profileService.uploadPhotoVariant(croppedFile);
      if (url) {
        this.currentAvatarUrl.set(url.thumbnailUrl);
        this.currentAvatar.set(url);
        this.avatarPreview.set(null);
        this.avatarFile.set(null);
      }
    } catch (err: any) {
      this.saveError.set(err?.error?.message ?? 'Failed to upload photo. Please try again.');
    } finally {
      this.isSaving.set(false);
    }
  }

  protected onRemovePhoto(): void {
    const prev = this.avatarPreview();
    if (prev) URL.revokeObjectURL(prev);
    this.avatarPreview.set(null);
    this.avatarFile.set(null);
    this.currentAvatarUrl.set(null);
    this.avatarError.set(null);
  }

  // ── Section 1: Basic ────────────────────────────────────────────────────────
  protected readonly basicForm = this.fb.group({
    userId:      [''],
    firstName:    ['', [Validators.required, Validators.minLength(2)]],
    lastName:     ['', [Validators.required, Validators.minLength(2)]],
    gender:       ['' as Gender, Validators.required],
    dateOfBirth:  [null as Date | null, Validators.required],
    height:       ['', Validators.required],
    weight:       [''],
    complexion:   [''],
    aboutMe:      ['', [Validators.required, Validators.minLength(20)]],
    videoIntroUrl:[''],
    mobile:       [''],
    interest:     [''],
  });

  // ── Section 2: Religion & Culture ───────────────────────────────────────────
  protected readonly religionForm = this.fb.group({
    religion:     ['', Validators.required],
    caste:        [''],
    motherTongue: ['', Validators.required],
  });

  // ── Section 3: Location ─────────────────────────────────────────────────────
  protected readonly locationForm = this.fb.group({
    city:              ['', Validators.required],
    state:             ['', Validators.required],
    country:           ['India', Validators.required],
    willingToRelocate: [false],
  });

  // ── Section 4: Education ────────────────────────────────────────────────────
  protected readonly educationForm = this.fb.group({
    level:       ['', [Validators.required, notLiteralOtherValidator]],
    field:       ['', Validators.required],
    institution: [''],
  });

  // ── Section 5: Occupation ───────────────────────────────────────────────────
  protected readonly occupationForm = this.fb.group({
    title:         ['', [Validators.required, notLiteralOtherValidator]],
    company:       [''],
    annualIncome:  [''],
    workingStatus: ['Employed', [Validators.required, notLiteralOtherValidator]],
  });

  // ── Section 6: Family ───────────────────────────────────────────────────────
  protected readonly familyForm = this.fb.group({
    familyType:           ['nuclear' as FamilyType, Validators.required],
    fatherOccupation:     [''],
    motherOccupation:     [''],
    siblings:             [0],
    familyValues:         [''],
    familyPreferenceNote: [''],
  });

  // ── Section 7: Horoscope ────────────────────────────────────────────────────
  protected readonly horoscopeForm = this.fb.group({
    dateOfBirth:   [null as Date | null],
    timeOfBirth:   [null as Date | null],
    placeOfBirth:  [''],
    rashi:         [''],
    nakshatra:     [''],
    manglikStatus: [''],
  });

  /**
   * Minimum legal marriageable age for the partner-preference range, based on
   * the profile's own country (Location) and gender (Basic Information). India
   * requires 21 for brides and 18 for grooms; everywhere else the floor is 18.
   */
  protected requiredPartnerMinAge(): number {
    const country = (this.locationForm.controls.country.value ?? '').trim().toLowerCase();
    const gender  = this.basicForm.controls.gender.value;
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

  // ── Section 8: Partner Preferences ─────────────────────────────────────────
  protected readonly preferencesForm = this.fb.group({
    ageMin:         [21, Validators.required],
    ageMax:         [35, Validators.required],
    heightMin:      [''],
    heightMax:      [''],
    religions:      [[] as string[]],
    castes:         [[] as string[]],
    education:      [[] as string[]],
    occupations:    [[] as string[]],
    locations:      [[] as string[]],
    foodPreference: ['' as FoodPreference | ''],
    familyType:     ['' as FamilyType | ''],
  }, { validators: this.ageRangeValidator });

  /** Friendly, customer-facing message for the current preferencesForm age-range error, if any. */
  protected ageRangeErrorMessage(): string | null {
    const errors = this.preferencesForm.errors;
    if (!errors) return null;

    if (errors['ageMinBelowLegal']) {
      const requiredMinAge = errors['ageMinBelowLegal'].requiredMinAge as number;
      const gender  = this.basicForm.controls.gender.value;
      const country = (this.locationForm.controls.country.value ?? '').trim().toLowerCase();
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

  // ── Section 9: Photos & Privacy ─────────────────────────────────────────────
  protected readonly privacyForm = this.fb.group({
    photoPrivacy: ['everyone' as PhotoPrivacy, Validators.required],
    status:       ['active' as ProfileStatus, Validators.required],
  });

  // ── Dropdown options ─────────────────────────────────────────────────────────
  protected readonly religions      = ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Jain', 'Buddhist', 'Other'];
  protected readonly educationLevels = ["High School", "Bachelor's", "Master's", 'PhD', 'MBA', 'Medical', 'Engineering', 'Other'];
  protected readonly occupationList  = ['Software Engineer', 'Doctor', 'Lawyer', 'Business Analyst', 'Teacher', 'Designer', 'Entrepreneur', 'CA', 'Government', 'Other'];
  protected readonly heights         = ["4'10\"","4'11\"","5'0\"","5'1\"","5'2\"","5'3\"","5'4\"","5'5\"","5'6\"","5'7\"","5'8\"","5'9\"","5'10\"","5'11\"","6'0\"","6'1\"","6'2\"","6'3\""];
  protected readonly complexions     = ['Fair', 'Wheatish', 'Dusky', 'Dark'];
  protected readonly rashiList       = ['Mesha','Vrishabha','Mithuna','Karka','Simha','Kanya','Tula','Vrishchika','Dhanu','Makara','Kumbha','Meena'];
  protected readonly nakshatraList   = ['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Moola','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishtha','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati'];
  protected readonly manglikOptions  = ['Manglik', 'Non-Manglik', 'Partial Manglik', 'Unknown'];
  protected readonly cities          = ['Mumbai','Delhi','Bangalore','Chennai','Hyderabad','Pune','Kolkata','Jaipur','Ahmedabad','Surat','Other'];

  protected readonly photoPrivacyOptions: { value: PhotoPrivacy; label: string; icon: string }[] = [
    { value: 'everyone',       label: 'Visible to Everyone',      icon: 'public' },
    { value: 'mutual_matches', label: 'Mutual Matches Only',      icon: 'people' },
    { value: 'premium_only',   label: 'Premium Members Only',     icon: 'workspace_premium' },
    { value: 'on_request',     label: 'On Request Only',          icon: 'lock_open' },
  ];
  protected readonly profileStatusOptions: { value: ProfileStatus; label: string }[] = [
    { value: 'active',   label: 'Active — visible to others' },
    { value: 'inactive', label: 'Inactive — hidden from search' },
    { value: 'pending',  label: 'Pending — under review' },
  ];
  protected readonly foodPreferenceOptions: { value: FoodPreference; label: string }[] = [
    { value: 'vegetarian',     label: 'Vegetarian' },
    { value: 'non_vegetarian', label: 'Non-Vegetarian' },
    { value: 'vegan',          label: 'Vegan' },
    { value: 'eggetarian',     label: 'Eggetarian' },
  ];

  async ngOnInit(): Promise<void> {
    // The age-range rule depends on country (Location) and gender (Basic Info), which live
    // in sibling FormGroups — Angular only auto-revalidates a group's own descendants,
    // so re-run preferencesForm's validity check whenever either one changes.
    this.locationForm.controls.country.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.preferencesForm.updateValueAndValidity());
    this.basicForm.controls.gender.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.preferencesForm.updateValueAndValidity());

    await Promise.all([this.loadLookupValues(), this.loadCountries()]);
    await this.profileService.loadMyProfile();
    const profile = this.profileService.myProfile();
    if (profile) this.patchForms(profile);
    this.isLoading.set(false);
  }

  private patchForms(p: UserProfile): void {
    this.currentAvatarUrl.set(p.photos?.find(ph => ph.isPrimary)?.url ?? p.photos?.[0]?.url ?? null);
    this.profileId.set(p.userId);
    this.basicForm.patchValue({
      userId: p.userId ?? '',
      firstName: p.firstName, lastName: p.lastName,
      gender: p.gender ?? p.user?.gender ?? '',
      dateOfBirth: p.dateOfBirth ? new Date(this.parseBackDateOnly(p.dateOfBirth.toString())) : null,
      height: p.height, weight: p.weight ?? '', complexion: p.complexion ?? '',
      aboutMe: p.aboutMe, videoIntroUrl: p.videoIntroUrl ?? '',
      mobile: p.user?.mobile ?? '',
      interest: p.interests ?? ''
    });
    this.religionForm.patchValue({
      religion: p.religion, caste: p.caste ?? '', motherTongue: p.motherTongue,
    });
    this.locationForm.patchValue({
      city: p.location.city, state: p.location.state,
      country: p.location.country, willingToRelocate: p.location.willingToRelocate,
    });
    void this.selectCountryByName(p.location.country ?? 'India').then(() => {
      // Re-apply the state now that its options have loaded from the resolved country.
      this.locationForm.patchValue({ state: p.location.state ?? '' });
    });
    this.educationForm.patchValue({
      level: p.education.level, field: p.education.field,
      institution: p.education.institution ?? '',
    });
    this.occupationForm.patchValue({
      title: p.occupation.title, company: p.occupation.company ?? '',
      annualIncome: p.occupation.annualIncome ?? '', workingStatus: p.occupation.workingStatus,
    });
    this.familyForm.patchValue({
      familyType: p.familyDetails.familyType,
      fatherOccupation: p.familyDetails.fatherOccupation ?? '',
      motherOccupation: p.familyDetails.motherOccupation ?? '',
      siblings: p.familyDetails.siblings ?? 0,
      familyValues: p.familyDetails.familyValues ?? '',
      familyPreferenceNote: p.familyDetails.familyPreferenceNote ?? '',
    });
    if (p.horoscope) {
      this.horoscopeForm.patchValue({
        dateOfBirth: p.horoscope.dateOfBirth ? new Date(p.horoscope.dateOfBirth) : new Date(this.parseBackDateOnly(p.dateOfBirth.toString())),
        timeOfBirth: this.parseTimeOfBirth(p.horoscope.timeOfBirth),
        placeOfBirth: p.horoscope.placeOfBirth ?? '',
        rashi: p.horoscope.rashi ?? '', 
        nakshatra: p.horoscope.nakshatra ?? '',
        manglikStatus: p.horoscope.manglikStatus ?? '',
      });
      this.horoscopeDocUrl.set(p.horoscope.documentUrl ?? null);
      if (p.horoscope.documentUrl) {
        const parts = p.horoscope.documentUrl.split('/');
        this.horoscopeDocName.set(parts[parts.length - 1]);
      }
    }
    this.preferencesForm.patchValue({
      ageMin: p.preferences.ageRange.min, ageMax: p.preferences.ageRange.max,
      heightMin: p.preferences.heightRange?.min ?? '', heightMax: p.preferences.heightRange?.max ?? '',
      religions: p.preferences.religions ?? [], castes: p.preferences.castes ?? [],
      education: p.preferences.education ?? [], occupations: p.preferences.occupations ?? [],
      locations: p.preferences.locations ?? [],
      foodPreference: p.preferences.foodPreference ?? '',
      familyType: p.preferences.familyType ?? '',
    });
    this.privacyForm.patchValue({ photoPrivacy: p.photoPrivacy, status: p.status });

    this.voiceIntroUrl.set(p.voiceIntroductionUrl ?? null);

    this.user.set({
      id: p.user?.id ?? '',
      email: p.user?.email ?? '',
      role: p.user?.role ?? 'guest',
      mobile: p.user?.mobile ?? '',
      gender: p.user?.gender ?? 'bride',
      membership: p.user?.membership ?? 'free',
      createdAt: p.user?.createdAt ? new Date(p.user.createdAt) : new Date(),
      lastActive: p.user?.lastActive ? new Date(p.user.lastActive) : new Date(),
      isVerified: p.user?.isVerified ?? true,
      isMobileVerified: p.user?.isMobileVerified ?? false,
      tempGuid: p.user?.tempGuid,
      } as User );
  }

  protected openVoiceIntroDialog(): void {
    const ref = this.dialog.open(VoiceIntroductionDialogComponent, {
      data: { existingUrl: this.voiceIntroUrl() ?? undefined } satisfies VoiceIntroductionDialogData,
      width: '540px',
      maxWidth: '96vw',
      panelClass: 'suhana-dialog',
      disableClose: false,
    });
    ref.afterClosed().subscribe((result: VoiceIntroductionDialogResult | null) => {
      if (result?.url) this.voiceIntroUrl.set(result.url);
    });
  }

  protected removeVoiceIntro(): void { this.voiceIntroUrl.set(null); }

  protected openVerifyMobileDialog(): void {
    // Don't prefill the placeholder "0" — start the dialog blank instead.
    const raw = this.user()?.mobile;
    const mobile = this.commonService.hasMobile(raw) ? String(raw) : '';
    const ref = this.dialog.open(MobileVerificationDialogComponent, {
      data: { mobileNumber: mobile } satisfies MobileVerificationDialogData,
      width: '480px',
      maxWidth: '96vw',
      panelClass: 'suhana-dialog',
      disableClose: true,
    });
    ref.afterClosed().subscribe((result: MobileVerificationDialogResult | null) => {
      if (!result?.verified) return;
      // The dialog also allows changing the number, so adopt whatever it verified.
      this.user.update(u => u ? { ...u, mobile: result.mobileNumber, isMobileVerified: true } : u);
      this.basicForm.patchValue({ mobile: result.mobileNumber });
    });
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
    await this.selectCountryByName(this.locationForm.controls.country.value ?? '');
  }

  private async selectCountryByName(name: string): Promise<void> {
    const country = this.countries().find(c => c.name === name);
    if (!country) {
      this.selectedCountryId.set(null);
      this._states.set([]);
      this.locationForm.controls.state.disable();
      return;
    }
    this.selectedCountryId.set(country.id);
    this.locationForm.controls.state.enable();
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
    this.locationForm.patchValue({ state: '' });
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

  protected onWorkingStatusChange(value: string): void {
    this.showCustomWorkingStatus.set(value === 'Others');
    if (value !== 'Others') this.customWorkingStatusValue.set('');
  }

  protected addCustomEducation(): void {
    const value = this.customEducationValue().trim();
    if (!value) return;
    this._availableEducation.update(list =>
      list.includes(value) ? list : [...list.filter(v => v !== 'Others'), value, 'Others']);
    this.educationForm.patchValue({ level: value });
    this.customEducationValue.set('');
    this.showCustomEducation.set(false);
  }

  protected addCustomOccupation(): void {
    const value = this.customOccupationValue().trim();
    if (!value) return;
    this._availableOccupations.update(list =>
      list.includes(value) ? list : [...list.filter(v => v !== 'Others'), value, 'Others']);
    this.occupationForm.patchValue({ title: value });
    this.customOccupationValue.set('');
    this.showCustomOccupation.set(false);
  }

  protected addCustomWorkingStatus(): void {
    const value = this.customWorkingStatusValue().trim();
    if (!value) return;
    this._availableWorkingStatuses.update(list =>
      list.includes(value) ? list : [...list.filter(v => v !== 'Others'), value, 'Others']);
    this.occupationForm.patchValue({ workingStatus: value });
    this.customWorkingStatusValue.set('');
    this.showCustomWorkingStatus.set(false);
  }

  async saveAll(): Promise<void> {
    this.saveError.set(null);
    this.saveSuccess.set(false);

    this.basicForm.markAllAsTouched();
    this.preferencesForm.markAllAsTouched();

    if (this.basicForm.controls.gender.invalid) {
      this.saveError.set('Please select your gender before saving.');
      return;
    }
    if (this.preferencesForm.invalid) {
      this.saveError.set(
        this.ageRangeErrorMessage() ?? 'Minimum age criteria does not match. Please adjust your partner age preferences.',
      );
      return;
    }

    this.isSaving.set(true);

    const basic  = this.basicForm.getRawValue();
    const rel    = this.religionForm.getRawValue();
    const loc    = this.locationForm.getRawValue();
    const edu    = this.educationForm.getRawValue();
    const occ    = this.occupationForm.getRawValue();
    const fam    = this.familyForm.getRawValue();
    const horo   = this.horoscopeForm.getRawValue();
    const prefs  = this.preferencesForm.getRawValue();
    const priv   = this.privacyForm.getRawValue();
    const dob    = basic.dateOfBirth ?? new Date();

    const photos = this.getPhotosArray();
    
    const updated: Partial<UserProfile> = {
      userId: basic.userId ?? '',
      firstName: basic.firstName ?? '',
      lastName:  basic.lastName ?? '',
      gender: (basic.gender || undefined) as Gender | undefined,
      tempGuid: this.user()?.tempGuid,
      dateOfBirth: dob,
      age: Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000),
      height: basic.height ?? '',
      weight: basic.weight || undefined,
      complexion: basic.complexion || undefined,
      aboutMe: basic.aboutMe ?? '',
      videoIntroUrl: basic.videoIntroUrl || undefined,
      voiceIntroductionUrl: this.voiceIntroUrl() || undefined,
      religion: rel.religion ?? '',
      caste: rel.caste || undefined,
      motherTongue: rel.motherTongue ?? '',

      location: {
        city: loc.city ?? '', state: loc.state ?? '',
        country: loc.country ?? 'India', willingToRelocate: loc.willingToRelocate ?? false,
      },
      education: { level: edu.level ?? '', field: edu.field ?? '', institution: edu.institution || undefined },
      occupation: {
        title: occ.title ?? '', company: occ.company || undefined,
        annualIncome: occ.annualIncome || undefined, workingStatus: occ.workingStatus ?? 'Employed',
      },
      familyDetails: {
        familyType: (fam.familyType ?? 'nuclear') as FamilyType,
        fatherOccupation: fam.fatherOccupation || undefined,
        motherOccupation: fam.motherOccupation || undefined,
        siblings: fam.siblings   ?? undefined,
        familyValues: fam.familyValues || undefined,
        familyPreferenceNote: fam.familyPreferenceNote || undefined,
      },
      horoscope: {
        dateOfBirth: horo.dateOfBirth ? new Date(horo.dateOfBirth) : dob,
        timeOfBirth: this.formatTimeOfBirth(horo.timeOfBirth),
        placeOfBirth: horo.placeOfBirth || undefined,
        rashi: horo.rashi || undefined,
        nakshatra: horo.nakshatra || undefined,
        manglikStatus: horo.manglikStatus || undefined,
        documentUrl: this.horoscopeDocUrl() || undefined,
      },
      preferences: {
        ageRange: { min: prefs.ageMin ?? 21, max: prefs.ageMax ?? 35 },
        heightRange: prefs.heightMin && prefs.heightMax ? { min: prefs.heightMin, max: prefs.heightMax } : undefined,
        religions:   prefs.religions?.length   ? prefs.religions   : undefined,
        castes:      prefs.castes?.length      ? prefs.castes      : undefined,
        education:   prefs.education?.length   ? prefs.education   : undefined,
        occupations: prefs.occupations?.length ? prefs.occupations : undefined,
        locations:   prefs.locations?.length   ? prefs.locations   : undefined,
        foodPreference: (prefs.foodPreference as FoodPreference) || undefined,
        familyType:     (prefs.familyType as FamilyType) || undefined,
      },
      photoPrivacy: priv.photoPrivacy as PhotoPrivacy,
      status: priv.status as ProfileStatus,
      photos: this.getPhotosArray(),
    };

    try {

      //this.currentAvatarUrl.set(url);
      await this.profileService.updateProfile(updated);
      this.saveSuccess.set(true);
      setTimeout(() => this.router.navigate(['/profile']), 1500);
    } catch (err: any) {
      this.saveError.set(err?.error?.message ?? 'Failed to save. Please try again.');
    } finally {
      this.isSaving.set(false);
    }
  }

  protected goBack(): void { this.router.navigate(['/profile']); }

  // ── Horoscope document handlers ─────────────────────────────────────────────

  protected onHoroscopeDocSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) this.processHoroscopeDoc(file);
  }

  protected onHoroscopeDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOverHoroscope.set(true);
  }

  protected onHoroscopeDragLeave(): void {
    this.isDragOverHoroscope.set(false);
  }

  protected onHoroscopeDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOverHoroscope.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) this.processHoroscopeDoc(file);
  }

  protected removeHoroscopeDoc(): void {
    this.showRemoveHoroscopeConfirm.set(true);
  }

  protected confirmRemoveHoroscopeDoc(): void {
    this.horoscopeDocFile.set(null);
    this.horoscopeDocName.set(null);
    this.horoscopeDocUrl.set(null);
    this.horoscopeDocError.set(null);
    this.showRemoveHoroscopeConfirm.set(false);
  }

  protected cancelRemoveHoroscopeDoc(): void {
    this.showRemoveHoroscopeConfirm.set(false);
  }

  protected horoscopeDocIcon(url: string): string {
    const ext = url.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
    if (ext === 'pdf') return 'picture_as_pdf';
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'].includes(ext)) return 'image';
    return 'description';
  }

  protected horoscopeDocBadge(url: string): string {
    return url.split('?')[0].split('.').pop()?.toUpperCase() ?? 'DOC';
  }

  private async processHoroscopeDoc(file: File): Promise<void> {
    this.horoscopeDocError.set(null);
    if (!ALLOWED_HOROSCOPE_TYPES.includes(file.type)) {
      this.horoscopeDocError.set('Only PDF or image files (JPG, PNG, WebP) are allowed.');
      return;
    }
    if (file.size > MAX_HOROSCOPE_MB * 1024 * 1024) {
      this.horoscopeDocError.set(`File must be smaller than ${MAX_HOROSCOPE_MB} MB.`);
      return;
    }
    this.horoscopeDocFile.set(file);
    this.horoscopeDocName.set(file.name);
    this.isUploadingHoroscopeDoc.set(true);
    try {
      const res = await firstValueFrom(this.api.uploadHoroscopeDoc(file));
      const url: string = res?.url ?? res?.data?.url ?? res?.fileUrl ?? res?.data?.fileUrl ?? '';
      if (url) {
        this.horoscopeDocUrl.set(url);
      }
    } catch {
      this.horoscopeDocError.set('Upload failed. You can still save — the document will be re-uploaded on save.');
    } finally {
      this.isUploadingHoroscopeDoc.set(false);
    }
  }

  /** Parses "HH:mm" (24h) or "hh:mm AM/PM" into a Date carrying just that time. */
  protected parseTimeOfBirth(value: string | undefined | null): Date | null {
    const trimmed = value?.trim();
    if (!trimmed) return null;

    const time = new Date();
    const twentyFourHour = trimmed.match(/^(\d{1,2}):(\d{2})$/);
    if (twentyFourHour) {
      time.setHours(Number(twentyFourHour[1]), Number(twentyFourHour[2]), 0, 0);
      return time;
    }

    const twelveHour = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (twelveHour) {
      const hours12 = Number(twelveHour[1]) % 12;
      const isPm = twelveHour[3].toUpperCase() === 'PM';
      time.setHours(isPm ? hours12 + 12 : hours12, Number(twelveHour[2]), 0, 0);
      return time;
    }

    return null;
  }

  /** Formats a timeOfBirth Date back into "hh:mm AM/PM" for the backend. */
  protected formatTimeOfBirth(value: Date | null | undefined): string | undefined {
    if (!value) return undefined;
    return value.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  protected openWeightDialog(): void {
    const ref = this.dialog.open(WeightEntryDialogComponent, {
      data: { currentWeight: this.basicForm.controls.weight.value ?? '' } satisfies WeightEntryDialogData,
      width: '420px',
      maxWidth: '96vw',
      panelClass: 'suhana-dialog',
      disableClose: false,
    });
    ref.afterClosed().subscribe((result: WeightEntryDialogResult | null) => {
      if (result?.weight) this.basicForm.patchValue({ weight: result.weight });
    });
  }

  parseDateOnly(date: string): Date {
    const [month, day, year] = date.split('/').map(Number);

    return new Date(year, month - 1, day);
  }

  parseBackDateOnly(date: string): Date {
    const [ year, month, day ] = date.split('-').map(Number);

    return new Date(year, month - 1, day);
  }

  getPhotosArray(): ProfilePhoto[] {
    const photos: ProfilePhoto[] = [];
    const variants = this.photoVariants();
    const currentUrl = this.currentAvatar()?.thumbnailUrl || this.currentAvatar()?.displayUrl || this.currentAvatar()?.originalUrl || '';
    const originalUrl = variants?.thumbnailUrl || variants?.displayUrl || variants?.originalUrl || '';

    if (this.currentAvatar()) {
      photos.push({ url: this.currentAvatar()?.thumbnailUrl || '', variants: this.currentAvatar() || undefined, isPrimary: true, isVerified: false });
    }

    if (originalUrl && originalUrl !== currentUrl) {
      photos.push({ url: variants?.thumbnailUrl || '', variants: variants || undefined, isPrimary: false, isVerified: false });
    }
    return photos;
  }
}
