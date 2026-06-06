import {
  Component,
  inject,
  signal,
  computed,
  HostListener,
  ChangeDetectionStrategy,
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from '../../shared/modules/material.module';
import { ProfilePhoto } from '../../models/user.model';
import { GalleryImageData } from '../../models/gallery.model';

export interface PhotoDialogData {
  photos: ProfilePhoto[];
  currentIndex: number;
  profileName: string;
}

@Component({
  selector: 'app-photo-gallery-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialModule],
  template: `
    <div class="photo-dialog" role="dialog" [attr.aria-label]="'Photo gallery for ' + data.profileName">

      <!-- Top bar -->
      <div class="dialog-topbar">
        <span class="counter-label">
          <mat-icon>photo_library</mat-icon>
          {{ currentIndex() + 1 }} of {{ data.Image.length }}
        </span>
        @if (currentPhoto().isVerified) {
          <span class="verified-pill">
            <mat-icon>verified</mat-icon> Verified Photo
          </span>
        }
        <button mat-icon-button class="close-btn" (click)="close()" aria-label="Close gallery">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Stage -->
      <div class="photo-stage">
        <button
          mat-icon-button
          class="nav-btn nav-prev"
          (click)="prev()"
          [disabled]="currentIndex() === 0"
          aria-label="Previous photo">
          <mat-icon>chevron_left</mat-icon>
        </button>

        <div class="photo-frame" matRipple>
          <img
            [src]="currentPhoto().imageUrl"
            [alt]="data.profileName + ' — photo ' + (currentIndex() + 1)"
            class="main-photo"
            (error)="onImageError($event)" />
          @if (currentPhoto().isPrimary) {
            <span class="primary-pill">
              <mat-icon>star</mat-icon> Primary
            </span>
          }
        </div>

        <button
          mat-icon-button
          class="nav-btn nav-next"
          (click)="next()"
          [disabled]="currentIndex() === data.Image.length - 1"
          aria-label="Next photo">
          <mat-icon>chevron_right</mat-icon>
        </button>
      </div>

      <!-- Thumbnail strip -->
      @if (data.Image.length > 1) {
        <div class="thumb-strip" role="listbox" aria-label="Photo thumbnails">
          @for (photo of data.Image; track photo.id; let i = $index) {
            <div
              class="thumb"
              [class.active]="currentIndex() === i"
              (click)="currentIndex.set(i)"
              [attr.aria-selected]="currentIndex() === i"
              role="option"
              matRipple>
              <img
                [src]="photo.imageUrl"
                [alt]="'Thumbnail ' + (i + 1)"
                (error)="onImageError($event)" />
              @if (photo.isVerified) {
                <mat-icon class="thumb-verified">verified</mat-icon>
              }
            </div>
          }
        </div>
      }

      <!-- Keyboard hint -->
      <p class="keyboard-hint">
        <mat-icon>keyboard</mat-icon> Use ← → arrow keys to navigate
      </p>
    </div>
  `,
  styles: [`
    .photo-dialog {
      background: #12040a;
      border-radius: 20px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      gap: 0;
      min-width: min(680px, 92vw);
      max-width: 92vw;
      max-height: 92vh;
    }

    /* ── Top bar ───────────────────────────────── */
    .dialog-topbar {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: rgba(255,255,255,0.05);
      border-bottom: 1px solid rgba(255,255,255,0.08);
      flex-shrink: 0;

      .counter-label {
        display: flex;
        align-items: center;
        gap: 6px;
        color: rgba(255,255,255,0.7);
        font-size: 0.85rem;
        mat-icon { font-size: 16px; width: 16px; height: 16px; }
      }

      .verified-pill {
        display: flex;
        align-items: center;
        gap: 4px;
        background: rgba(76,175,80,0.2);
        border: 1px solid rgba(76,175,80,0.4);
        color: #81c784;
        padding: 3px 10px;
        border-radius: 20px;
        font-size: 0.78rem;
        font-weight: 500;
        mat-icon { font-size: 14px; width: 14px; height: 14px; }
      }

      .close-btn {
        margin-left: auto;
        color: rgba(255,255,255,0.7);
        &:hover { color: white; background: rgba(255,255,255,0.1); }
      }
    }

    /* ── Stage ─────────────────────────────────── */
    .photo-stage {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 16px;
      overflow: hidden;
      min-height: 0;

      .nav-btn {
        flex-shrink: 0;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        color: white;
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.2);
        transition: background 0.2s, transform 0.2s;

        &:hover:not([disabled]) {
          background: rgba(183,110,121,0.4);
          transform: scale(1.05);
        }
        &[disabled] { opacity: 0.25; }
        mat-icon { font-size: 28px; width: 28px; height: 28px; }
      }

      .photo-frame {
        flex: 1;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 14px;
        overflow: hidden;
        background: #0d0508;
        min-height: 300px;
        max-height: 60vh;

        .main-photo {
          max-width: 100%;
          max-height: 60vh;
          object-fit: contain;
          display: block;
          animation: photoFadeIn 0.25s ease;
        }

        .primary-pill {
          position: absolute;
          top: 12px;
          left: 12px;
          background: linear-gradient(135deg, #b76e79 0%, #800020 100%);
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 4px;
          mat-icon { font-size: 14px; width: 14px; height: 14px; }
        }
      }
    }

    /* ── Thumbnails ────────────────────────────── */
    .thumb-strip {
      display: flex;
      gap: 8px;
      padding: 10px 16px;
      overflow-x: auto;
      flex-shrink: 0;
      background: rgba(255,255,255,0.03);
      border-top: 1px solid rgba(255,255,255,0.06);
      scrollbar-width: thin;
      scrollbar-color: #b76e79 transparent;

      .thumb {
        position: relative;
        width: 60px;
        height: 60px;
        border-radius: 10px;
        overflow: hidden;
        cursor: pointer;
        border: 2px solid transparent;
        opacity: 0.55;
        flex-shrink: 0;
        transition: all 0.2s ease;

        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          pointer-events: none;
        }

        .thumb-verified {
          position: absolute;
          bottom: 2px;
          right: 2px;
          font-size: 12px;
          width: 12px;
          height: 12px;
          color: #81c784;
        }

        &.active {
          border-color: #b76e79;
          opacity: 1;
          transform: scale(1.05);
        }
        &:hover:not(.active) { opacity: 0.85; }
      }
    }

    /* ── Keyboard hint ─────────────────────────── */
    .keyboard-hint {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      color: rgba(255,255,255,0.25);
      font-size: 0.72rem;
      padding: 6px 0 10px;
      margin: 0;
      flex-shrink: 0;
      mat-icon { font-size: 13px; width: 13px; height: 13px; }
    }

    @keyframes photoFadeIn {
      from { opacity: 0; transform: scale(0.97); }
      to   { opacity: 1; transform: scale(1); }
    }
  `],
})
export class PhotoGalleryDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<PhotoGalleryDialogComponent>);
  readonly data = inject<GalleryImageData>(MAT_DIALOG_DATA);

  readonly currentIndex = signal(this.data.currentIndex);
  readonly currentPhoto = computed(() => this.data.Image[this.currentIndex()!]);

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft') this.prev();
    else if (event.key === 'ArrowRight') this.next();
    else if (event.key === 'Escape') this.close();
  }

  prev(): void {
    if (this.currentIndex()! > 0) this.currentIndex.update(i => i - 1);
  }

  next(): void {
    if (this.currentIndex()! < this.data.Image.length - 1) {
      this.currentIndex.update(i => i + 1);
    }
  }

  close(): void {
    this.dialogRef.close();
  }

  onImageError(event: Event): void {
    (event.target as HTMLImageElement).src = 'assets/avatar-default.svg';
  }
}
