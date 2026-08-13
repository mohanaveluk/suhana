// Mirrors suhana-api/src/modules/search/controllers/admin-search-analytics.controller.ts

/** GET /admin/search-analytics/fallback-rate */
export interface FallbackRate {
  total: number;
  fallback: number;
  /** Percentage of searches that needed the LLM fallback. */
  ratio: number;
}

/** GET /admin/search-analytics/trends and /popular-traits */
export interface FacetCount {
  value: string;
  count: number;
}

/** GET /admin/search-analytics/failed-searches — shape of PopularSearchItemDto. */
export interface FailedSearch {
  query: string;
  searchCount: number;
  averageResults: number;
}

export type TrendFacet = 'profession' | 'state' | 'city' | 'religion';

export const TREND_FACETS: { key: TrendFacet; label: string; icon: string }[] = [
  { key: 'profession', label: 'Profession', icon: 'work' },
  { key: 'state',      label: 'State',      icon: 'map' },
  { key: 'city',       label: 'City',       icon: 'location_city' },
  { key: 'religion',   label: 'Religion',   icon: 'temple_hindu' },
];

/** The controller clamps days to 1-365. */
export const DAY_RANGES: { value: number; label: string }[] = [
  { value: 7,   label: 'Last 7 Days' },
  { value: 30,  label: 'Last 30 Days' },
  { value: 90,  label: 'Last 90 Days' },
  { value: 365, label: 'Last 12 Months' },
];

export type TraitView = 'cloud' | 'chart' | 'table';

/** Fallback-usage band, driving the KPI colour. */
export function fallbackLevel(ratio: number): 'good' | 'warn' | 'bad' {
  if (ratio <= 10) return 'good';
  if (ratio <= 25) return 'warn';
  return 'bad';
}

/**
 * Buckets a trait into one of five sizes for the word cloud, scaled against the
 * highest count in the set so the cloud reads the same whatever the volume.
 */
export function traitWeight(count: number, max: number): 1 | 2 | 3 | 4 | 5 {
  if (max <= 0) return 1;
  const ratio = count / max;
  if (ratio >= 0.85) return 5;
  if (ratio >= 0.6) return 4;
  if (ratio >= 0.4) return 3;
  if (ratio >= 0.2) return 2;
  return 1;
}

/**
 * Heuristic tuning hints for a zero-result query. The API does not return
 * these — they are derived client-side from what the query mentions, to give an
 * admin a concrete starting point rather than a bare row.
 */
export function improvementHints(item: FailedSearch): string[] {
  const q = item.query.toLowerCase();
  const hints: string[] = [];

  const place = /\b(in|from|near)\s+([a-z\s]+)$/.exec(q)?.[2]?.trim();
  if (place) {
    hints.push(`Acquire or import more profiles in ${titleCase(place)}.`);
  }

  if (/\b(in|from|near)\b.*\b(in|from|near)\b/.test(q)) {
    hints.push('Query stacks two locations — the location parser may be splitting it incorrectly.');
  }

  if (q.split(/\s+/).length >= 8) {
    hints.push('Long query: the parser may be over-constraining. Consider relaxing low-signal facets.');
  }

  if (/\b(engineer|developer|doctor|teacher|nurse|lawyer|architect|analyst|designer)\b/.test(q)) {
    hints.push('Check profession extraction — add synonyms for this job title to the dictionary.');
  }

  if (/[a-z]{3,}\s+[a-z]*(?:oriented|minded|loving|caring)\b/.test(q)) {
    hints.push('Personality phrasing detected — verify the trait dictionary covers this wording.');
  }

  if (item.searchCount >= 20) {
    hints.push(`Run ${item.searchCount} times in this window — high demand the catalogue is not meeting.`);
  }

  if (!hints.length) {
    hints.push('No obvious parser gap. Most likely a genuine catalogue gap for these criteria.');
  }

  return hints;
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, c => c.toUpperCase());
}
