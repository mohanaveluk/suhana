import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  DOCUMENT,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSnackBar } from '@angular/material/snack-bar';
import { debounceTime, startWith } from 'rxjs';

import { MaterialModule } from '../../../../shared/modules/material.module';
import { QuestionCardComponent } from '../../components/question-card/question-card.component';
import { DIMENSION_META, DIMENSION_ORDER, DimensionMeta } from '../../constants/personality.constants';
import { AssessmentAnswer, PersonalityQuestion, StartAssessmentResponse } from '../../models/personality.model';
import { PersonalityService } from '../../services/personality.service';
import { groupQuestionsByDimension, toErrorMessage } from '../../utils/personality.utils';

interface AssessmentSection {
  meta: DimensionMeta;
  questions: PersonalityQuestion[];
  /** Global number of the section's first question (1-based). */
  offset: number;
}

type PageStatus = 'loading' | 'ready' | 'submitting' | 'no-profile' | 'error';

/**
 * The questionnaire: one section per dimension (Social Energy, How You See the
 * World, How You Decide, Your Lifestyle), eight statements each.
 *
 * Answers live in a single Reactive FormGroup keyed by question id. Progress is
 * mirrored into a signal from valueChanges (computed() can't observe a
 * FormGroup directly), and auto-saved to this device so the member can resume.
 */
