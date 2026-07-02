import {
  Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, OnDestroy,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { toSignal } from '@angular/core/rxjs-interop';
import { MaterialModule } from '../../../shared/modules/material.module';
import { MatchFixedService } from '../match-fixed.service';
import {
  MatchFixedResponse, MatchSourceType, MATCH_SOURCE_LABELS, UpdateMatchFixedDto,
} from '../models/match-fixed.model';

@Component({
  selector: 'app-match-fixed-edit',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, MaterialModule],
  templateUrl: './match-fixed-edit.component.html',
  styleUrl:    './match-fixed-edit.component.scss',
})
export class MatchFixedEditComponent implements OnInit, OnDestroy {
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb     = inject(FormBuilder);
  private readonly svc    = inject(MatchFixedService);
  private readonly snack  = inject(MatSnackBar);

  protected readonly record       = signal<MatchFixedResponse | null>(null);
  protected readonly isLoading    = signal(true);
  protected readonly isSubmitting = signal(false);
  protected readonly submitError  = signal<string | null>(null);
  protected readonly sourceLabels = MATCH_SOURCE_LABELS;
  protected readonly MatchSourceType = MatchSourceType;

  // ── Photo signals ──────────────────────────────────────────────────────────
  protected readonly partnerPhotoFile       = signal<File | null>(null);
  protected readonly partnerPhotoPreview    = signal<string | null>(null);
  protected readonly engagementPhotoFile    = signal<File | null>(null);
  protected readonly engagementPhotoPreview = signal<string | null>(null);
  protected readonly weddingPhotoFile       = signal<File | null>(null);
  protected readonly weddingPhotoPreview    = signal<string | null>(null);

  private readonly _objectUrls: string[] = [];

  // ── Forms ──────────────────────────────────────────────────────────────────
  protected readonly partnerForm = this.fb.group({
    matchedUserId:     [''],
    matchedUserGuid:   [''],
    partnerName:       [''],
    partnerAge:        [null as number | null, [Validators.min(18), Validators.max(100)]],
    partnerProfession: [''],
    partnerLocation:   [''],
  });

  protected readonly datesForm = this.fb.group({
    engagementDate: [''],
    marriageDate:   [''],
  });

  protected readonly storyForm = this.fb.group({
    successStory: ['', Validators.maxLength(2000)],
  });

  protected readonly permissionsForm = this.fb.group({
    allowStoryPublish: [false],
    allowPhotoPublish: [false],
  });

  private readonly storyValues = toSignal(
    this.storyForm.valueChanges,
    { initialValue: this.storyForm.getRawValue() },
  );
  protected readonly storyLength = computed(() =>
    (this.storyValues().successStory ?? '').length
  );

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.router.navigate(['/match-fixed/me']); return; }

    const r = await this.svc.getMatchFixedById(id);
    if (!r) {
      this.snack.open('Record not found.', 'OK', { duration: 3000 });
      this.router.navigate(['/match-fixed/me']);
      return;
    }

    this.record.set(r);
    this.partnerForm.patchValue({
      matchedUserId:     r.matchedUserId     ?? '',
      matchedUserGuid:   r.matchedUserGuid   ?? '',
      partnerName:       r.partnerName       ?? '',
      partnerAge:        r.partnerAge        ?? null,
      partnerProfession: r.partnerProfession ?? '',
      partnerLocation:   r.partnerLocation   ?? '',
    });
    this.datesForm.patchValue({
      engagementDate: r.engagementDate ? this.toDateInput(r.engagementDate) : '',
      marriageDate:   r.marriageDate   ? this.toDateInput(r.marriageDate)   : '',
    });
    this.storyForm.patchValue({ successStory: r.successStory ?? '' });
    this.permissionsForm.patchValue({
      allowStoryPublish: r.allowStoryPublish,
      allowPhotoPublish: r.allowPhotoPublish,
    });
    this.isLoading.set(false);
  }

  private toDateInput(d: Date | string): string {
    return new Date(d).toISOString().split('T')[0];
  }

  protected isSuhana(): boolean {
    return this.record()?.matchSourceType === MatchSourceType.SUHANA;
  }

  protected existingPhoto(type: 'partner' | 'engagement' | 'wedding'): string | null {
    const r = this.record();
    if (!r) return null;
    if (type === 'partner')    return r.partnerPhotoUrl    ?? null;
    if (type === 'engagement') return r.engagementPhotoUrl ?? null;
    return r.weddingPhotoUrl ?? null;
  }

  // ── Photo handlers ─────────────────────────────────────────────────────────
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

  removeNewPhoto(type: 'partner' | 'engagement' | 'wedding'): void {
    if (type === 'partner')    { this.partnerPhotoFile.set(null);    this.partnerPhotoPreview.set(null); }
    if (type === 'engagement') { this.engagementPhotoFile.set(null); this.engagementPhotoPreview.set(null); }
    if (type === 'wedding')    { this.weddingPhotoFile.set(null);    this.weddingPhotoPreview.set(null); }
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  async onSave(): Promise<void> {
    if (this.isSubmitting() || !this.record()) return;
    this.isSubmitting.set(true);
    this.submitError.set(null);

    try {
      const [partnerPhotoUrl, engagementPhotoUrl, weddingPhotoUrl] = await Promise.all([
        this.partnerPhotoFile()    ? this.svc.uploadPhoto(this.partnerPhotoFile()!)    : Promise.resolve(null),
        this.engagementPhotoFile() ? this.svc.uploadPhoto(this.engagementPhotoFile()!) : Promise.resolve(null),
        this.weddingPhotoFile()    ? this.svc.uploadPhoto(this.weddingPhotoFile()!)    : Promise.resolve(null),
      ]);

      const pf = this.partnerForm.getRawValue();
      const df = this.datesForm.getRawValue();
      const st = this.storyForm.getRawValue();
      const pm = this.permissionsForm.getRawValue();

      const dto: UpdateMatchFixedDto = {
        successStory:      st.successStory    || undefined,
        allowStoryPublish: pm.allowStoryPublish ?? false,
        allowPhotoPublish: pm.allowPhotoPublish ?? false,
        ...(df.engagementDate ? { engagementDate: df.engagementDate } : {}),
        ...(df.marriageDate   ? { marriageDate:   df.marriageDate }   : {}),
        ...(partnerPhotoUrl    ? { partnerPhotoUrl }    : {}),
        ...(engagementPhotoUrl ? { engagementPhotoUrl } : {}),
        ...(weddingPhotoUrl    ? { weddingPhotoUrl }    : {}),
        ...(this.isSuhana()
          ? {
              matchedUserId:   pf.matchedUserId   || undefined,
              matchedUserGuid: pf.matchedUserGuid || undefined,
            }
          : {
              partnerName:       pf.partnerName       || undefined,
              partnerAge:        pf.partnerAge         ?? undefined,
              partnerProfession: pf.partnerProfession || undefined,
              partnerLocation:   pf.partnerLocation   || undefined,
            }
        ),
      };

      await this.svc.updateMatchFixed(this.record()!.id, dto);
      this.snack.open('Details updated successfully!', 'OK', { duration: 4000 });
      this.router.navigate(['/match-fixed/me']);
    } catch (err: any) {
      this.submitError.set(err?.error?.message ?? 'Update failed. Please try again.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  ngOnDestroy(): void {
    this._objectUrls.forEach(u => URL.revokeObjectURL(u));
  }
}
