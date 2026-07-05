export type FeedbackStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'RESOLVED';

export interface Feedback {
  id: string;
  category: string;
  rating: number;
  subject: string;
  message: string;
  status: FeedbackStatus;
  createdBy: string;
  createdByName: string;
  createdByEmail: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackFilter {
  status?: FeedbackStatus;
  search?: string;
  category?: string;
  page?: number;
  limit?: number;
}

export interface FeedbackListResponse {
  data: Feedback[];
  total: number;
  page: number;
  totalPages: number;
}

export interface FeedbackStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  resolved: number;
  avgRating: string;
}

export const FEEDBACK_CATEGORY_LABELS: Record<string, string> = {
  WEBSITE_EXPERIENCE: 'Website Experience',
  PROFILE_MATCHING:   'Profile & Matching',
  MESSAGING:          'Messaging',
  AI_MATCHMAKING:     'AI Matchmaking',
  PREMIUM_BILLING:    'Premium & Billing',
  CUSTOMER_SUPPORT:   'Customer Support',
  FEATURE_REQUEST:    'Feature Request',
  BUG_REPORT:         'Bug Report',
  SUGGESTION:         'Suggestion',
  COMPLAINT:          'Complaint',
  MOBILE_EXPERIENCE:  'Mobile Experience',
  SAFETY_SECURITY:    'Safety & Security',
  PRIVACY_ACCOUNT:    'Privacy & Account',
  SUCCESS_STORY:      'Success Story',
  PROFILE_POSITIVE:   'Positive Feedback',
  PROFILE_NEGATIVE:   'Negative Feedback',
  PROFILE_REPORT:     'Profile Report',
  OTHER:              'Other',
};

export const STATUS_CONFIG: Record<FeedbackStatus, {
  label: string; color: string; bgColor: string; borderColor: string; icon: string;
}> = {
  PENDING:  { label: 'Pending',  color: '#b45309', bgColor: '#fffbeb', borderColor: '#fcd34d', icon: 'schedule' },
  APPROVED: { label: 'Approved', color: '#1d4ed8', bgColor: '#eff6ff', borderColor: '#93c5fd', icon: 'check_circle' },
  REJECTED: { label: 'Rejected', color: '#dc2626', bgColor: '#fef2f2', borderColor: '#fca5a5', icon: 'cancel' },
  RESOLVED: { label: 'Resolved', color: '#15803d', bgColor: '#f0fdf4', borderColor: '#86efac', icon: 'task_alt' },
};
