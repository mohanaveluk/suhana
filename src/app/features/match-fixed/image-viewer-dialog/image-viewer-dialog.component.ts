import {
  Component, ChangeDetectionStrategy, inject, signal, computed, HostListener, Inject,
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from '../../../shared/modules/material.module';

export interface ImageViewerData {
  urls: string[];
  index?: number;
}

@Component({
  selector: 'app-image-viewer-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialModule],
  templateUrl: './image-viewer-dialog.component.html',
  styleUrl:    './image-viewer-dialog.component.scss',
})
export class ImageViewerDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<ImageViewerDialogComponent>);

  protected readonly urls: string[];
  protected readonly currentIndex = signal(0);
  protected readonly zoomLevel    = signal(1);

  protected readonly currentUrl  = computed(() => this.urls[this.currentIndex()] ?? '');
  protected readonly hasPrev     = computed(() => this.currentIndex() > 0);
  protected readonly hasNext     = computed(() => this.currentIndex() < this.urls.length - 1);

  constructor(@Inject(MAT_DIALOG_DATA) data: ImageViewerData) {
    this.urls = data.urls ?? [];
    this.currentIndex.set(Math.max(0, Math.min(data.index ?? 0, this.urls.length - 1)));
  }

  prev(): void {
    if (this.hasPrev()) { this.currentIndex.update(i => i - 1); this.zoomLevel.set(1); }
  }

  next(): void {
    if (this.hasNext()) { this.currentIndex.update(i => i + 1); this.zoomLevel.set(1); }
  }

  zoomIn():  void { this.zoomLevel.update(z => Math.min(z + 0.25, 3)); }
  zoomOut(): void { this.zoomLevel.update(z => Math.max(z - 0.25, 0.5)); }
  resetZoom(): void { this.zoomLevel.set(1); }

  download(): void {
    const a = document.createElement('a');
    a.href = this.currentUrl();
    a.download = `suhana-photo-${this.currentIndex() + 1}.jpg`;
    a.target = '_blank';
    a.click();
  }

  close(): void { this.dialogRef.close(); }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    if (e.key === 'ArrowLeft')  this.prev();
    if (e.key === 'ArrowRight') this.next();
    if (e.key === 'Escape')     this.close();
    if (e.key === '+')          this.zoomIn();
    if (e.key === '-')          this.zoomOut();
  }
}
