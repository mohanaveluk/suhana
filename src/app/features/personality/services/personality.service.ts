import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ApiService } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import {
  AssessmentAnswer,
  AssessmentResult,
  PersonalityCompatibility,
  PersonalityDraft,
  PersonalityMatchStatus,
  PersonalityQuestion,
  StartAssessmentResponse,
} from '../models/personality.model';

const DRAFT_KEY_PREFIX = 'suhana_personality_draft_';
const PROMPT_KEY_PREFIX = 'suhana_personality_prompt_';
const PROMPT_SNOOZE_DAYS = 7;

/**
 * State + API orchestration for the Aurora Personality Assessment.
 *
 * - `myResult` caches the signed-in member's current result so the landing,
 *   result and compatibility pages share one fetch.
 * - Answers in progress are saved per user on this device (localStorage) so an
 *   interrupted assessment resumes where it left off.
 * - All caches reset when the signed-in user changes.
 */
@Injectable({ providedIn: 'root' })
export class PersonalityService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  private readonly _myResult = signal<AssessmentResult | null>(null);
  private readonly _myResultLoading = signal(false);
  private questionsCache: PersonalityQuestion[] | null = null;
  private myResultRequest: Promise<AssessmentResult> | null = null;

  readonly myResult = this._myResult.asReadonly();
  readonly myResultLoading = this._myResultLoading.asReadonly();
  readonly hasCompleted = computed(() => !!this._myResult()?.available);

  constructor() {
    // Never leak one member's result into another member's session.
    effect(() => {
      this.auth.user()?.id;
      untracked(() => this.resetCache());
    });
  }

  // ── Questions ──────────────────────────────────────────────────────────────

  async getQuestions(): Promise<PersonalityQuestion[]> {
    if (this.questionsCache) return this.questionsCache;
    const res = await firstValueFrom(this.api.getPersonalityQuestions());
    this.questionsCache = [...(res?.questions ?? [])].sort((a, b) => a.displayOrder - b.displayOrder);
    return this.questionsCache;
  }

  // ── Assessment lifecycle ───────────────────────────────────────────────────

  startAssessment(): Promise<StartAssessmentResponse> {
    return firstValueFrom(this.api.startPersonalityAssessment());
  }

  async submitAssessment(assessmentId: string, responses: AssessmentAnswer[]): Promise<AssessmentResult> {
    const result = await firstValueFrom(this.api.submitPersonalityAssessment({ assessmentId, responses }));
    this._myResult.set(result);
    this.clearDraft();
    return result;
  }

  // ── Results ────────────────────────────────────────────────────────────────

  /** The member's current result; cached unless `force` is set. Concurrent callers share one request. */
  loadMyResult(force = false): Promise<AssessmentResult> {
    const cached = this._myResult();
    if (cached && !force) return Promise.resolve(cached);
    if (this.myResultRequest && !force) return this.myResultRequest;

    this._myResultLoading.set(true);
    this.myResultRequest = firstValueFrom(this.api.getMyPersonalityResult())
      .then(result => {
        this._myResult.set(result);
        return result;
      })
      .finally(() => {
        this._myResultLoading.set(false);
        this.myResultRequest = null;
      });
    return this.myResultRequest;
  }

  getProfileResult(profileId: string): Promise<AssessmentResult> {
    return firstValueFrom(this.api.getPersonalityResult(profileId));
  }

  getCompatibility(profileIdA: string, profileIdB: string): Promise<PersonalityCompatibility> {
    return firstValueFrom(this.api.getPersonalityCompatibility(profileIdA, profileIdB));
  }

  /**
   * Resolves the signed-in member's personality-match standing with another
   * profile in one call: both results, and the compatibility when both exist.
   * Callers handle guests themselves (every endpoint here needs a session).
   */
  async getMatchStatus(theirProfileId: string): Promise<PersonalityMatchStatus> {
    const [mine, theirs] = await Promise.all([this.loadMyResult(), this.getProfileResult(theirProfileId)]);
    const mineDone = !!mine?.available;
    const theirsDone = !!theirs?.available;

    if (mineDone && mine.profileId === theirProfileId) {
      return { state: 'self', mine, theirs: mine, compatibility: null };
    }
    if (!mineDone && !theirsDone) return { state: 'both-missing', mine, theirs, compatibility: null };
    if (!mineDone) return { state: 'self-missing', mine, theirs, compatibility: null };
    if (!theirsDone) return { state: 'other-missing', mine, theirs, compatibility: null };

    const compatibility = await this.getCompatibility(mine.profileId!, theirProfileId);
    return compatibility.available
      ? { state: 'ready', mine, theirs, compatibility }
      : { state: 'other-missing', mine, theirs, compatibility: null };
  }

  // ── Draft persistence (per user, this device only) ─────────────────────────

  loadDraft(assessmentId: string): PersonalityDraft | null {
    try {
      const raw = localStorage.getItem(this.draftKey());
      if (!raw) return null;
      const draft = JSON.parse(raw) as PersonalityDraft;
      return draft?.assessmentId === assessmentId && draft.answers ? draft : null;
    } catch {
      return null;
    }
  }

  /** Number of answers saved on this device for an unfinished assessment (0 if none). */
  draftAnswerCount(): number {
    try {
      const raw = localStorage.getItem(this.draftKey());
      const draft = raw ? (JSON.parse(raw) as PersonalityDraft) : null;
      return draft?.answers ? Object.keys(draft.answers).length : 0;
    } catch {
      return 0;
    }
  }

  saveDraft(draft: PersonalityDraft): void {
    try {
      localStorage.setItem(this.draftKey(), JSON.stringify(draft));
    } catch {
      /* storage full or blocked — the assessment still works, it just won't resume */
    }
  }

  clearDraft(): void {
    try {
      localStorage.removeItem(this.draftKey());
    } catch {
      /* ignore */
    }
  }

  // ── Prompt dismissal (per user, per placement, this device only) ───────────

  /** True while a dismissed prompt is still snoozed (default 7 days). */
  isPromptSnoozed(placement: string, days = PROMPT_SNOOZE_DAYS): boolean {
    try {
      const raw = localStorage.getItem(this.promptKey(placement));
      if (!raw) return false;
      const dismissedAt = Number(raw);
      return Number.isFinite(dismissedAt) && Date.now() - dismissedAt < days * 24 * 60 * 60 * 1000;
    } catch {
      return false;
    }
  }

  snoozePrompt(placement: string): void {
    try {
      localStorage.setItem(this.promptKey(placement), String(Date.now()));
    } catch {
      /* ignore — the prompt simply shows again next visit */
    }
  }

  private promptKey(placement: string): string {
    return `${PROMPT_KEY_PREFIX}${placement}_${this.auth.user()?.id ?? 'anonymous'}`;
  }

  private draftKey(): string {
    return `${DRAFT_KEY_PREFIX}${this.auth.user()?.id ?? 'anonymous'}`;
  }

  private resetCache(): void {
    this._myResult.set(null);
    this.myResultRequest = null;
  }
}