@Component({
  selector: 'app-personality-assessment-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialModule, RouterLink, QuestionCardComponent],
  templateUrl: './personality-assessment.page.html',
  styleUrl: './personality-assessment.page.scss',
})
export class PersonalityAssessmentPage implements OnInit {
  private readonly svc = inject(PersonalityService);
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);

  protected readonly status = signal<PageStatus>('loading');
  protected readonly errorMessage = signal('');
  protected readonly assessment = signal<StartAssessmentResponse | null>(null);
  protected readonly sections = signal<AssessmentSection[]>([]);
  protected readonly sectionIndex = signal(0);
  protected readonly showErrors = signal(false);
  protected readonly liveMessage = signal('');
  /** Mirror of the form value: questionId → optionId | null. */
  protected readonly answers = signal<Record<string, number | null | undefined>>({});

  protected form = new FormGroup<Record<string, FormControl<number | null>>>({});

  // ── Derived state ──────────────────────────────────────────────────────────

  protected readonly totalQuestions = computed(() =>
    this.sections().reduce((sum, s) => sum + s.questions.length, 0),
  );

  protected readonly answeredCount = computed(
    () => Object.values(this.answers()).filter(v => v !== null && v !== undefined).length,
  );

  protected readonly progressPct = computed(() =>
    this.totalQuestions() ? Math.round((this.answeredCount() / this.totalQuestions()) * 100) : 0,
  );

  protected readonly sectionStats = computed(() => {
    const answers = this.answers();
    return this.sections().map(s => {
      const answered = s.questions.filter(q => answers[q.id] != null).length;
      return { answered, total: s.questions.length, complete: answered === s.questions.length };
    });
  });

  protected readonly currentSection = computed<AssessmentSection | null>(
    () => this.sections()[this.sectionIndex()] ?? null,
  );

  protected readonly isFirstSection = computed(() => this.sectionIndex() === 0);
  protected readonly isLastSection = computed(() => this.sectionIndex() === this.sections().length - 1);
  protected readonly allAnswered = computed(
    () => this.totalQuestions() > 0 && this.answeredCount() === this.totalQuestions(),
  );

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  protected async load(): Promise<void> {
    this.status.set('loading');
    try {
      const [assessment, questions] = await Promise.all([this.svc.startAssessment(), this.svc.getQuestions()]);
      this.assessment.set(assessment);
      this.buildSections(questions);
      this.buildForm(questions);
      this.restoreDraft(assessment.assessmentId);
      this.status.set('ready');
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 404) {
        this.status.set('no-profile');
        this.errorMessage.set(toErrorMessage(err, 'Create your matrimony profile before taking the assessment.'));
      } else {
        this.status.set('error');
        this.errorMessage.set(toErrorMessage(err, 'We couldn’t load the assessment. Please try again.'));
      }
    }
  }

  // ── Navigation between sections ────────────────────────────────────────────

  protected next(): void {
    const stats = this.sectionStats()[this.sectionIndex()];
    if (!stats?.complete) {
      this.flagUnanswered(this.sectionIndex());
      return;
    }
    this.goToSection(this.sectionIndex() + 1);
  }

  protected previous(): void {
    if (!this.isFirstSection()) this.goToSection(this.sectionIndex() - 1);
  }

  /** Sections can be revisited freely; moving ahead requires earlier sections complete. */
  protected canOpenSection(index: number): boolean {
    if (index <= this.sectionIndex()) return true;
    return this.sectionStats().slice(0, index).every(s => s.complete);
  }

  protected goToSection(index: number): void {
    if (index < 0 || index >= this.sections().length || !this.canOpenSection(index)) return;
    this.sectionIndex.set(index);
    this.showErrors.set(false);
    this.persistDraft();

    const section = this.sections()[index];
    this.liveMessage.set(
      `Section ${index + 1} of ${this.sections().length}: ${section.meta.title}. ${section.questions.length} statements.`,
    );
    this.scrollTo('pp-section-top', 'start');
  }

  // ── Answering ──────────────────────────────────────────────────────────────

  /** After an answer, glide to the next unanswered statement in this section. */
  protected onAnswered(questionId: number): void {
    const section = this.currentSection();
    if (!section) return;
    const answers = this.form.getRawValue();
    const position = section.questions.findIndex(q => q.id === questionId);
    const nextOpen = section.questions.slice(position + 1).find(q => answers[q.id] == null);
    if (nextOpen) {
      setTimeout(() => this.scrollTo(`pq-${nextOpen.id}`, 'center'), 160);
    } else if (this.sectionStats()[this.sectionIndex()]?.complete) {
      setTimeout(() => this.scrollTo('pp-section-nav', 'center'), 160);
    }
  }

  protected controlFor(question: PersonalityQuestion): FormControl<number | null> {
    return this.form.controls[String(question.id)];
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  protected async submit(): Promise<void> {
    if (this.status() === 'submitting') return;

    const firstIncomplete = this.sectionStats().findIndex(s => !s.complete);
    if (firstIncomplete !== -1) {
      if (firstIncomplete !== this.sectionIndex()) this.goToSection(firstIncomplete);
      this.flagUnanswered(firstIncomplete);
      return;
    }

    const assessment = this.assessment();
    if (!assessment) return;

    const values = this.form.getRawValue();
    const responses: AssessmentAnswer[] = Object.entries(values).map(([questionId, optionId]) => ({
      questionId: Number(questionId),
      optionId: optionId as number,
    }));

    this.status.set('submitting');
    this.liveMessage.set('Calculating your personality type…');
    try {
      const result = await this.svc.submitAssessment(assessment.assessmentId, responses);
      this.snack.open(`Your Aurora personality type is ${result.personalityType} ✨`, 'Close', { duration: 4000 });
      await this.router.navigate(['/personality/result'], { replaceUrl: true });
    } catch (err) {
      this.status.set('ready');
      const status = (err as { status?: number })?.status;
      if (status === 409) {
        // This attempt was already submitted elsewhere — start a fresh one.
        this.svc.clearDraft();
        this.snack.open('This assessment was already submitted. Starting a fresh attempt.', 'Close', { duration: 5000 });
        await this.load();
        return;
      }
      this.snack.open(toErrorMessage(err, 'We couldn’t submit your answers. Please try again.'), 'Close', {
        duration: 6000,
      });
    }
  }

  protected saveAndExit(): void {
    this.persistDraft();
    this.snack.open('Your answers are saved on this device. Continue any time.', 'Close', { duration: 3500 });
    void this.router.navigate(['/personality']);
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  private buildSections(questions: PersonalityQuestion[]): void {
    const grouped = groupQuestionsByDimension(questions);
    let offset = 1;
    const sections: AssessmentSection[] = [];
    for (const code of DIMENSION_ORDER) {
      const list = grouped[code];
      if (!list?.length) continue;
      sections.push({ meta: DIMENSION_META[code], questions: list, offset });
      offset += list.length;
    }
    this.sections.set(sections);
    this.sectionIndex.set(0);
  }

  private buildForm(questions: PersonalityQuestion[]): void {
    const controls: Record<string, FormControl<number | null>> = {};
    for (const q of questions) {
      controls[String(q.id)] = new FormControl<number | null>(null, Validators.required);
    }
    this.form = new FormGroup(controls);

    this.form.valueChanges
      .pipe(startWith(this.form.getRawValue()), takeUntilDestroyed(this.destroyRef))
      .subscribe(value => this.answers.set({ ...value }));

    this.form.valueChanges
      .pipe(debounceTime(400), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.persistDraft());
  }

  private restoreDraft(assessmentId: string): void {
    const draft = this.svc.loadDraft(assessmentId);
    if (!draft) return;

    // Only restore options that still exist for that question.
    const patch: Record<string, number> = {};
    for (const section of this.sections()) {
      for (const q of section.questions) {
        const saved = draft.answers[q.id];
        if (saved != null && q.options.some(o => o.id === saved)) patch[q.id] = saved;
      }
    }
    const restored = Object.keys(patch).length;
    if (!restored) return;

    this.form.patchValue(patch);
    const firstIncomplete = this.sectionStats().findIndex(s => !s.complete);
    this.sectionIndex.set(firstIncomplete === -1 ? this.sections().length - 1 : Math.min(draft.sectionIndex, firstIncomplete));
    this.snack.open(`Welcome back — ${restored} answer${restored === 1 ? '' : 's'} restored.`, 'Close', { duration: 3500 });
  }

  private persistDraft(): void {
    const assessment = this.assessment();
    if (!assessment || this.status() === 'submitting') return;
    const answers: Record<string, number> = {};
    for (const [id, value] of Object.entries(this.form.getRawValue())) {
      if (value != null) answers[id] = value;
    }
    if (!Object.keys(answers).length) return;
    this.svc.saveDraft({
      assessmentId: assessment.assessmentId,
      answers,
      sectionIndex: this.sectionIndex(),
      savedAt: new Date().toISOString(),
    });
  }

  private flagUnanswered(sectionIndex: number): void {
    const section = this.sections()[sectionIndex];
    if (!section) return;
    this.showErrors.set(true);
    section.questions.forEach(q => this.controlFor(q).markAsTouched());
    const answers = this.form.getRawValue();
    const firstOpen = section.questions.find(q => answers[q.id] == null);
    const remaining = section.questions.filter(q => answers[q.id] == null).length;
    this.liveMessage.set(`${remaining} statement${remaining === 1 ? '' : 's'} still need an answer.`);
    if (firstOpen) this.scrollTo(`pq-${firstOpen.id}`, 'center', true);
  }

  private scrollTo(elementId: string, block: ScrollLogicalPosition, focus = false): void {
    const el = this.document.getElementById(elementId);
    if (!el) return;
    const reduceMotion = this.document.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block });
    if (focus) el.querySelector<HTMLInputElement>('input[type="radio"]')?.focus({ preventScroll: true });
  }
}
