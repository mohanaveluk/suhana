import { Component, ChangeDetectionStrategy, inject, output } from '@angular/core';
import { MatAutocompleteSelectedEvent, MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AiSearchService } from '../../../../services/ai-search.service';

const EXAMPLES = [
  'Find me a caring doctor in Texas',
  'Show Hindu brides working in IT',
  "Tamil groom with Master's degree",
  'Family-oriented software engineer in California',
];

@Component({
  selector: 'app-ai-search-box',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatAutocompleteModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule,
  ],
  templateUrl: './ai-search-box.component.html',
  styleUrl: './ai-search-box.component.scss',
})
export class AiSearchBoxComponent {
  protected readonly ai = inject(AiSearchService);

  /** Emitted when the member commits a query (Enter, button, or suggestion). */
  readonly search = output<string>();
  readonly cleared = output<void>();

  protected readonly examples = EXAMPLES;

  protected onInput(value: string): void {
    this.ai.setQuery(value);
  }

  protected onSuggestionSelected(e: MatAutocompleteSelectedEvent): void {
    const text = String(e.option.value ?? '').trim();
    if (!text) return;
    this.ai.setQuery(text);
    this.search.emit(text);
  }

  protected submit(): void {
    const q = this.ai.query().trim();
    if (!q) return;
    this.search.emit(q);
  }

  protected useExample(text: string): void {
    this.ai.setQuery(text);
    this.search.emit(text);
  }

  protected clear(): void {
    this.ai.clear();
    this.cleared.emit();
  }
}
