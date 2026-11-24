/**
 * Aurora Discover wire models.
 * Mirrors suhana-api/src/modules/discovery/dto/{discovery-search,discovery-detail,discovery-admin}.dto.ts
 * and the admin service's AdminProviderDto / AdminProviderSummaryDto.
 */

export type DistanceUnit = 'mi' | 'km';
export type CountryCode = 'US' | 'IN';
export type RadiusOption = '5' | '10' | '25' | '50' | '100' | 'all';
export type ConsultationMode = 'IN_PERSON' | 'PHONE' | 'VIDEO';
export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';
export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'HIDDEN';
export type DiscoverSort = 'recommended' | 'nearest' | 'rating' | 'experience' | 'price_asc' | 'price_desc';

export interface DiscoverCategory {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  kind: 'SERVICE' | 'PRODUCT';
  icon: string | null;
  imageUrl: string | null;
  /** false = "Coming soon". */
  isActive: boolean;
  displayOrder: number;
}

// ── Search ────────────────────────────────────────────────────────────────

/** Query sent to GET /discovery/astrologers (all optional). */
export interface DiscoverSearchQuery {
  country?: CountryCode;
  postalCode?: string;
  city?: string;
  state?: string;
  /** Device location — only after an explicit click; rounded to 2 dp before sending; never put in the URL. */
  lat?: number;
  lng?: number;
  radius?: RadiusOption;
  unit?: DistanceUnit;
  language?: string[];
  consultationMode?: ConsultationMode[];
  minRating?: number;
  minPrice?: number;
  maxPrice?: number;
  verifiedOnly?: boolean;
  q?: string;
  sortBy?: DiscoverSort;
  page?: number;
  limit?: number;
  /** Category specialty codes (any of). */
  specialization?: string[];
  minExperience?: number;
  /** Minimum guest capacity (marriage halls, catering). */
  minCapacity?: number;
}

export interface Distance {
  value: number;
  unit: DistanceUnit;
}

export interface Money {
  amount: number;
  currency: string;
}

export interface ProviderPlace {
  city: string;
  state: string | null;
  country: string;
  /** Only when the listing shows its street address. */
  postalCode: string | null;
  /** Full street address, only when shown publicly (drives "Directions"). */
  address: string | null;
}

export interface RatingSummary {
  /** null when there are no approved reviews. */
  average: number | null;
  count: number;
}

export interface AstrologerSummary {
  experienceYears: number | null;
  specializations: string[];
}

/** Uniform category details, every category (attributes are as stated by the provider). */
export interface CategoryDetailsSummary {
  experienceYears: number | null;
  specialties: string[];
  attributes: Record<string, number | boolean | string>;
}

export interface ProviderCard {
  id: string;
  categorySlug: string;
  displayName: string;
  businessName: string | null;
  headline: string | null;
  photoUrl: string | null;
  /** Business listing verified by Aurora (verificationStatus === VERIFIED). Not a qualification check. */
  isVerified: boolean;
  acceptingClients: boolean;
  rating: RatingSummary;
  distance: Distance | null;
  place: ProviderPlace | null;
  locationCount: number;
  languages: string[];
  consultationModes: ConsultationMode[];
  startingPrice: Money | null;
  astrologer: AstrologerSummary | null;
  details: CategoryDetailsSummary | null;
  isFavorite: boolean;
}

export interface SearchOrigin {
  type: 'point' | 'area' | 'none';
  label: string;
  country: string | null;
  unit: DistanceUnit;
  radius: number | null;
}

export interface RankingInfo {
  requested: DiscoverSort;
  applied: DiscoverSort;
  description: string;
  factors?: Record<string, number>;
  notice: string | null;
}

