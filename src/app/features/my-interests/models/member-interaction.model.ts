/**
 * Mirrors suhana-api/src/modules/member-interactions/dto/member-interactions.dto.ts
 * (GET /v1/member-interactions[/dashboard]) and the `source` values of
 * suhana-api/src/modules/interests/entity/interest.entity.ts.
 */

/** Where the member found a profile when expressing interest (reporting only). */
export type InterestSource =
  | 'PROFILE_VIEW' | 'PROFILE_SEARCH' | 'AI_MATCH' | 'HOROSCOPE_MATCH' | 'PERSONALITY_MATCH'
  | 'RECOMMENDED_PROFILE' | 'FEATURED_PROFILE' | 'MY_INTERESTS' | 'OTHER';

export type InteractionDirection = 'received' | 'sent';
export type InteractionTypeFilter = 'all' | 'interests' | 'profile_views' | 'messages';
export type InteractionStatusFilter = 'all' | 'new' | 'viewed' | 'pending' | 'accepted' | 'declined' | 'withdrawn';
export type CompatibilityFilter = 'all' | 'horoscope_excellent' | 'horoscope_good' | 'personality_match' | 'ai_recommended' | 'not_available';
export type InteractionSort = 'newest' | 'oldest' | 'compatibility' | 'updated';

export interface InteractionQuery {
  direction: InteractionDirection;
  type: InteractionTypeFilter;
  status: InteractionStatusFilter;
  compatibility: CompatibilityFilter;
  sort: InteractionSort;
  search?: string;
  page: number;
  limit: number;
}

export type InteractionType = 'INTEREST' | 'PROFILE_VIEW' | 'MESSAGE';
export type InteractionStatus = 'new' | 'viewed' | 'pending' | 'accepted' | 'declined' | 'withdrawn' | null;
export type InteractionAction =
  | 'view_profile' | 'accept' | 'decline' | 'withdraw' | 'send_interest' | 'message'
  | 'horoscope' | 'personality' | 'ai_insights' | 'block' | 'report';
export type HoroscopeBucket = 'excellent' | 'good' | 'moderate' | 'low';

export interface InteractionPartner {
  /** Account id — used by /horoscope-match/:matchUserId, block and report. */
  userId: string;
  /** Profile id — used by /profile-view/:id, /profile-match/:id, chat ?profileId= and personality. */
  profileId: string;
  profileCode: string | null;
  name: string;
  age: number | null;
  city: string | null;
  state: string | null;
  country: string | null;
  occupation: string | null;
  education: string | null;
  photoUrl: string | null;
  photoHidden: boolean;
  mobileVerified: boolean;
  photoVerified: boolean;
}

export interface InteractionCompatibility {
  ai: { score: number | null; recommended: boolean };
  horoscope: {
    status: 'analyzed' | 'not_analyzed' | 'not_available';
    totalScore?: number;
    maxScore?: number;
    category?: string;
    bucket?: HoroscopeBucket;
  };
  personality: {
    available: boolean;
    myType: string | null;
    partnerType: string | null;
    score?: number;
    level?: string;
  };
}

export interface InteractionItem {
  key: string;
  type: InteractionType;
  direction: InteractionDirection;
  status: InteractionStatus;
  interestId: string | null;
  message: string | null;
  source: string | null;
  visitCount: number | null;
  unreadCount: number | null;
  occurredAt: string;
  updatedAt: string;
  partner: InteractionPartner;
  compatibility: InteractionCompatibility;
  actions: InteractionAction[];
}

export interface InteractionListResponse {
  data: InteractionItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface InteractionDashboard {
  totalInterestsReceived: number;
  newInterests: number;
  pendingRequests: number;
  acceptedConnections: number;
  profileViews: number;
  newMessages: number;
  sentPending: number;
}

export const DEFAULT_INTERACTION_QUERY: InteractionQuery = {
  direction: 'received',
  type: 'all',
  status: 'all',
  compatibility: 'all',
  sort: 'newest',
  search: '',
  page: 1,
  limit: 12,
};
