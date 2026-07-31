import {
  MarriageVerificationStatus,
  ReplyStatus,
  ReportReason,
  ReportStatus,
  ReviewSentiment,
  ReviewSort,
  ReviewStatus,
  ReviewType,
} from '../enums/testimonial.enum';

// ── Author embedded in review/reply responses ─────────────────────────────────
export interface ReviewAuthor {
  userId: string;
  name: string;
  profileImage: string | null;
}

// ── Core review ───────────────────────────────────────────────────────────────
export interface Review {
  id: string;
  userId: string;
  profileId: string | null;
  reviewType: ReviewType;
  title: string;
  reviewText: string;
  overallRating: number;
  easeOfUseRating: number | null;
  matchQualityRating: number | null;
  communicationRating: number | null;
  customerSupportRating: number | null;
  trustSafetyRating: number | null;
  sentiment: ReviewSentiment | null;
  isVerifiedReview: boolean;
  status: ReviewStatus;
  isFeatured: boolean;
  featuredOrder: number | null;
  likeCount: number;
  replyCount: number;
  reportCount: number;
  viewCount: number;
  adminNotes: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  // Enriched by service
  author?: ReviewAuthor | null;
  likedByViewer?: boolean;
  replies?: ReviewReply[];
}

// ── Reply (nested tree via children[]) ───────────────────────────────────────
export interface ReviewReply {
  id: string;
  reviewId: string;
  parentReplyId: string | null;
  userId: string | null;
  adminId: string | null;
  replyText: string;
  status: ReplyStatus;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  children?: ReviewReply[];
  author?: ReviewAuthor | null;
}

// ── Report ────────────────────────────────────────────────────────────────────
export interface ReviewReport {
  id: string;
  reviewId: string;
  reportedBy: string;
  reason: ReportReason;
  comments: string | null;
  status: ReportStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Stats (from GET /public/stats) ────────────────────────────────────────────
export interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  fiveStar: number;
  fourStar: number;
  threeStar: number;
  twoStar: number;
  oneStar: number;
}

// ── Admin dashboard ──────────────────────────────────────────────────────────
export interface AdminDashboardMetrics {
  pendingReviews: number;
  approvedReviews: number;
  featuredReviews: number;
  averageRating: number;
  reportedReviews: number;
  totalReplies: number;
  totalLikes: number;
}

// ── Request DTOs (Angular-side) ───────────────────────────────────────────────
export interface CreateReviewRequest {
  reviewType?: ReviewType;
  title: string;
  reviewText: string;
  overallRating: number;
  easeOfUseRating?: number;
  matchQualityRating?: number;
  communicationRating?: number;
  customerSupportRating?: number;
  trustSafetyRating?: number;
  profileId?: string;
}

export type UpdateReviewRequest = Partial<CreateReviewRequest>;

export interface PublicReviewQuery {
  reviewType?: ReviewType;
  rating?: number;
  sort?: ReviewSort;
  keyword?: string;
  page?: number;
  limit?: number;
}

export interface CreateReplyRequest {
  replyText: string;
}

export interface ReportReviewRequest {
  reason: ReportReason;
  comments?: string;
}

export interface RejectReviewRequest {
  adminNotes?: string;
}

export interface FeatureReviewRequest {
  featured: boolean;
  featuredOrder?: number;
}

export interface ResolveReportRequest {
  status?: ReportStatus;
}

export interface AdminReportsQuery {
  status?: ReportStatus;
  page?: number;
  limit?: number;
}

export interface AdminAllReviewsQuery {
  status?: ReviewStatus;
  featured?: boolean;
  reviewType?: ReviewType;
  minRating?: number;
  maxRating?: number;
  page?: number;
  limit?: number;
  sort?: ReviewSort;
}

export interface ReviewReorderItem {
  reviewId: string;
  featuredOrder: number;
}