export interface ProviderSearchResponse {
  items: ProviderCard[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  origin: SearchOrigin;
  ranking: RankingInfo;
}

// ── Detail ────────────────────────────────────────────────────────────────

export interface ServiceOffering {
  id: string;
  name: string;
  specialization: string | null;
  consultationMode: ConsultationMode;
  /** null = price on request. */
  price: number | null;
  currency: string | null;
  durationMinutes: number | null;
  description: string | null;
}

export interface ProviderLocation extends ProviderPlace {
  id: string;
  label: string | null;
  isPrimary: boolean;
}

export interface Certification {
  name: string;
  issuer: string | null;
  year: number | null;
  /** Credential itself checked by Aurora (separate from listing verification). */
  verified: boolean;
}

export interface BusinessHours {
  day: string;
  open: string;
  close: string;
}

export interface AstrologerDetail {
  experienceYears: number | null;
  specializations: string[];
  businessHours: BusinessHours[];
  certifications: Certification[];
  availabilityNote: string | null;
}

export interface ServiceDetail extends CategoryDetailsSummary {
  businessHours: BusinessHours[];
  certifications: Certification[];
  availabilityNote: string | null;
}

export interface ProviderMedia {
  id: string;
  url: string;
  caption: string | null;
}

export interface ProviderDetail extends ProviderCard {
  about: string | null;
  verificationStatus: VerificationStatus;
  verifiedAt: string | null;
  locations: ProviderLocation[];
  services: ServiceOffering[];
  gallery: ProviderMedia[];
  astrologerDetail: AstrologerDetail | null;
  serviceDetail: ServiceDetail | null;
  contactChannels: { phone: boolean; email: boolean; website: boolean };
}

export interface ProviderContact {
  phone: string | null;
  email: string | null;
  website: string | null;
}

// ── Reviews / favorites ───────────────────────────────────────────────────

export interface DiscoverReview {
  id: string;
  rating: number;
  title: string | null;
  comment: string;
  authorName: string;
  createdAt: string;
  status: ReviewStatus;
  isMine: boolean;
}

export interface DiscoverReviewList {
  items: DiscoverReview[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  myReview: DiscoverReview | null;
}

export interface CreateReviewRequest {
  rating: number;
  title?: string;
  comment: string;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FavoriteResult {
  providerId: string;
  isFavorite: boolean;
}

// ── Admin ─────────────────────────────────────────────────────────────────

export interface AdminLocation {
  id: string;
  label: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string;
  state: string | null;
  postalCode: string | null;
  country: CountryCode;
  latitude: number | null;
  longitude: number | null;
  showStreetAddress: boolean;
  isPrimary: boolean;
  isActive: boolean;
}

export type LocationInput = Omit<AdminLocation, 'id' | 'latitude' | 'longitude'> & {
  latitude?: number | null;
  longitude?: number | null;
};

export interface ServiceInput {
  id?: string;
  name: string;
  specialization: string | null;
  consultationMode: ConsultationMode;
  price: number | null;
  currency: string | null;
  durationMinutes: number | null;
  description: string | null;
  isActive: boolean;
}

export interface AstrologerDetailInput {
  experienceYears: number | null;
  specializations: string[];
  businessHours: BusinessHours[];
  certifications: Certification[];
  availabilityNote: string | null;
}

export interface CategoryDetailInput {
  categorySlug: string;
  experienceYears: number | null;
  specialties: string[];
  attributes: Record<string, number | boolean | string>;
  businessHours?: BusinessHours[];
  certifications?: Certification[];
  availabilityNote?: string | null;
}

export interface ProviderInput {
  displayName: string;
  businessName: string | null;
  headline: string | null;
  about: string | null;
  photoUrl: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  isActive: boolean;
  acceptingClients: boolean;
  categorySlugs: string[];
  languages: string[];
  services: ServiceInput[];
  astrologer?: AstrologerDetailInput;
  categoryDetails?: CategoryDetailInput[];
  /** Create only — afterwards locations use their own endpoints. */
  locations?: LocationInput[];
}

export type GeocodeSource = 'manual' | 'postal' | 'city' | 'none';

export interface AdminProvider {
  id: string;
  userId: string | null;
  displayName: string;
  businessName: string | null;
  headline: string | null;
  about: string | null;
  photoUrl: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  verificationStatus: VerificationStatus;
  verificationNotes: string | null;
  verifiedAt: string | null;
  isActive: boolean;
  acceptingClients: boolean;
  ratingAvg: number | null;
  ratingCount: number;
  categorySlugs: string[];
  languages: string[];
  locations: AdminLocation[];
  services: (ServiceInput & { id: string; displayOrder: number })[];
  media: { id: string; url: string; caption: string | null; displayOrder: number }[];
  astrologer?: AstrologerDetailInput;
  categoryDetails?: CategoryDetailInput[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  geocoding?: { city: string; source: GeocodeSource }[];
}

export interface AdminProviderSummary {
  id: string;
  displayName: string;
  businessName: string | null;
  verificationStatus: VerificationStatus;
  isActive: boolean;
  categorySlugs: string[];
  primaryPlace: string | null;
  locationCount: number;
  missingCoordinates: boolean;
  ratingAvg: number | null;
  ratingCount: number;
  updatedAt: string;
  deletedAt: string | null;
}

export interface AdminProviderQuery {
  q?: string;
  category?: string;
  status?: VerificationStatus;
  country?: CountryCode;
  includeDeleted?: boolean;
  page?: number;
  limit?: number;
}

export interface AdminReview extends DiscoverReview {
  providerId: string;
  providerName: string | null;
  userId: string;
  moderationNote: string | null;
  moderatedAt: string | null;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  label: string;
  country: string;
  state: string | null;
  city: string | null;
  postalCode: string | null;
}
