import {
  Component, ChangeDetectionStrategy, inject, signal, computed, ViewChild, OnDestroy,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatStepper } from '@angular/material/stepper';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialModule } from '../../../shared/modules/material.module';
import { MatchFixedService } from '../match-fixed.service';
import { MatchSourceType, MATCH_SOURCE_LABELS, CreateMatchFixedDto } from '../models/match-fixed.model';

function suhanaPartnerValidator(ctrl: AbstractControl): ValidationErrors | null {
  const id   = ctrl.get('matchedUserId')?.value?.trim();
  const guid = ctrl.get('matchedUserGuid')?.value?.trim();
  return id || guid ? null : { suhanaPartnerRequired: true };
}

@Component({
  selector: 'app-match-fixed-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MaterialModule],
  templateUrl: './match-fixed-form.component.html',
  styleUrl:    './match-fixed-form.component.scss',
})
export class MatchFixedFormComponent implements OnDestroy {
  @ViewChild('stepper') private readonly stepper!: MatStepper;

  private readonly fb      = inject(FormBuilder);
  private readonly svc     = inject(MatchFixedService);
  private readonly router  = inject(Router);
  private readonly snack   = inject(MatSnackBar);

  protected readonly MatchSourceType = MatchSourceType;
  protected readonly sourceLabels    = MATCH_SOURCE_LABELS;
  protected readonly sourceOptions   = Object.values(MatchSourceType);

  private static readonly SOURCE_ICONS: Record<MatchSourceType, string> = {
    [MatchSourceType.SUHANA]:          'favorite',
    [MatchSourceType.FAMILY]:          'family_restroom',
    [MatchSourceType.RELATIVE]:        'people',
    [MatchSourceType.FRIEND]:          'group',
    [MatchSourceType.SOCIAL_MEDIA]:    'share',
    [MatchSourceType.OTHER_MATRIMONY]: 'web',
    [MatchSourceType.WORKPLACE]:       'business_center',
    [MatchSourceType.COMMUNITY]:       'groups',
    [MatchSourceType.OTHER]:           'category',
  };

  protected sourceIcon(src: MatchSourceType): string {
    return MatchFixedFormComponent.SOURCE_ICONS[src] ?? 'help_outline';
  }

  // ── Forms per step ──────────────────────────────────────────────────────
  protected readonly matchSourceForm = this.fb.group({
    matchSourceType: ['', Validators.required],
  });

  protected readonly suhanaPartnerForm = this.fb.group({
    matchedUserId:   [''],
    matchedUserGuid: [''],
  }, { validators: suhanaPartnerValidator });

  protected readonly externalPartnerForm = this.fb.group({
    partnerName:       ['', Validators.required],
    partnerAge:        [null as number | null, [Validators.min(18), Validators.max(100)]],
    partnerProfession: [''],
    partnerLocation:   [''],
  });

  protected readonly storyForm = this.fb.group({
    successStory: ['', Validators.maxLength(2000)],
  });

  protected readonly permissionsForm = this.fb.group({
    allowStoryPublish: [false],
    allowPhotoPublish: [false],
  });

  // ── Photo signals ────────────────────────────────────────────────────────
  protected readonly partnerPhotoFile       = signal<File | null>(null);
  protected readonly partnerPhotoPreview    = signal<string | null>(null);
  protected readonly engagementPhotoFile    = signal<File | null>(null);
  protected readonly engagementPhotoPreview = signal<string | null>(null);
  protected readonly weddingPhotoFile       = signal<File | null>(null);
  protected readonly weddingPhotoPreview    = signal<string | null>(null);

  // ── State ────────────────────────────────────────────────────────────────
  protected readonly isSubmitting = signal(false);
  protected readonly submitError  = signal<string | null>(null);

  // ── Form value signals (computed() only reacts to signals, not form observables) ──
  private readonly matchSourceValues = toSignal(
    this.matchSourceForm.valueChanges,
    { initialValue: this.matchSourceForm.getRawValue() },
  );
  private readonly suhanaPartnerValues = toSignal(
    this.suhanaPartnerForm.valueChanges,
    { initialValue: this.suhanaPartnerForm.getRawValue() },
  );
  private readonly externalPartnerValues = toSignal(
    this.externalPartnerForm.valueChanges,
    { initialValue: this.externalPartnerForm.getRawValue() },
  );
  private readonly storyValues = toSignal(
    this.storyForm.valueChanges,
    { initialValue: this.storyForm.getRawValue() },
  );
  private readonly permissionsValues = toSignal(
    this.permissionsForm.valueChanges,
    { initialValue: this.permissionsForm.getRawValue() },
  );

  // ── Computed ──────────────────────────────────────────────────────────────
  protected readonly isSuhana = computed(() =>
    this.matchSourceValues().matchSourceType === MatchSourceType.SUHANA
  );

  protected readonly partnerStep3Form = computed(() =>
    this.isSuhana() ? this.suhanaPartnerForm : this.externalPartnerForm
  );

  protected readonly storyLength = computed(() =>
    (this.storyValues().successStory ?? '').length
  );

