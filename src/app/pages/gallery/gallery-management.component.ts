import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  HostListener,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatDialog, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialModule } from '../../shared/modules/material.module';
import { GalleryService } from '../../services/gallery.service';
import { ProfileService } from '../../services';
import {
  GalleryImage,
  UploadItem,
  UploadStatus,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
} from '../../models/gallery.model';
import { firstValueFrom } from 'rxjs';

// ═══════════════════════════════════════════════════════════════════════════
//  Inline dialog — Delete Confirmation
// ═══════════════════════════════════════════════════════════════════════════

import { Component as AngularComponent, Inject } from '@angular/core';
import { ImageViewerDialogComponent } from '../../features/match-fixed/image-viewer-dialog/image-viewer-dialog.component';

export interface DeleteDialogData {
  image: GalleryImage;
}

@AngularComponent({
  selector: 'app-delete-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  template: `
    <div class="delete-dialog">
      <div class="delete-icon">
        <mat-icon>delete_forever</mat-icon>
      </div>
      <h2 mat-dialog-title>Delete Photo?</h2>
      <mat-dialog-content>
        <p>This photo will be permanently removed from your profile gallery.</p>
        @if (data.image.isPrimary) {
          <p class="primary-warning">
            <mat-icon>warning</mat-icon>
            This is your primary photo. Deleting it will remove it from your profile display.
          </p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button [mat-dialog-close]="false" class="cancel-btn">Cancel</button>
        <button mat-raised-button color="warn" [mat-dialog-close]="true" class="delete-btn">
          <mat-icon>delete</mat-icon> Delete
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .delete-dialog { padding: 8px 8px 0; text-align: center; }
    .delete-icon { margin-bottom: 8px; }
    .delete-icon mat-icon { font-size: 56px; height: 56px; width: 56px; color: #f44336; }
    h2[mat-dialog-title] { font-size: 1.25rem; font-weight: 700; margin-bottom: 4px; }
    mat-dialog-content { color: #555; }
    .primary-warning {
      display: flex; align-items: center; gap: 6px;
      background: #fff3e0; border-radius: 8px; padding: 10px 12px;
      color: #e65100; font-size: 0.85rem; margin-top: 8px;
    }
    .primary-warning mat-icon { font-size: 18px; height: 18px; width: 18px; }
    mat-dialog-actions { padding-bottom: 16px; gap: 8px; }
    .cancel-btn { color: #666; }
    .delete-btn { background: #f44336; color: #fff; }
  `],
})
export class DeleteConfirmDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public readonly data: DeleteDialogData) {}
}

// ═══════════════════════════════════════════════════════════════════════════
//  Inline dialog — Photo Lightbox
// ═══════════════════════════════════════════════════════════════════════════

export interface LightboxDialogData {
  images: GalleryImage[];
  currentIndex: number;
}

@AngularComponent({
  selector: 'app-gallery-lightbox-dialog',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  template: `
    <div class="lightbox-container" (click)="$event.stopPropagation()">
      <!-- Close -->
      <button mat-icon-button class="lb-close" [mat-dialog-close]="true" aria-label="Close">
        <mat-icon>close</mat-icon>
      </button>

      <!-- Nav: Prev -->
      <button mat-icon-button class="lb-nav lb-prev" (click)="prev()" [disabled]="idx() === 0" aria-label="Previous">
        <mat-icon>chevron_left</mat-icon>
      </button>

      <!-- Main image -->
      <div class="lb-main">
        <img [src]="current().imageUrl" [alt]="'Photo ' + (idx() + 1)" class="lb-image" />
        @if (current().isVerified) {
          <div class="lb-verified" aria-label="Verified photo">
            <mat-icon>verified</mat-icon> Verified
          </div>
        }
        @if (current().isPrimary) {
          <div class="lb-primary-badge">
            <mat-icon>star</mat-icon> Primary
          </div>
        }
        <div class="lb-counter">{{ idx() + 1 }} / {{ data.images.length }}</div>
      </div>

      <!-- Nav: Next -->
      <button mat-icon-button class="lb-nav lb-next"
              (click)="next()"
              [disabled]="idx() === data.images.length - 1"
              aria-label="Next">
        <mat-icon>chevron_right</mat-icon>
      </button>

      <!-- Thumbnail strip -->
      @if (data.images.length > 1) {
        <div class="lb-thumbs">
          @for (img of data.images; track img.id; let i = $index) {
            <div class="lb-thumb" [class.active]="idx() === i" (click)="goto(i)" role="button" [attr.aria-label]="'Go to photo ' + (i + 1)">
              <img [src]="img.imageUrl" [alt]="'Thumb ' + (i + 1)" loading="lazy" />
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .lightbox-container {
      position: relative; display: flex; flex-direction: column;
      align-items: center; background: #0a0a0a; border-radius: 12px;
      overflow: hidden; max-width: 90vw; max-height: 94vh;
    }
    .lb-close {
      position: absolute; top: 10px; right: 10px; z-index: 10;
      background: rgba(255,255,255,.12); color: #fff;
    }
    .lb-nav {
      position: absolute; top: 50%; transform: translateY(-50%); z-index: 10;
      background: rgba(255,255,255,.14); color: #fff; width: 44px; height: 44px;
    }
    .lb-nav:hover:not([disabled]) { background: rgba(255,255,255,.28); }
    .lb-nav[disabled] { opacity: .3; }
    .lb-prev { left: 12px; }
    .lb-next { right: 12px; }
    .lb-main {
      position: relative; display: flex; justify-content: center; align-items: center;
      width: 100%; flex: 1; min-height: 0; padding: 16px 70px;
    }
    .lb-image {
      max-width: 100%; max-height: calc(94vh - 120px);
      object-fit: contain; border-radius: 8px;
    }
    .lb-verified {
      position: absolute; top: 24px; left: 80px;
      background: rgba(76,175,80,.85); color: #fff;
      padding: 4px 10px; border-radius: 20px; font-size: .78rem;
      display: flex; align-items: center; gap: 4px;
    }
    .lb-verified mat-icon { font-size: 14px; height: 14px; width: 14px; }
    .lb-primary-badge {
      position: absolute; top: 24px; right: 80px;
      background: rgba(255,193,7,.9); color: #000;
      padding: 4px 10px; border-radius: 20px; font-size: .78rem;
      display: flex; align-items: center; gap: 4px;
    }
    .lb-primary-badge mat-icon { font-size: 14px; height: 14px; width: 14px; }
    .lb-counter {
      position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%);
      background: rgba(0,0,0,.5); color: #fff; padding: 3px 12px;
      border-radius: 12px; font-size: .82rem;
    }
    .lb-thumbs {
      display: flex; gap: 6px; padding: 10px 12px;
      overflow-x: auto; width: 100%; justify-content: center;
      background: rgba(255,255,255,.04);
    }
    .lb-thumbs::-webkit-scrollbar { height: 4px; }
    .lb-thumbs::-webkit-scrollbar-track { background: transparent; }
    .lb-thumbs::-webkit-scrollbar-thumb { background: rgba(255,255,255,.2); border-radius: 4px; }
    .lb-thumb {
      width: 60px; height: 60px; flex-shrink: 0; border-radius: 6px;
      overflow: hidden; cursor: pointer; border: 2px solid transparent;
      opacity: .6; transition: all .2s ease;
    }
    .lb-thumb.active { border-color: #d4a559; opacity: 1; }
    .lb-thumb:hover { opacity: .9; }
    .lb-thumb img { width: 100%; height: 100%; object-fit: cover; }
  `],
})
export class GalleryLightboxDialogComponent {
  idx     = signal(0);
  current = computed(() => this.data.images[this.idx()]);

  constructor(
    @Inject(MAT_DIALOG_DATA) public readonly data: LightboxDialogData,
    private readonly dialogRef: MatDialogRef<GalleryLightboxDialogComponent>,
  ) {
    this.idx.set(data.currentIndex);
  }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    if (e.key === 'ArrowLeft')  this.prev();
    if (e.key === 'ArrowRight') this.next();
    if (e.key === 'Escape')     this.dialogRef.close();
  }

  prev(): void { if (this.idx() > 0) this.idx.update(n => n - 1); }
  next(): void { if (this.idx() < this.data.images.length - 1) this.idx.update(n => n + 1); }
  goto(i: number): void { this.idx.set(i); }
}

// ═══════════════════════════════════════════════════════════════════════════
//  Main Gallery Management Component
// ═══════════════════════════════════════════════════════════════════════════

@Component({
  selector: 'app-gallery-management',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './gallery-management.component.html',
  styleUrl:    './gallery-management.component.scss',
})
export class GalleryManagementComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') private fileInputRef!: ElementRef<HTMLInputElement>;

  private readonly route       = inject(ActivatedRoute);
  private readonly gallerySvc  = inject(GalleryService);
  private readonly profileSvc  = inject(ProfileService);
  private readonly dialog      = inject(MatDialog);
  private readonly snackBar    = inject(MatSnackBar);

  // ── State ────────────────────────────────────────────────────────────────
  protected readonly isLoading      = signal(true);
  protected readonly isSaving       = signal(false);
  protected readonly error          = signal<string | null>(null);
  protected readonly gallery        = signal<GalleryImage[]>([]);
  protected readonly pendingItems   = signal<UploadItem[]>([]);
  protected readonly isDragOver     = signal(false);
  protected readonly profileId      = signal<string | null>(null);

  private dragCounter = 0;   // prevents flicker on child hover

  // ── Derived ──────────────────────────────────────────────────────────────
  protected readonly totalPhotos    = computed(() => this.gallery().length);
  protected readonly pendingCount   = computed(() => this.pendingItems().length);
  protected readonly hasUploads     = computed(() => this.pendingItems().length > 0);
  protected readonly canUpload      = computed(() => {
    const remaining = 20 - this.gallery().length;
    return remaining > 0;
  });
  protected readonly remainingSlots = computed(() =>
    Math.max(0, 20 - this.gallery().length),
  );

  protected readonly uploadingItems = computed(() =>
    this.pendingItems().filter(i => i.status === 'uploading'),
  );
  protected readonly failedItems    = computed(() =>
    this.pendingItems().filter(i => i.status === 'error'),
  );
  protected readonly successItems   = computed(() =>
    this.pendingItems().filter(i => i.status === 'success'),
  );

  protected readonly overallProgress = computed(() => {
    const items = this.pendingItems();
    if (!items.length) return 0;
    return Math.round(items.reduce((acc, i) => acc + i.progress, 0) / items.length);
  });

  protected readonly allowedTypes = ALLOWED_MIME_TYPES;
  protected readonly maxSizeMb    = MAX_FILE_SIZE_BYTES / (1024 * 1024);

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    const routeId = this.route.snapshot.paramMap.get('profileId');
    const myId    = this.profileSvc.myProfile()?.userId;
    const id      = routeId ?? myId ?? null;
    this.profileId.set(id);
    if (id) void this.loadGallery(id);
    else {
      this.error.set('No profile ID found. Please navigate from your profile.');
      this.isLoading.set(false);
    }
  }

  ngOnDestroy(): void {
    // Revoke all object URLs to free memory
    this.pendingItems().forEach(item => URL.revokeObjectURL(item.previewUrl));
  }

  // ── Data Loading ─────────────────────────────────────────────────────────
  protected async loadGallery(profileId: string): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const res = await firstValueFrom(this.gallerySvc.getProfileGallery(profileId));
      this.gallery.set(res?.data ?? []);
    } catch {
      // Fall back to mock data while API is unavailable
      const mock = this.gallerySvc.generateMockGallery(profileId);
      this.gallery.set(mock.data);
    } finally {
      this.isLoading.set(false);
    }
  }

  // ── Drag & Drop ─────────────────────────────────────────────────────────
  protected onDragEnter(e: DragEvent): void {
    e.preventDefault();
    this.dragCounter++;
    this.isDragOver.set(true);
  }

  protected onDragOver(e: DragEvent): void {
    e.preventDefault();   // required to allow drop
  }

  protected onDragLeave(e: DragEvent): void {
    e.preventDefault();
    this.dragCounter--;
    if (this.dragCounter <= 0) {
      this.dragCounter = 0;
      this.isDragOver.set(false);
    }
  }

  protected onDrop(e: DragEvent): void {
    e.preventDefault();
    this.dragCounter = 0;
    this.isDragOver.set(false);
    const files = Array.from(e.dataTransfer?.files ?? []);
    if (files.length) this.stageFiles(files);
  }

  // ── File Selection ────────────────────────────────────────────────────────
  protected openFilePicker(): void {
    this.fileInputRef?.nativeElement.click();
  }

  protected onFilesSelected(e: Event): void {
    const input = e.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (files.length) this.stageFiles(files);
    // Reset so the same file can be selected again
    input.value = '';
  }

  private stageFiles(files: File[]): void {
    const invalid: string[] = [];
    const staged:  UploadItem[] = [];
    const remaining = this.remainingSlots();

    const toStage = files.slice(0, remaining);
    const skipped = files.length - toStage.length;

    for (const file of toStage) {
      // MIME check
      if (!ALLOWED_MIME_TYPES.includes(file.type as any)) {
        invalid.push(`${file.name} — unsupported format`);
        continue;
      }
      // Size check
      if (file.size > MAX_FILE_SIZE_BYTES) {
        invalid.push(`${file.name} — exceeds 2 MB limit`);
        continue;
      }

      staged.push({
        id:         crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        status:     'pending',
        progress:   0,
      });
    }

    if (invalid.length) {
      this.snackBar.open(
        `⚠️ Skipped ${invalid.length} file(s): ${invalid.join(', ')}`,
        'OK',
        { duration: 6000, panelClass: 'snack-warn' },
      );
    }

    if (skipped > 0) {
      this.snackBar.open(
        `Gallery limit reached — ${skipped} file(s) skipped.`,
        'Dismiss',
        { duration: 4000, panelClass: 'snack-warn' },
      );
    }

    if (staged.length) {
      this.pendingItems.update(cur => [...cur, ...staged]);
    }
  }

  // ── Upload ────────────────────────────────────────────────────────────────
  protected async uploadAll(): Promise<void> {
    const profileId = this.profileId();
    if (!profileId) return;

    const toUpload = this.pendingItems().filter(i => i.status === 'pending' || i.status === 'error');
    if (!toUpload.length) return;

    this.isSaving.set(true);

    const uploads = toUpload.map(item => this.uploadOne(item, profileId));
    await Promise.all(uploads);

    // Move all successful items into the gallery
    const succeeded = this.pendingItems().filter(i => i.status === 'success');
    if (succeeded.length) {
      const newImages = succeeded
        .map(i => i.uploadedImage)
        .filter((img): img is GalleryImage => !!img);
      this.gallery.update(cur => [...cur, ...newImages]);
      this.pendingItems.update(cur => cur.filter(i => i.status !== 'success'));
      // Revoke URLs of successful uploads
      succeeded.forEach(i => URL.revokeObjectURL(i.previewUrl));

      this.snackBar.open(
        `✅ ${succeeded.length} photo(s) uploaded successfully!`,
        'Dismiss',
        { duration: 4000, panelClass: 'snack-success' },
      );
    }

    const failed = this.pendingItems().filter(i => i.status === 'error');
    if (failed.length) {
      this.snackBar.open(
        `❌ ${failed.length} upload(s) failed. Tap retry to try again.`,
        'OK',
        { duration: 5000, panelClass: 'snack-error' },
      );
    }

    this.isSaving.set(false);
  }

  private uploadOne(item: UploadItem, profileId: string): Promise<void> {
    return new Promise(resolve => {
      this.updatePendingItem(item.id, { status: 'uploading', progress: 0, errorMessage: undefined });

      this.gallerySvc.uploadImage(profileId, item.file, item.id).subscribe({
        next: prog => {
          this.updatePendingItem(prog.itemId, {
            progress:      prog.progress,
            status:        prog.status,
            uploadedImage: prog.uploadedImage,
            errorMessage:  prog.errorMessage,
          });
        },
        complete: () => resolve(),
        error:    () => resolve(),
      });
    });
  }

  protected retryItem(item: UploadItem): void {
    const profileId = this.profileId();
    if (!profileId) return;
    this.isSaving.set(true);
    this.uploadOne(item, profileId).then(() => {
      const updated = this.pendingItems().find(i => i.id === item.id);
      if (updated?.status === 'success' && updated.uploadedImage) {
        this.gallery.update(cur => [...cur, updated.uploadedImage!]);
        this.pendingItems.update(cur => cur.filter(i => i.id !== item.id));
        URL.revokeObjectURL(item.previewUrl);
        this.snackBar.open('✅ Photo uploaded!', 'Dismiss', { duration: 3000, panelClass: 'snack-success' });
      }
      this.isSaving.set(false);
    });
  }

  private updatePendingItem(id: string, patch: Partial<UploadItem>): void {
    this.pendingItems.update(list =>
      list.map(i => (i.id === id ? { ...i, ...patch } : i)),
    );
  }

  // ── Remove Pending ────────────────────────────────────────────────────────
  protected removePending(item: UploadItem): void {
    URL.revokeObjectURL(item.previewUrl);
    this.pendingItems.update(cur => cur.filter(i => i.id !== item.id));
  }

  protected clearCompleted(): void {
    const done = this.pendingItems().filter(i => i.status === 'success' || i.status === 'error');
    done.forEach(i => URL.revokeObjectURL(i.previewUrl));
    this.pendingItems.update(cur => cur.filter(i => i.status === 'pending' || i.status === 'uploading'));
  }

  photos(): string[] {
    return this.gallery().map(g => g.imageUrl).filter(Boolean) as string[];
  }

  // ── Gallery Actions ───────────────────────────────────────────────────────
  protected openLightbox(images: GalleryImage[], index: number): void {
    // this.dialog.open(GalleryLightboxDialogComponent, {
    //   data:          { images, currentIndex: index } satisfies LightboxDialogData,
    //   maxWidth:      '95vw',
    //   maxHeight:     '96vh',
    //   panelClass:    'lightbox-dialog-panel',
    //   autoFocus:     false,
    //   backdropClass: 'lightbox-backdrop',
    // });

    this.dialog.open(ImageViewerDialogComponent, {
      data: { urls: this.photos(), index },
      panelClass: 'image-viewer-panel',
      maxWidth: '100vw',
      maxHeight: '100vh',
    });
    
  }

  protected async confirmDelete(image: GalleryImage): Promise<void> {
    const ref = this.dialog.open(DeleteConfirmDialogComponent, {
      data:       { image } satisfies DeleteDialogData,
      width:      '400px',
      panelClass: 'confirm-dialog-panel',
      autoFocus:  false,
    });

    const confirmed = await firstValueFrom(ref.afterClosed());
    if (!confirmed) return;

    // Optimistic remove
    const snapshot = this.gallery();
    this.gallery.update(cur => cur.filter(g => g.id !== image.id));

    try {
      await firstValueFrom(this.gallerySvc.deleteGalleryImage(image.id));
      this.snackBar.open('🗑️ Photo deleted.', 'Dismiss', { duration: 3000 });
    } catch {
      // Restore on failure
      this.gallery.set(snapshot);
      this.snackBar.open('Failed to delete photo. Please try again.', 'OK', {
        duration: 4000, panelClass: 'snack-error',
      });
    }
  }

  protected async setPrimary(image: GalleryImage): Promise<void> {
    const profileId = this.profileId();
    if (!profileId || image.isPrimary) return;

    const snapshot = this.gallery();
    // Optimistic update
    this.gallery.update(cur =>
      cur.map(g => ({ ...g, isPrimary: g.id === image.id })),
    );

    try {
      await firstValueFrom(this.gallerySvc.setPrimaryImage(image.id, profileId));
      this.snackBar.open('⭐ Primary photo updated!', 'Dismiss', {
        duration: 3000, panelClass: 'snack-success',
      });
    } catch {
      this.gallery.set(snapshot);
      this.snackBar.open('Failed to update primary photo.', 'OK', {
        duration: 4000, panelClass: 'snack-error',
      });
    }
  }

  // ── Utilities ─────────────────────────────────────────────────────────────
  protected fileSizeLabel(bytes: number): string {
    if (bytes < 1024)       return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  protected statusIcon(status: UploadStatus): string {
    const map: Record<UploadStatus, string> = {
      pending:   'schedule',
      uploading: 'cloud_upload',
      success:   'check_circle',
      error:     'error',
    };
    return map[status];
  }

  protected trackById(_: number, item: { id: string }): string {
    return item.id;
  }
}
