import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { MaterialModule } from '../../../../shared/modules/material.module';
import { HelpCategory } from '../../help-center.model';

@Component({
  selector: 'app-help-category-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialModule],
  templateUrl: './help-category-grid.component.html',
  styleUrl: './help-category-grid.component.scss',
})
export class HelpCategoryGridComponent {
  readonly categories = input.required<HelpCategory[]>();
  readonly loading = input(false);
  readonly selectedId = input<string | null>(null);

  /** Emits the clicked category's id, or null when re-clicking the active one clears the filter. */
  readonly categorySelected = output<string | null>();

  protected toggle(id: string): void {
    this.categorySelected.emit(this.selectedId() === id ? null : id);
  }
}