  protected readonly reviewData = computed(() => {
    const sp  = this.suhanaPartnerValues();
    const ep  = this.externalPartnerValues();
    const st  = this.storyValues();
    const pm  = this.permissionsValues();
    const src = this.matchSourceValues().matchSourceType as MatchSourceType;
    return {
      source:            src,
      partnerName:       this.isSuhana()
        ? (sp.matchedUserId || sp.matchedUserGuid)
        : ep.partnerName,
      partnerAge:        this.isSuhana() ? null : ep.partnerAge,
      partnerProfession: this.isSuhana() ? null : ep.partnerProfession,
      partnerLocation:   this.isSuhana() ? null : ep.partnerLocation,
      successStory:      st.successStory,
      allowStoryPublish: pm.allowStoryPublish,
      allowPhotoPublish: pm.allowPhotoPublish,
      hasPartnerPhoto:    !!this.partnerPhotoFile(),
      hasEngagementPhoto: !!this.engagementPhotoFile(),
      hasWeddingPhoto:    !!this.weddingPhotoFile(),
    };
  });

  private readonly _objectUrls: string[] = [];

  // ── Photo handlers ────────────────────────────────────────────────────────
  onPhotoSelected(type: 'partner' | 'engagement' | 'wedding', event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.snack.open('Please select a valid image file.', 'OK', { duration: 3000 });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.snack.open('Image must be smaller than 5 MB.', 'OK', { duration: 3000 });
      return;
    }
    const url = URL.createObjectURL(file);
    this._objectUrls.push(url);
    if (type === 'partner')    { this.partnerPhotoFile.set(file);    this.partnerPhotoPreview.set(url); }
    if (type === 'engagement') { this.engagementPhotoFile.set(file); this.engagementPhotoPreview.set(url); }
    if (type === 'wedding')    { this.weddingPhotoFile.set(file);    this.weddingPhotoPreview.set(url); }
  }

  removePhoto(type: 'partner' | 'engagement' | 'wedding'): void {
    if (type === 'partner')    { this.partnerPhotoFile.set(null);    this.partnerPhotoPreview.set(null); }
    if (type === 'engagement') { this.engagementPhotoFile.set(null); this.engagementPhotoPreview.set(null); }
    if (type === 'wedding')    { this.weddingPhotoFile.set(null);    this.weddingPhotoPreview.set(null); }
  }

  onDropPhoto(type: 'partner' | 'engagement' | 'wedding', event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) this.onPhotoSelected(type, { target: { files: [file] } } as any);
  }

  preventDragover(event: DragEvent): void { event.preventDefault(); }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async onSubmit(): Promise<void> {
    if (this.isSubmitting()) return;
    this.isSubmitting.set(true);
    this.submitError.set(null);

    try {
      // Upload photos
      const [partnerPhotoUrl, engagementPhotoUrl, weddingPhotoUrl] = await Promise.all([
        this.partnerPhotoFile()    ? this.svc.uploadPhoto(this.partnerPhotoFile()!)    : Promise.resolve(''),
        this.engagementPhotoFile() ? this.svc.uploadPhoto(this.engagementPhotoFile()!) : Promise.resolve(''),
        this.weddingPhotoFile()    ? this.svc.uploadPhoto(this.weddingPhotoFile()!)    : Promise.resolve(''),
      ]);

      const src = this.matchSourceForm.getRawValue().matchSourceType as MatchSourceType;
      const ep  = this.externalPartnerForm.getRawValue();
      const sp  = this.suhanaPartnerForm.getRawValue();
      const st  = this.storyForm.getRawValue();
      const pm  = this.permissionsForm.getRawValue();

      const dto: CreateMatchFixedDto = {
        matchSourceType:   src,
        successStory:      st.successStory || undefined,
        allowStoryPublish: pm.allowStoryPublish ?? false,
        allowPhotoPublish: pm.allowPhotoPublish ?? false,
        ...(partnerPhotoUrl    ? { partnerPhotoUrl }    : {}),
        ...(engagementPhotoUrl ? { engagementPhotoUrl } : {}),
        ...(weddingPhotoUrl    ? { weddingPhotoUrl }    : {}),
        ...(src === MatchSourceType.SUHANA
          ? { matchedUserId: sp.matchedUserId || undefined, matchedUserGuid: sp.matchedUserGuid || undefined }
          : {
              partnerName:       ep.partnerName || undefined,
              partnerAge:        ep.partnerAge ?? undefined,
              partnerProfession: ep.partnerProfession || undefined,
              partnerLocation:   ep.partnerLocation || undefined,
            }
        ),
      };

      await this.svc.createMatchFixed(dto);
      this.snack.open('Your match details have been submitted!', 'OK', { duration: 5000 });
      this.router.navigate(['/match-fixed/me']);
    } catch (err: any) {
      this.submitError.set(err?.error?.message ?? 'Submission failed. Please try again.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  ngOnDestroy(): void {
    this._objectUrls.forEach(u => URL.revokeObjectURL(u));
  }
}
