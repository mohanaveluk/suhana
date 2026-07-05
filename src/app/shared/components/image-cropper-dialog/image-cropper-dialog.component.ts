import {
  Component, ChangeDetectionStrategy, inject, signal, computed,
  ViewChild, AfterViewInit, ElementRef, OnDestroy,
} from '@angular/core';
import {
  MatDialogRef, MAT_DIALOG_DATA, MatDialogModule,
} from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import {
  ImageCropperComponent, ImageCroppedEvent, ImageTransform, LoadedImage,
} from 'ngx-image-cropper';
import { TitleCasePipe } from '@angular/common';
import { MaterialModule } from '../../modules/material.module';

// ── Public types ─────────────────────────────────────────────────────────────
export interface ImageCropperDialogData {
  imageFile: File;
}

export interface ImageCropperDialogResult {
  blob: Blob;
  base64: string;
  sizeKB: number;
  width: number;
  height: number;
}

type CropShape  = 'circle' | 'square';
type OutputSize = 100 | 300 | 600 | 0;

// ─────────────────────────────────────────────────────────────────────────────
@Component({
  selector: 'app-image-cropper-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [MatDialogModule, MaterialModule, FormsModule, ImageCropperComponent, TitleCasePipe],
  templateUrl: './image-cropper-dialog.component.html',
  styleUrl: './image-cropper-dialog.component.scss',
})
export class ImageCropperDialogComponent implements AfterViewInit, OnDestroy {
  private readonly dialogRef = inject(MatDialogRef<ImageCropperDialogComponent>);
  protected readonly data    = inject<ImageCropperDialogData>(MAT_DIALOG_DATA);

  @ViewChild('cropperWrap') private cropperWrapRef!: ElementRef<HTMLDivElement>;

  // ── Crop output ──────────────────────────────────────────────────────────
  protected readonly croppedBase64 = signal<string | null>(null);
  protected readonly croppedBlob   = signal<Blob | null>(null);
  protected readonly croppedSizeKB = signal(0);
  protected readonly croppedWidth  = signal(0);
  protected readonly croppedHeight = signal(0);
  protected readonly isImageLoaded = signal(false);
  protected readonly isLoadFailed  = signal(false);

  // ── Crop settings ────────────────────────────────────────────────────────
  protected readonly cropShape  = signal<CropShape>('circle');
  protected readonly outputSize = signal<OutputSize>(300);

  // ── Transform ────────────────────────────────────────────────────────────
  protected readonly zoomScale = signal(1);
  protected readonly rotation  = signal(0);
  protected readonly flipH     = signal(false);
  protected readonly flipV     = signal(false);

  protected readonly transform = computed<ImageTransform>(() => ({
    scale:  this.zoomScale(),
    rotate: this.rotation(),
    flipH:  this.flipH(),
    flipV:  this.flipV(),
  }));

  protected readonly isCircle      = computed(() => this.cropShape() === 'circle');
  protected readonly resizeToWidth = computed(() => this.outputSize() || 0);
  protected readonly zoomPercent   = computed(() => `${(this.zoomScale() * 100).toFixed(0)}%`);
  protected readonly canSave       = computed(() => !!this.croppedBase64() || !!this.croppedBlob());

  // Getter/setter bridge for mat-slider ngModel binding
  get zoomScaleValue(): number { return this.zoomScale(); }
  set zoomScaleValue(v: number) { this.zoomScale.set(v); }

  protected readonly sizeOptions: { value: OutputSize; label: string; desc: string }[] = [
    { value: 100, label: 'Small',    desc: '100 × 100 px' },
    { value: 300, label: 'Medium',   desc: '300 × 300 px' },
    { value: 600, label: 'Large',    desc: '600 × 600 px' },
    { value: 0,   label: 'Original', desc: 'Full res'      },
  ];

  protected readonly platformPreviews = [
    { key: 'search',  label: 'Search Results', size: 48  },
    { key: 'match',   label: 'Match Card',      size: 60  },
    { key: 'profile', label: 'Profile Page',    size: 80  },
    { key: 'mobile',  label: 'Mobile App',      size: 40  },
  ];

  // ── Wheel zoom (non-passive) ──────────────────────────────────────────────
  private readonly wheelHandler = (e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    this.zoomScale.update(v => Math.max(0.1, Math.min(10, v + delta)));
  };

  ngAfterViewInit(): void {
    this.cropperWrapRef?.nativeElement.addEventListener('wheel', this.wheelHandler, { passive: false });
  }

  ngOnDestroy(): void {
    this.cropperWrapRef?.nativeElement.removeEventListener('wheel', this.wheelHandler);
  }

  // ── Cropper events ────────────────────────────────────────────────────────
  protected onImageReady(_loaded: LoadedImage): void {
    this.isImageLoaded.set(true);
  }

  protected onImageCropped(event: ImageCroppedEvent): void {
    this.croppedBase64.set(event.base64 ?? null);
    this.croppedBlob.set(event.blob ?? null);
    this.croppedWidth.set(event.width);
    this.croppedHeight.set(event.height);
    if (event.blob) {
      this.croppedSizeKB.set(Math.round(event.blob.size / 1024));
    } else if (event.base64) {
      this.croppedSizeKB.set(Math.round(event.base64.length * 0.75 / 1024));
    }
  }

  protected onLoadFailed(): void {
    this.isLoadFailed.set(true);
  }

  // ── Transform controls ────────────────────────────────────────────────────
  protected zoomIn():         void { this.zoomScale.update(v => Math.min(v + 0.1, 10)); }
  protected zoomOut():        void { this.zoomScale.update(v => Math.max(v - 0.1, 0.1)); }
  protected rotateLeft():     void { this.rotation.update(v => v - 90); }
  protected rotateRight():    void { this.rotation.update(v => v + 90); }
  protected flipHorizontal(): void { this.flipH.update(v => !v); }
  protected flipVertical():   void { this.flipV.update(v => !v); }

  protected resetAll(): void {
    this.zoomScale.set(1);
    this.rotation.set(0);
    this.flipH.set(false);
    this.flipV.set(false);
  }

  // ── Dialog actions ────────────────────────────────────────────────────────
  protected savePhoto(): void {
    const base64 = this.croppedBase64();
    if (!base64) return;

    let blob = this.croppedBlob();
    if (!blob) blob = this.base64ToBlob(base64);

    this.dialogRef.close({
      blob,
      base64,
      sizeKB: this.croppedSizeKB(),
      width:  this.croppedWidth(),
      height: this.croppedHeight(),
    } satisfies ImageCropperDialogResult);
  }

  protected cancel(): void {
    this.dialogRef.close(null);
  }

  protected formatSize(kb: number): string {
    return kb < 1000 ? `${kb} KB` : `${(kb / 1024).toFixed(1)} MB`;
  }

  private base64ToBlob(base64: string, type = 'image/jpeg'): Blob {
    const [header, data] = base64.split(',');
    const mime = header.match(/:(.*?);/)?.[1] ?? type;
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }
}
