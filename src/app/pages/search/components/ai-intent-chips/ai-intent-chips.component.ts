import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { IntentChip } from '../../../../models/ai-search.model';

@Component({
  selector: 'app-ai-intent-chips',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatChipsModule, MatIconModule, MatTooltipModule],
  templateUrl: './ai-intent-chips.component.html',
  styleUrl: './ai-intent-chips.component.scss',
})
export class AiIntentChipsComponent {
  readonly chips = input<IntentChip[]>([]);
  /** Spelling fixes the parser applied, as [typed, corrected] pairs. */
  readonly corrections = input<[string, string][]>([]);
  readonly disabled = input(false);

  readonly remove = output<IntentChip>();
}
