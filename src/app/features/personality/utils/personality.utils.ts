import {
  COMPATIBILITY_RECOMMENDATIONS,
  DIMENSION_META,
  DIMENSION_ORDER,
} from '../constants/personality.constants';
import {
  DimensionCompatibility,
  PersonalityDimension,
  PersonalityPole,
  PersonalityQuestion,
} from '../models/personality.model';

/**
 * The profiles.id the personality API expects, from a UserProfile.
 *
 * The profiles API (suhana-api `ProfilesService.toProfileResponse`) sends the
 * profile's id in the field named `userId` and sends no `id` at all — so
 * `userId` is the real profile id on the wire. `id` is checked first in case
 * the API is ever corrected.
 */
export function profileIdOf(profile: { id?: string | null; userId?: string | null } | null | undefined): string | null {
  return profile?.id || profile?.userId || null;
}

/** Groups questions by dimension (EI, SN, TF, JP), each in display order. */
export function groupQuestionsByDimension(
  questions: PersonalityQuestion[],
): Record<PersonalityDimension, PersonalityQuestion[]> {
  const groups = Object.fromEntries(DIMENSION_ORDER.map(d => [d, [] as PersonalityQuestion[]])) as Record<
    PersonalityDimension,
    PersonalityQuestion[]
  >;
  for (const q of [...questions].sort((a, b) => a.displayOrder - b.displayOrder)) {
    groups[q.dimension]?.push(q);
  }
  return groups;
}

/** Whether a pair shares the first pole, the second pole, or differs. */
export function pairVariant(
  dimension: PersonalityDimension,
  poleA: PersonalityPole,
  poleB: PersonalityPole,
): 'first' | 'second' | 'mixed' {
  if (poleA !== poleB) return 'mixed';
  return poleA === DIMENSION_META[dimension].poles[0] ? 'first' : 'second';
}

/** One practical recommendation per dimension, from the compatibility breakdown. */
export function buildRecommendations(breakdown: DimensionCompatibility[] | undefined): string[] {
  return (breakdown ?? []).map(
    d => COMPATIBILITY_RECOMMENDATIONS[d.dimension][pairVariant(d.dimension, d.poleA, d.poleB)],
  );
}

export interface CombinedInsight {
  icon: string;
  title: string;
  message: string;
}

/**
 * Reads the profile-compatibility score (background, values, lifestyle) and the
 * personality-compatibility score (how two people think and communicate) side
 * by side. The two are deliberately NOT merged into one number — this turns the
 * pair into a plain-language takeaway instead.
 */
export function combinedInsight(profilePct: number, personalityPct: number, threshold = 70): CombinedInsight {
  const profileStrong = profilePct >= threshold;
  const personalityStrong = personalityPct >= threshold;
  if (profileStrong && personalityStrong) {
    return {
      icon: 'auto_awesome',
      title: 'Strong on both fronts',
      message: 'Your backgrounds and values align, and your personalities fit well together — a genuinely promising match.',
    };
  }
  if (profileStrong) {
    return {
      icon: 'forum',
      title: 'Great on paper — get to know each other',
      message: 'Your backgrounds align well, but your personalities work differently. Invest early in understanding each other’s communication style.',
    };
  }
  if (personalityStrong) {
    return {
      icon: 'favorite',
      title: 'Your personalities click',
      message: 'You’re likely to connect easily as people. Talk openly about family, lifestyle and expectations to bridge differences in background.',
    };
  }
  return {
    icon: 'handshake',
    title: 'Take it one conversation at a time',
    message: 'There are differences in both background and personality. Honest conversations will tell you more than any score.',
  };
}

/** Extracts a readable message from an HttpErrorResponse-like value. */
export function toErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const e = err as { status?: number; error?: { message?: unknown } | string; message?: string } | null;
  if (e?.status === 0) return 'Unable to reach Aurora right now. Please check your connection.';
  const body = e?.error;
  if (typeof body === 'string' && body.trim()) return body;
  if (body && typeof body === 'object') {
    const msg = (body as { message?: unknown }).message;
    if (Array.isArray(msg) && msg.length) return String(msg[0]);
    if (typeof msg === 'string' && msg.trim()) return msg;
  }
  return fallback;
}
