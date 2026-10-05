/**
 * Aurora Personality Assessment — wire models.
 *
 * Mirrors suhana-api/src/modules/personality/dto/*.ts and enums/personality.enums.ts.
 * Optional fields are genuinely optional on the wire: result/compatibility
 * responses carry only `available` + `message` when data is missing.
 */

export type PersonalityDimension = 'EI' | 'SN' | 'TF' | 'JP';
export type PersonalityPole = 'E' | 'I' | 'S' | 'N' | 'T' | 'F' | 'J' | 'P';
export type ConfidenceLevel = 'Low' | 'Medium' | 'High';
export type CompatibilityLevel = 'Excellent' | 'Good' | 'Moderate' | 'Challenging';
export type AssessmentStatus = 'IN_PROGRESS' | 'COMPLETED';
export type LikertOptionKey = 'STRONGLY_AGREE' | 'AGREE' | 'NEUTRAL' | 'DISAGREE' | 'STRONGLY_DISAGREE';

export const PERSONALITY_TYPES = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP',
] as const;

export type PersonalityTypeCode = (typeof PERSONALITY_TYPES)[number];

// ── GET /personality/questions ───────────────────────────────────────────────

/** Score mappings are never sent to the client — only ids, keys and text. */
export interface PersonalityOption {
  id: number;
  key: LikertOptionKey;
  text: string;
  displayOrder: number;
}

export interface PersonalityQuestion {
  id: number;
  code: string;
  text: string;
  dimension: PersonalityDimension;
  displayOrder: number;
  options: PersonalityOption[];
}

export interface PersonalityQuestionsResponse {
  locale: string;
  totalQuestions: number;
  questions: PersonalityQuestion[];
}

// ── POST /personality/assessment/start ──────────────────────────────────────

export interface StartAssessmentResponse {
  assessmentId: string;
  profileId: string;
  status: AssessmentStatus;
  startedAt: string;
  totalQuestions: number;
  resumed: boolean;
}

// ── POST /personality/assessment/submit ─────────────────────────────────────

export interface AssessmentAnswer {
  questionId: number;
  optionId: number;
}

export interface SubmitAssessmentRequest {
  assessmentId?: string;
  profileId?: string;
  responses: AssessmentAnswer[];
}

// ── Result (submit response, GET /personality/profile/me|:profileId) ─────────

export interface ConfidenceScore {
  score: number;
  level: ConfidenceLevel;
}

export interface DimensionScore {
  dimension: PersonalityDimension;
  label: string;
  dominant: PersonalityPole;
  dominantLabel: string;
  scores: Partial<Record<PersonalityPole, number>>;
  percentages: Partial<Record<PersonalityPole, number>>;
}

export interface PersonalityInsights {
  title: string;
  summary: string;
  strengths: string[];
  growthAreas: string[];
  inRelationships: string;
}

export interface AssessmentResult {
  available: boolean;
  message?: string;
  assessmentId?: string;
  profileId?: string;
  personalityType?: PersonalityTypeCode;
  completedDate?: string;
  confidence?: ConfidenceScore;
  dimensions?: DimensionScore[];
  insights?: PersonalityInsights;
}

// ── GET /personality/match/:profileIdA/:profileIdB ──────────────────────────

export interface CompatibilityProfile {
  profileId: string;
  personalityType: PersonalityTypeCode;
}

export interface DimensionCompatibility {
  dimension: PersonalityDimension;
  poleA: PersonalityPole;
  poleB: PersonalityPole;
  aligned: boolean;
  score: number;
}

export interface CommunicationStyle {
  label: string;
  description: string;
}

export interface PersonalityCompatibility {
  available: boolean;
  message?: string;
  profiles?: CompatibilityProfile[];
  compatibilityScore?: number;
  compatibilityLevel?: CompatibilityLevel;
  dimensionBreakdown?: DimensionCompatibility[];
  communicationStyle?: CommunicationStyle;
  strengths?: string[];
  potentialChallenges?: string[];
  analysisVersion?: string;
}

// ── Client-only ─────────────────────────────────────────────────────────────

/**
 * Where a pair stands on personality matching, from the viewer's side:
 * - ready         both completed → `compatibility` is filled
 * - self-missing  the viewer hasn't completed it (the other member may have)
 * - other-missing the viewer has, the other member hasn't
 * - both-missing  neither has
 * - self          the viewer is looking at their own profile
 * - guest         not signed in — personality data needs an account
 */
export type PersonalityMatchState = 'ready' | 'self-missing' | 'other-missing' | 'both-missing' | 'self' | 'guest';

export interface PersonalityMatchStatus {
  state: PersonalityMatchState;
  mine: AssessmentResult | null;
  theirs: AssessmentResult | null;
  compatibility: PersonalityCompatibility | null;
}

/** Answers saved on this device so an interrupted assessment can resume. */
export interface PersonalityDraft {
  assessmentId: string;
  answers: Record<string, number>; // questionId → optionId
  sectionIndex: number;
  savedAt: string;
}
