/**
 * Aurora Discover "For Providers" wire models.
 * Mirrors suhana-api src/modules/discovery/dto/discovery-provider-portal.dto.ts
 * and services/{provider-portal,discovery-ownership}.service.ts.
 */
import { AdminProvider, CountryCode } from '../../discover/models/discover.model';

export type ManagementType = 'ADMIN_MANAGED' | 'PROVIDER_MANAGED';
export type ListingStatus = 'DRAFT' | 'SUBMITTED' | 'CHANGES_REQUESTED' | 'PUBLISHED';
export type ProviderMemberRole = 'OWNER' | 'STAFF';
export type ClaimStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface ProviderRegisterRequest {
  businessName: string;
  firstName: string;
  lastName?: string | null;
  email: string;
  mobile: string;
  password: string;
  categorySlug: string;
  country: CountryCode;
}

export interface ListingChecklist {
  category: boolean;
  location: boolean;
  about: boolean;
  service: boolean;
  photo: boolean;
  contact: boolean;
  readyToSubmit: boolean;
  percent: number;
}

export interface ProviderListingSummary {
  id: string;
  displayName: string;
  businessName: string | null;
  categorySlugs: string[];
  primaryPlace: string | null;
  photoUrl: string | null;
  listingStatus: ListingStatus;
  verificationStatus: string;
  managementType: ManagementType;
  reviewNote: string | null;
  myRole: ProviderMemberRole;
  ratingAvg: number | null;
  ratingCount: number;
  checklist: ListingChecklist;
  updatedAt: string;
}

export interface ListingClaim {
  id: string;
  providerId: string;
  providerName: string | null;
  status: ClaimStatus;
  message: string | null;
  contactName: string | null;
  contactPhone: string | null;
  businessEmail: string | null;
  adminNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  /** Admin view only. */
  claimant?: { userId: string; name: string; email: string };
  listingContact?: { phone: string | null; email: string | null; website: string | null };
}

export interface ProviderDashboard {
  user: { id: string; firstName: string; lastName: string | null; email: string; accountType: 'MEMBER' | 'PROVIDER' };
  listings: ProviderListingSummary[];
  claims: ListingClaim[];
}

/** Provider view of a listing = admin shape minus internal notes, plus role + checklist. */
export type ProviderListing = Omit<AdminProvider, 'verificationNotes'> & {
  myRole: ProviderMemberRole;
  checklist: ListingChecklist;
};

export interface ClaimableListing {
  id: string;
  displayName: string;
  businessName: string | null;
  place: string | null;
  categorySlugs: string[];
  photoUrl: string | null;
  myPendingClaim: boolean;
}

export interface CreateClaimRequest {
  providerId: string;
  message: string;
  contactName?: string | null;
  contactPhone?: string | null;
  businessEmail?: string | null;
}

export type ReviewDecision = 'PUBLISH' | 'REQUEST_CHANGES' | 'REJECT';

export interface ListingOwner {
  userId: string;
  name: string;
  email: string;
  role: string;
}

export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'In review',
  CHANGES_REQUESTED: 'Changes requested',
  PUBLISHED: 'Live',
};

export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  PENDING: 'Pending review',
  APPROVED: 'Approved',
  REJECTED: 'Not approved',
  CANCELLED: 'Withdrawn',
};
