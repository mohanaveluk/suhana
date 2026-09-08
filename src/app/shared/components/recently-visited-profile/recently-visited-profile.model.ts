/**
 * 'list' is accepted for forward-compatibility with the standalone Recently
 * Visited page's planned list view, but renders as 'grid' for now — a distinct
 * row layout (profile code, visit count, last-viewed columns) is a follow-up.
 */
export type RecentlyVisitedViewMode = 'carousel' | 'grid' | 'list';
