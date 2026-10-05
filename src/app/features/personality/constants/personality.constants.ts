import {
  CompatibilityLevel,
  ConfidenceLevel,
  LikertOptionKey,
  PersonalityDimension,
  PersonalityPole,
  PersonalityTypeCode,
} from '../models/personality.model';

/** Order the four letters combine in, and the order sections are shown. */
export const DIMENSION_ORDER: readonly PersonalityDimension[] = ['EI', 'SN', 'TF', 'JP'];

export interface DimensionMeta {
  code: PersonalityDimension;
  /** Friendly section title used in the questionnaire. */
  title: string;
  /** Formal label, e.g. "Introversion vs Extroversion". */
  label: string;
  question: string;
  icon: string;
  /** Accent colour — AA contrast against white text at large sizes. */
  color: string;
  poles: readonly [PersonalityPole, PersonalityPole];
}

export const DIMENSION_META: Record<PersonalityDimension, DimensionMeta> = {
  EI: {
    code: 'EI',
    title: 'Social Energy',
    label: 'Introversion vs Extroversion',
    question: 'Where do you draw your energy from — people around you, or quiet time within?',
    icon: 'diversity_3',
    color: '#800020',
    poles: ['E', 'I'],
  },
  SN: {
    code: 'SN',
    title: 'How You See the World',
    label: 'Sensing vs Intuition',
    question: 'Do you focus on concrete facts and experience, or on patterns and possibilities?',
    icon: 'visibility',
    color: '#7a5c12',
    poles: ['S', 'N'],
  },
  TF: {
    code: 'TF',
    title: 'How You Decide',
    label: 'Thinking vs Feeling',
    question: 'Do you lead with logic and objectivity, or with values and empathy?',
    icon: 'balance',
    color: '#a8325e',
    poles: ['T', 'F'],
  },
  JP: {
    code: 'JP',
    title: 'Your Lifestyle',
    label: 'Judging vs Perceiving',
    question: 'Do you prefer structure and plans, or flexibility and spontaneity?',
    icon: 'event_note',
    color: '#6b3a48',
    poles: ['J', 'P'],
  },
};

export const POLE_LABELS: Record<PersonalityPole, string> = {
  E: 'Extroversion',
  I: 'Introversion',
  S: 'Sensing',
  N: 'Intuition',
  T: 'Thinking',
  F: 'Feeling',
  J: 'Judging',
  P: 'Perceiving',
};

export const POLE_DIMENSION: Record<PersonalityPole, PersonalityDimension> = {
  E: 'EI', I: 'EI', S: 'SN', N: 'SN', T: 'TF', F: 'TF', J: 'JP', P: 'JP',
};

/** Visual weight of each Likert choice on the agree ↔ disagree scale. */
export const LIKERT_UI: Record<LikertOptionKey, { size: 'lg' | 'md' | 'sm'; tone: 'agree' | 'neutral' | 'disagree' }> = {
  STRONGLY_AGREE: { size: 'lg', tone: 'agree' },
  AGREE: { size: 'md', tone: 'agree' },
  NEUTRAL: { size: 'sm', tone: 'neutral' },
  DISAGREE: { size: 'md', tone: 'disagree' },
  STRONGLY_DISAGREE: { size: 'lg', tone: 'disagree' },
};

/** Catalogue of the 16 types (titles match the backend's insight titles). */
export const PERSONALITY_TYPE_CATALOG: Record<PersonalityTypeCode, { title: string; tagline: string }> = {
  INTJ: { title: 'The Strategist', tagline: 'Independent, analytical and future-focused' },
  INTP: { title: 'The Thinker', tagline: 'Curious, inventive and logical' },
  ENTJ: { title: 'The Leader', tagline: 'Confident, decisive and ambitious' },
  ENTP: { title: 'The Innovator', tagline: 'Quick-witted, energetic and creative' },
  INFJ: { title: 'The Counselor', tagline: 'Insightful, principled and caring' },
  INFP: { title: 'The Idealist', tagline: 'Gentle, creative and value-driven' },
  ENFJ: { title: 'The Mentor', tagline: 'Warm, inspiring and encouraging' },
  ENFP: { title: 'The Champion', tagline: 'Enthusiastic, imaginative and warm' },
  ISTJ: { title: 'The Guardian', tagline: 'Responsible, practical and dependable' },
  ISFJ: { title: 'The Nurturer', tagline: 'Kind, loyal and attentive' },
  ESTJ: { title: 'The Organizer', tagline: 'Practical, structured and dependable' },
  ESFJ: { title: 'The Caregiver', tagline: 'Sociable, caring and loyal' },
  ISTP: { title: 'The Craftsman', tagline: 'Calm, observant and hands-on' },
  ISFP: { title: 'The Artist', tagline: 'Gentle, sensitive and creative' },
  ESTP: { title: 'The Dynamo', tagline: 'Energetic, bold and action-oriented' },
  ESFP: { title: 'The Entertainer', tagline: 'Fun-loving, spontaneous and warm' },
};

export const CONFIDENCE_COPY: Record<ConfidenceLevel, string> = {
  High: 'Your answers show clear, consistent preferences — this result is a strong reflection of you.',
  Medium: 'Your preferences are fairly clear, with some flexibility on one or more dimensions.',
  Low: 'Your answers were balanced on several dimensions, so you may relate to more than one type. Consider retaking with your first instinct.',
};

export const COMPATIBILITY_COPY: Record<CompatibilityLevel, { icon: string; headline: string }> = {
  Excellent: { icon: 'auto_awesome', headline: 'A naturally harmonious pairing' },
  Good: { icon: 'favorite', headline: 'A strong, balanced connection' },
  Moderate: { icon: 'handshake', headline: 'A pairing that grows with understanding' },
  Challenging: { icon: 'psychology_alt', headline: 'Different worlds that can learn from each other' },
};

/**
 * Actionable recommendations per dimension, keyed by whether the pair shares
 * the first pole, the second pole, or differs ('mixed'). Derived client-side
 * from `dimensionBreakdown`, complementing the API's strengths/challenges.
 */
export const COMPATIBILITY_RECOMMENDATIONS: Record<PersonalityDimension, Record<'first' | 'second' | 'mixed', string>> = {
  EI: {
    first: 'Plan regular evenings for just the two of you, away from family and friends.',
    second: 'Take turns planning a social outing each month so your circle keeps growing together.',
    mixed: 'Agree on a weekly rhythm: some social plans for one, guaranteed quiet time for the other.',
  },
  SN: {
    first: 'Set one "dream" goal together each year to balance your practical focus.',
    second: 'Pair every big idea with a simple first step and a date to review it.',
    mixed: 'When discussing plans, share both the big picture and the concrete details before deciding.',
  },
  TF: {
    first: 'Make appreciation a daily habit — say what you value in each other out loud.',
    second: 'Raise small concerns early and kindly, before they grow into bigger ones.',
    mixed: 'In disagreements, acknowledge feelings first, then work through the facts together.',
  },
  JP: {
    first: 'Leave some weekends unplanned to make room for spontaneity.',
    second: 'Keep a shared calendar or list for bills, family events and household tasks.',
    mixed: 'Decide together which things need firm plans and which can stay flexible.',
  },
};

export const ASSESSMENT_ESTIMATED_MINUTES = 6;
