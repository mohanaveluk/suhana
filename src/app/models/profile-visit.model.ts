// ─────────────────────────────────────────────────────────────────────────────
// Wire models — mirror suhana-api/src/modules/profile-visits/dto/*.ts
// ─────────────────────────────────────────────────────────────────────────────

/** One entry in the authenticated member's recently/frequently visited list. */
export interface ProfileVisit {
  profileId: string;
  profileCode: string | null;
  firstName: string;
  lastName: string | null;
  /** Convenience full name, already assembled server-side. */
  name: string;
  age: number | null;
  city: string | null;
  state: string | null;
  gender: string | null;
  /** Primary active photo URL, or null. */
  photoUrl: string | null;
  visitCount: number;
  lastVisitedAt: string;
  firstVisitedAt: string;
  /**
   * Status of any existing match row from the visitor to this profile
   * (suggested | shortlisted | interested | connected | skipped | reconsidered), or null.
   */
  matchStatus: string | null;
}

export interface PaginatedProfileVisits {
  data: ProfileVisit[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** GET /v1/profile-visits/stats */
export interface VisitStats {
  totalVisitedProfiles: number;
  visitedToday: number;
  visitedThisWeek: number;
}

/** Shape returned by both DELETE endpoints. */
export interface ProfileVisitMutationResult {
  success: boolean;
  message: string;
  affected: number;
}
