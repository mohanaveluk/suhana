import { Component, ChangeDetectionStrategy, inject, signal, ViewChild, OnInit, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatStepper } from '@angular/material/stepper';
import { MaterialModule } from '../../shared/modules/material.module';
import { ApiService, AuthService } from '../../services';
import { ProfileService } from '../../services';
import { Gender } from '../../models/user.model';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-register',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule, RouterLink, MaterialModule,
  ],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class RegisterComponent  implements OnInit  {
  @ViewChild('stepper') private readonly stepper!: MatStepper;

  private readonly api = inject(ApiService);
  
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly profileService = inject(ProfileService);
  private readonly router = inject(Router);

  protected readonly hidePassword = signal(true);
  protected readonly isSubmitting = signal(false);
  protected readonly registrationError = signal<string | null>(null);
  protected readonly profileError = signal<string | null>(null);
  protected readonly registeredUserId = signal<string | null>(null);

  private readonly _availableCities       = signal<string[]>([]);
  private readonly _availableOccupations  = signal<string[]>([]);
  private readonly _availableEducation    = signal<string[]>([]);

  protected readonly availableCities      = this._availableCities.asReadonly();
  protected readonly availableOccupations = this._availableOccupations.asReadonly();
  protected readonly availableEducation   = this._availableEducation.asReadonly();

  protected readonly religions = ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Jain', 'Buddhist', 'Other'];
  protected readonly educationLevels = ['High School', 'Bachelor\'s', 'Master\'s', 'PhD', 'MBA', 'Medical', 'Engineering', 'Other'];
  protected readonly occupations1 = ['Software Engineer', 'Doctor', 'Lawyer', 'Business Analyst', 'Teacher', 'Designer', 'Entrepreneur', 'CA', 'Government', 'Other'];

  protected readonly occupations = computed(() => {
    const all = this.availableOccupations();
    return all;
  });


  // Step 1: Account
  protected readonly accountForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
    gender: ['bride' as Gender, Validators.required],
    mobile: ['0', Validators.required],
    agreeTerms: [false, Validators.requiredTrue],
  });

  // Step 2: Personal
  protected readonly personalForm = this.fb.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    dateOfBirth: [null as Date | null, Validators.required],
    religion: ['', Validators.required],
    caste: [''],
    motherTongue: ['', Validators.required],
    height: ['', Validators.required],
    city: ['', Validators.required],
    state: ['', Validators.required],
    country: ['India', Validators.required],
  });

  // Step 3: Professional
  protected readonly professionalForm = this.fb.group({
    educationLevel: ['', Validators.required],
    educationField: ['', Validators.required],
    institution: [''],
    occupation: ['', Validators.required],
    company: [''],
    annualIncome: [''],
  });

  // Step 4: Preferences
  protected readonly preferencesForm = this.fb.group({
    ageMin: [21, Validators.required],
    ageMax: [35, Validators.required],
    preferredReligions: [[] as string[]],
    preferredLocations: [[] as string[]],
    preferredEducation: [[] as string[]],
    aboutMe: ['', [Validators.required, Validators.minLength(50)]],
  });

  async ngOnInit(): Promise<void> {
    await this.loadLookupValues();
  }

  private async loadLookupValues(): Promise<void> {
    try {
      const res = await firstValueFrom(this.api.getLookupValues());
      if (res.cities?.length)         this._availableCities.set(res.cities.map(c => c.name));
      if (res.occupations?.length)    this._availableOccupations.set(res.occupations.map(o => o.name));
      if (res.educationLevels?.length) this._availableEducation.set(res.educationLevels.map(e => e.name));
    } catch {
      this._availableCities.set(['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad', 'Pune', 'Kolkata', 'Jaipur', 'Ahmedabad', 'Surat']);
      this._availableOccupations.set(['Software Engineer', 'Doctor', 'Lawyer', 'Business Analyst', 'Teacher', 'Designer', 'Entrepreneur', 'CA', 'Architect', 'AI Engineer']);
      this._availableEducation.set(['Bachelor', 'Master', 'PhD', 'MBA', 'Medical', 'Engineering', 'Diploma', 'B.Tech', 'M.Tech']);
    }
  }


  async onStep1Next(): Promise<void> {
    this.accountForm.markAllAsTouched();
    if (this.accountForm.invalid) return;

    this.isSubmitting.set(true);
    this.registrationError.set(null);

    const account = this.accountForm.getRawValue();
    try {
      const userId = await this.auth.register({
        email: account.email ?? '',
        password: account.password ?? '',
        gender: account.gender as string,
        mobile: account.mobile ?? '',
      });
      this.registeredUserId.set(userId);
      this.stepper.next();
    } catch (err: any) {
      this.registrationError.set(err?.error?.message ?? 'Registration failed. Please try again.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async onSubmit(): Promise<void> {
    if (this.personalForm.invalid ||
        this.professionalForm.invalid || this.preferencesForm.invalid) return;

    this.isSubmitting.set(true);
    this.profileError.set(null);

    const personal = this.personalForm.getRawValue();
    const professional = this.professionalForm.getRawValue();
    const prefs = this.preferencesForm.getRawValue();

    const age = personal.dateOfBirth
      ? Math.floor((Date.now() - new Date(personal.dateOfBirth).getTime()) / 31557600000)
      : 25;

    try {
      await this.profileService.updateProfile({
        userId: this.registeredUserId() ?? this.auth.user()?.id ?? '',
        firstName: personal.firstName || '',
        lastName: personal.lastName || '',
        age,
        dateOfBirth: personal.dateOfBirth ?? new Date(),
        gender: this.accountForm.getRawValue().gender as Gender,
        religion: personal.religion || '',
        caste: personal.caste ?? undefined,
        motherTongue: personal.motherTongue || '',
        location: { city: personal.city || '', state: personal.state || '', country: personal.country || '', willingToRelocate: false },
        education: { level: professional.educationLevel || '', field: professional.educationField || '', institution: professional.institution ?? undefined },
        occupation: { title: professional.occupation || '', company: professional.company ?? undefined, annualIncome: professional.annualIncome ?? undefined, workingStatus: 'Employed' },
        height: personal.height || '',
        aboutMe: prefs.aboutMe ?? '',
        photos: [],
        familyDetails: { familyType: 'nuclear' },
        preferences: {
          ageRange: { min: prefs.ageMin ?? 21, max: prefs.ageMax ?? 35 },
          religions: prefs.preferredReligions?.length ? prefs.preferredReligions : undefined,
          locations: prefs.preferredLocations?.length ? prefs.preferredLocations : undefined,
          education: prefs.preferredEducation?.length ? prefs.preferredEducation : undefined,
        },
        photoPrivacy: 'everyone',
        status: 'active',
        profileCompleteness: 75,
      });
      this.router.navigate(['/profile']);
    } catch (err: any) {
      this.profileError.set(err?.error?.message ?? 'Failed to save profile. Please try again.');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
