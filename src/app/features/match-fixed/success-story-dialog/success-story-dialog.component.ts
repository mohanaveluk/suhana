import { Component, ChangeDetectionStrategy, inject, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DatePipe } from '@angular/common';
import { MaterialModule } from '../../../shared/modules/material.module';
import { MatDialog } from '@angular/material/dialog';
import { SuccessStoryResponse } from '../models/success-story.model';
import { MATCH_SOURCE_LABELS } from '../models/match-fixed.model';
import { ImageViewerDialogComponent } from '../image-viewer-dialog/image-viewer-dialog.component';

@Component({
  selector: 'app-success-story-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialModule, DatePipe],
  templateUrl: './success-story-dialog.component.html',
  styleUrl:    './success-story-dialog.component.scss',
})
export class SuccessStoryDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<SuccessStoryDialogComponent>);
  private readonly dialog    = inject(MatDialog);

  protected readonly sourceLabels = MATCH_SOURCE_LABELS;

  constructor(@Inject(MAT_DIALOG_DATA) protected readonly story: SuccessStoryResponse) {}

  photos(): string[] {
    return [
      this.story.partnerPhotoUrl,
      this.story.engagementPhotoUrl,
      this.story.weddingPhotoUrl,
    ].filter(Boolean) as string[];
  }

  openImage(index: number): void {
    this.dialog.open(ImageViewerDialogComponent, {
      data: { urls: this.photos(), index },
      panelClass: 'image-viewer-panel',
      maxWidth: '100vw',
      maxHeight: '100vh',
    });
  }

  close(): void { this.dialogRef.close(); }
}
