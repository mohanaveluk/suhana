import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-ai-suggestions-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatCardModule, MatIconModule, MatButtonModule],
  templateUrl: './ai-suggestions-panel.component.html',
  styleUrl: './ai-suggestions-panel.component.scss',
})
export class AiSuggestionsPanelComponent {
  /** Follow-up queries returned alongside the search results. */
  readonly suggestions = input<string[]>([]);
  readonly disabled = input(false);

  readonly select = output<string>();
}
