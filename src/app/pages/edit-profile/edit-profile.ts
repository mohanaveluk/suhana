import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TitleCasePipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MaterialModule } from '../../shared/modules/material.module';
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
} from '../../models/user.model';
import { firstValueFrom } from 'rxjs';

const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PHOTO_MB = 2;

const ALLOWED_HOROSCOPE_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_HOROSCOPE_MB = 10;

@Component({
  selector: 'app-edit-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, MaterialModule, TitleCasePipe],
  templateUrl: './edit-profile.html',
  styleUrl: './edit-profile.scss',
})
export class EditProfileComponent implements OnInit {
  private readonly fb             = inject(FormBuilder);
  private readonly profileService = inject(ProfileService);
  private readonly api            = inject(ApiService);
  private readonly router         = inject(Router);
  private readonly dialog         = inject(MatDialog);
  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly saveSuccess = signal(false);

  protected readonly currentAvatarUrl = signal<string | null>(null);
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

  protected readonly user = signal<User | null>(null);
  protected readonly profileId = signal<string | null>(null);

  private readonly _availableCities       = signal<string[]>([]);
  private readonly _availableOccupations  = signal<string[]>([]);
  private readonly _availableEducation    = signal<string[]>([]);

  protected readonly availableCities      = this._availableCities.asReadonly();
  protected readonly availableOccupations = this._availableOccupations.asReadonly();
  protected readonly availableEducation   = this._availableEducation.asReadonly();

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
      const url = await this.profileService.uploadPhoto(croppedFile);
      if (url) {
        this.currentAvatarUrl.set(url);
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
    dateOfBirth:  [null as Date | null, Validators.required],
    height:       ['', Validators.required],
    weight:       [''],
    complexion:   [''],
    aboutMe:      ['', [Validators.required, Validators.minLength(20)]],
    videoIntroUrl:[''],
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
    level:       ['', Validators.required],
    field:       ['', Validators.required],
    institution: [''],
  });

  // ── Section 5: Occupation ───────────────────────────────────────────────────
  protected readonly occupationForm = this.fb.group({
    title:         ['', Validators.required],
    company:       [''],
    annualIncome:  [''],
    workingStatus: ['Employed', Validators.required],
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
    timeOfBirth:   [''],
    placeOfBirth:  [''],
    rashi:         [''],
    nakshatra:     [''],
    manglikStatus: [''],
  });

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
  });

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
  protected readonly workingStatuses = ['Employed', 'Self-Employed', 'Business', 'Not Working', 'Student'];
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
    await this.loadLookupValues();
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
      dateOfBirth: p.dateOfBirth ? new Date(this.parseBackDateOnly(p.dateOfBirth.toString())) : null,
      height: p.height, weight: p.weight ?? '', complexion: p.complexion ?? '',
      aboutMe: p.aboutMe, videoIntroUrl: p.videoIntroUrl ?? '',
    });
    this.religionForm.patchValue({
      religion: p.religion, caste: p.caste ?? '', motherTongue: p.motherTongue,
    });
    this.locationForm.patchValue({
      city: p.location.city, state: p.location.state,
      country: p.location.country, willingToRelocate: p.location.willingToRelocate,
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
        timeOfBirth: p.horoscope.timeOfBirth ?? '', 
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
      tempGuid: p.user?.tempGuid,
      } as User );
  }

  
  private async loadLookupValues(): Promise<void> {
    try {
      const res = await firstValueFrom(this.api.getLookupValues());
      if (res.cities?.length)          this._availableCities.set(res.cities.map(c => c.name));
      if (res.occupations?.length)     this._availableOccupations.set(res.occupations.map(o => o.name));
      if (res.educationLevels?.length) this._availableEducation.set(res.educationLevels.map(e => e.name));
    } catch {
      this._availableCities.set(['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad', 'Pune', 'Kolkata', 'Jaipur', 'Ahmedabad', 'Surat']);
      this._availableOccupations.set(['Software Engineer', 'Doctor', 'Lawyer', 'Business Analyst', 'Teacher', 'Designer', 'Entrepreneur', 'CA', 'Architect', 'AI Engineer']);
      this._availableEducation.set(['Bachelor', 'Master', 'PhD', 'MBA', 'Medical', 'Engineering', 'Diploma', 'B.Tech', 'M.Tech']);
    }
  }

  async saveAll(): Promise<void> {
    this.saveError.set(null);
    this.saveSuccess.set(false);
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

    const updated: Partial<UserProfile> = {
      userId: basic.userId ?? '',
      firstName: basic.firstName ?? '',
      lastName:  basic.lastName ?? '',
      tempGuid: this.user()?.tempGuid,
      dateOfBirth: dob,
      age: Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000),
      height: basic.height ?? '',
      weight: basic.weight || undefined,
      complexion: basic.complexion || undefined,
      aboutMe: basic.aboutMe ?? '',
      videoIntroUrl: basic.videoIntroUrl || undefined,
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
        timeOfBirth: horo.timeOfBirth || undefined,
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
      photos: this.currentAvatarUrl() ? [{url: this.currentAvatarUrl(), isPrimary: true, isVerified: false }] as ProfilePhoto[] : [],
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

  parseDateOnly(date: string): Date {
    const [month, day, year] = date.split('/').map(Number);

    return new Date(year, month - 1, day);
  }

  parseBackDateOnly(date: string): Date {
    const [ year, month, day ] = date.split('-').map(Number);

    return new Date(year, month - 1, day);
  }
}
