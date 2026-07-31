import { MarriageVerificationStatus, SuccessStoryStatus } from '../enums/testimonial.enum';

// ── Core entity ───────────────────────────────────────────────────────────────
export interface SuccessStory {
  id: string;
  groomProfileId: string | null;
  brideProfileId: string | null;
  groomName: string;
  brideName: string;
  title: string;
  story: string;
  engagementDate: string | null;
  marriageDate: string | null;
  photoUrl: string | null;
  galleryUrls: string[] | null;
  location: string | null;
  isFeatured: boolean;
  status: SuccessStoryStatus;
  weddingPhotoUrl: string | null;
  weddingInvitationUrl: string | null;
  marriageCertificateUrl: string | null;
  marriageVerificationStatus: MarriageVerificationStatus;
  verifiedMarriage: boolean;
  verifiedBy: string | null;
  verifiedAt: string | null;
  createdBy: string;
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

// ── Request DTOs ──────────────────────────────────────────────────────────────
export interface CreateSuccessStoryRequest {
  groomName: string;
  brideName: string;
  groomProfileId?: string;
  brideProfileId?: string;
  title: string;
  story: string;
  engagementDate?: string;
  marriageDate?: string;
  photoUrl?: string;
  galleryUrls?: string[];
  location?: string;
  weddingPhotoUrl?: string;
  weddingInvitationUrl?: string;
  marriageCertificateUrl?: string;
}

export interface PublicSuccessStoryQuery {
  verifiedOnly?: boolean;
  page?: number;
  limit?: number;
}

export interface VerifyMarriageRequest {
  verified: boolean;
  notes?: string;
}

export interface VerifyMarriageResponse {
  id: string;
  marriageVerificationStatus: MarriageVerificationStatus;
  verifiedMarriage: boolean;
  badge: string | null;
}
