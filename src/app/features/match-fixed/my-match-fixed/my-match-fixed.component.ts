import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DatePipe } from '@angular/common';
import { MaterialModule } from '../../../shared/modules/material.module';
import { MatchFixedService } from '../match-fixed.service';
import { MatchFixedResponse, MATCH_SOURCE_LABELS } from '../models/match-fixed.model';
import { ImageViewerDialogComponent } from '../image-viewer-dialog/image-viewer-dialog.component';

@Component({
  selector: 'app-my-match-fixed',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MaterialModule, DatePipe],
  templateUrl: './my-match-fixed.component.html',
  styleUrl:    './my-match-fixed.component.scss',
})
export class MyMatchFixedComponent implements OnInit {
  private readonly svc    = inject(MatchFixedService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snack  = inject(MatSnackBar);

  protected readonly sourceLabels  = MATCH_SOURCE_LABELS;
  protected readonly record        = signal<MatchFixedResponse | null>(null);
  protected readonly isLoading     = signal(true);
  protected readonly cancelling    = signal(false);
  protected readonly confirmCancel = signal(false);

  async ngOnInit(): Promise<void> {
    const r = await this.svc.getMyMatchFixed();
    this.record.set(r);
    this.isLoading.set(false);
  }

  openImage(urls: string[], index = 0): void {
    this.dialog.open(ImageViewerDialogComponent, {
      data: { urls, index },
      panelClass: 'image-viewer-panel',
      maxWidth: '100vw',
      maxHeight: '100vh',
    });
  }

  photos(): string[] {
    const r = this.record();
    if (!r) return [];
    return [r.partnerPhotoUrl?.thumbnailUrl, r.engagementPhotoUrl?.thumbnailUrl, r.weddingPhotoUrl?.thumbnailUrl].filter(Boolean) as string[];
  }

  photosOriginal(): string[] {
    const r = this.record();
    if (!r) return [];
    return [r.partnerPhotoUrl?.originalUrl, r.engagementPhotoUrl?.originalUrl, r.weddingPhotoUrl?.originalUrl].filter(Boolean) as string[];
  }

  photoLabel(index: number): string {
    return ['Partner Photo', 'Engagement Photo', 'Wedding Photo'][index] ?? 'Photo';
  }

  async cancelMatchFixed(): Promise<void> {
    const r = this.record();
    if (!r) return;
    this.cancelling.set(true);
    try {
      await this.svc.cancelMatchFixed(r.id);
      this.snack.open('Match Fixed record has been cancelled.', 'OK', { duration: 4000 });
      this.router.navigate(['/profile']);
    } catch {
      this.snack.open('Failed to cancel. Please try again.', 'Dismiss', { duration: 4000 });
    } finally {
      this.cancelling.set(false);
      this.confirmCancel.set(false);
    }
  }
}
