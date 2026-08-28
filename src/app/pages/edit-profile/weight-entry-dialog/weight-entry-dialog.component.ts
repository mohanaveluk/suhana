import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

export type WeightUnit = 'kg' | 'lb';

export interface WeightEntryDialogData {
  /** Current value of the `weight` form control, e.g. "65 kg" or "" if unset. */
  currentWeight: string;
}

export interface WeightEntryDialogResult {
  /** Combined value ready to drop straight into the `weight` form control, e.g. "65 kg". */
  weight: string;
}

/** Matches "65", "65kg", "65 kg", "154 LB", etc. — value first, optional unit after. */
const WEIGHT_PATTERN = /^(\d+(?:\.\d+)?)\s*(kg|lb)?$/i;

@Component({
  selector: 'app-weight-entry-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule, ReactiveFormsModule,
    MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, MatButtonToggleModule,
  ],
  templateUrl: './weight-entry-dialog.component.html',
  styleUrl: './weight-entry-dialog.component.scss',
})
export class WeightEntryDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<WeightEntryDialogComponent>);
  protected readonly data = inject<WeightEntryDialogData>(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.group({
    value: [this.parseValue(this.data.currentWeight), [Validators.required, Validators.min(1), Validators.max(500)]],
    unit:  [this.parseUnit(this.data.currentWeight) as WeightUnit, Validators.required],
  });

  private parseValue(raw: string): number | null {
    const match = raw?.trim().match(WEIGHT_PATTERN);
    return match ? Number(match[1]) : null;
  }

  private parseUnit(raw: string): WeightUnit {
    const match = raw?.trim().match(WEIGHT_PATTERN);
    return (match?.[2]?.toLowerCase() as WeightUnit) || 'kg';
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { value, unit } = this.form.getRawValue();
    this.dialogRef.close({ weight: `${value} ${unit}` } satisfies WeightEntryDialogResult);
  }

  protected cancel(): void {
    this.dialogRef.close(null);
  }
}
