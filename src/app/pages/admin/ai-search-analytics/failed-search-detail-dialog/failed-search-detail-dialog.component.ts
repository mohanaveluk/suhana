import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { FailedSearch, improvementHints } from '../../../../models/admin-search-analytics.model';

export interface FailedSearchDetailData {
  item: FailedSearch;
  days: number;
}

@Component({
  selector: 'app-failed-search-detail-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatDividerModule],
  templateUrl: './failed-search-detail-dialog.component.html',
  styleUrl: './failed-search-detail-dialog.component.scss',
})
export class FailedSearchDetailDialogComponent {
  protected readonly data = inject<FailedSearchDetailData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<FailedSearchDetailDialogComponent>);

  protected readonly hints = improvementHints(this.data.item);

  protected copyQuery(): void {
    void navigator.clipboard?.writeText(this.data.item.query);
  }

  protected close(): void { this.dialogRef.close(); }
}
