export enum ReviewType {
  GENERAL          = 'GENERAL',
  MATCHMAKING      = 'MATCHMAKING',
  MEMBERSHIP       = 'MEMBERSHIP',
  CUSTOMER_SUPPORT = 'CUSTOMER_SUPPORT',
  SUCCESS_STORY    = 'SUCCESS_STORY',
}

export enum ReviewStatus {
  PENDING  = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  HIDDEN   = 'HIDDEN',
}

export enum ReviewSentiment {
  POSITIVE = 'POSITIVE',
  NEUTRAL  = 'NEUTRAL',
  NEGATIVE = 'NEGATIVE',
}

export enum ReplyStatus {
  PENDING  = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum ReportReason {
  SPAM               = 'SPAM',
  ABUSE              = 'ABUSE',
  FAKE_REVIEW        = 'FAKE_REVIEW',
  OFFENSIVE_LANGUAGE = 'OFFENSIVE_LANGUAGE',
  OTHER              = 'OTHER',
}

export enum ReportStatus {
  OPEN         = 'OPEN',
  UNDER_REVIEW = 'UNDER_REVIEW',
  RESOLVED     = 'RESOLVED',
  DISMISSED    = 'DISMISSED',
}

export enum SuccessStoryStatus {
  PENDING  = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum MarriageVerificationStatus {
  PENDING  = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export enum ReviewSort {
  LATEST       = 'latest',
  OLDEST       = 'oldest',
  MOST_LIKED   = 'mostLiked',
  HIGHEST_RATED = 'highestRated',
}
