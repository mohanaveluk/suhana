import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

import { LIKERT_UI } from '../../constants/personality.constants';
import { PersonalityOption, PersonalityQuestion } from '../../models/personality.model';

/**
 * One statement with a five-point agree ↔ disagree scale.
 *
 * Native radio inputs inside a fieldset/legend give full keyboard and
 * screen-reader support (arrow keys move within the group) while the circles
 * are styled freely; the control is bound with [formControl].
 */
@Component({
  selector: 'app-question-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatIconModule],
  templateUrl: './question-card.component.html',
  styleUrl: './question-card.component.scss',
})
export class QuestionCardComponent {
  readonly question = input.required<PersonalityQuestion>();
  readonly control = input.required<FormControl<number | null>>();
  readonly number = input.required<number>();
  readonly showError = input(false);

  /** Emits the question id after the member picks an option. */
  readonly answered = output<number>();

  protected optionClass(option: PersonalityOption): string {
    const ui = LIKERT_UI[option.key] ?? { size: 'md', tone: 'neutral' };
    return `qc__opt qc__opt--${ui.size} qc__opt--${ui.tone}`;
  }
}
