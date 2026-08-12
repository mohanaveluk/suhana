import { Component, ChangeDetectionStrategy, input, model, inject } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MaterialModule } from '../../../../shared/modules/material.module';
import { SearchService } from '../../../../services';

/**
 * Client-side narrowing of the already-loaded results. Deliberately makes no
 * API call — it only hides cards that are already on the page.
 */
@Component({
  selector: 'app-search-within-results',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule, MaterialModule],
  templateUrl: './search-within-results.component.html',
  styleUrl: './search-within-results.component.scss',
})
export class SearchWithinResultsComponent {
  readonly value = model<string>('');
  readonly matchCount = input<number>(0);
  readonly totalCount = input<number>(0);

    protected readonly searchService   = inject(SearchService);
  
}
