export type UserRole = 'guest' | 'registered' | 'admin' | 'tester';
export type Gender = 'bride' | 'groom';
export type ProfileStatus = 'active' | 'inactive' | 'pending' | 'reported' | 'blocked';
export type MatchStatus = 'suggested' | 'shortlisted' | 'interested' | 'connected' | 'skipped' | 'reconsidered';
export type PhotoPrivacy = 'everyone' | 'mutual_matches' | 'premium_only' | 'on_request';
export type MembershipTier = 'free' | 'silver' | 'gold' | 'platinum';
export type FamilyType = 'joint' | 'nuclear';
export type FoodPreference = 'vegetarian' | 'non_vegetarian' | 'vegan' | 'eggetarian';
export type MessageDeliveryStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
export type AttachmentType = 'image' | 'video' | 'audio' | 'document';
export type CallType = 'audio' | 'video';
export type CallStatus = 'initiated' | 'ringing' | 'connected' | 'ended' | 'missed' | 'declined';
export type InterestStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  mobile?: string;
  role: UserRole;
  gender: Gender;
  membership: MembershipTier;
  createdAt: Date;
  lastActive: Date;
  isVerified?: boolean;
  is_email_verified?: boolean;
  profile?: UserProfile;
  tempGuid?: string;
}

export interface UserProfile {
  userId: string;
  firstName: string;
  lastName: string;
  age: number;
  dateOfBirth: Date;
  gender: Gender;
  religion: string;
  caste?: string;
  motherTongue: string;
  location: Location;
  education: Education;
  occupation: Occupation;
  height: string;
  weight?: string;
  complexion?: string;
  aboutMe: string;
  photos: ProfilePhoto[];
  videoIntroUrl?: string;
  familyDetails: FamilyDetails;
  preferences: MatchPreferences;
  horoscope?: HoroscopeDetails;
  photoPrivacy: PhotoPrivacy;
  status: ProfileStatus;
  profileCompleteness: number;
  profileCode?: string;
  isProfileVerified?: boolean;
  isProfileLocked?: boolean;
  isProfileReported?: boolean;
  isProfileBlocked?: boolean;
  isPremiumMember?: boolean;
  lastActive?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  tempGuid?: string;
  user?: User;
}

export interface Location {
  city: string;
  state: string;
  country: string;
  willingToRelocate: boolean;
}

export interface Education {
  level: string;
  field: string;
  institution?: string;
}

export interface Occupation {
  title: string;
  company?: string;
  annualIncome?: string;
  workingStatus: string;
}

export interface ProfilePhoto {
  id: string;
  url: string;
  isPrimary: boolean;
  isVerified: boolean;
}

export interface FamilyDetails {
  familyType: FamilyType;
  fatherOccupation?: string;
  motherOccupation?: string;
  siblings?: number;
  familyValues?: string;
  familyPreferenceNote?: string;
}

export interface MatchPreferences {
  ageRange: { min: number; max: number };
  heightRange?: { min: string; max: string };
  religions?: string[];
  castes?: string[];
  education?: string[];
  occupations?: string[];
  locations?: string[];
  foodPreference?: FoodPreference;
  familyType?: FamilyType;
}

export interface HoroscopeDetails {
  dateOfBirth: Date;
  timeOfBirth?: string;
  placeOfBirth?: string;
  rashi?: string;
  nakshatra?: string;
  manglikStatus?: string;
  documentUrl?: string;
}

export interface MatchResult {
  id: string;
  userId: string;
  matchedUserId?: string;
  profile: UserProfile;
  matchPercentage: number;
  compatibilityBreakdown: CompatibilityBreakdown;
  explanationText: string;
  badges: CompatibilityBadge[];
  status: MatchStatus;
  suggestedAt: Date;
}

export interface CompatibilityBreakdown {
  ageGap: number;
  income: number;
  lifestyle: number;
  education: number;
  location: number;
  familyValues: number;
  interests: number;
  career: number;
  emotional: number;
  horoscope?: number;
  religion: number;
  motherTongue: number;
}

export interface CompatibilityBadge {
  label: string;
  icon: string;
  score: number;
}

export interface ChatAttachment {
  id: string;
  type: AttachmentType;
  url: string;
  name: string;
  size: number;
  mimeType: string;
  thumbnailUrl?: string;
}

export interface MessageReaction {
  emoji: string;
  userId: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: Date;
  isRead: boolean;
  type: 'text' | 'icebreaker' | 'system' | 'attachment';
  deliveryStatus?: MessageDeliveryStatus;
  attachments?: ChatAttachment[];
  reactions?: MessageReaction[];
  deletedAt?: Date;
}

export interface InterestRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  fromProfile?: UserProfile;
  toProfile?: UserProfile;
  fromUser?: User;
  toUser?: User;
  message?: string;
  status: InterestStatus;
  sentAt: Date;
  respondedAt?: Date;
}

export interface CallRecord {
  id: string;
  conversationId: string;
  initiatorId: string;
  receiverId: string;
  type: CallType;
  status: CallStatus;
  duration?: number;
  startedAt: Date;
  endedAt?: Date;
}

export interface Conversation {
  id: string;
  participants: string[];
  partnerProfile?: UserProfile;
  lastMessage?: ChatMessage;
  unreadCount: number;
  isUnlocked: boolean;
  isOnline?: boolean;
  isTyping?: boolean;
  lastSeen?: Date;
}

export interface MatchTracker {
  matchId: string;
  steps: MatchStep[];
  currentStep: number;
}

export interface MatchStep {
  label: string;
  status: 'completed' | 'active' | 'pending';
  timestamp?: Date;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalMatches: number;
  successfulConnections: number;
  reportedProfiles: number;
  premiumUsers: number;
  newRegistrationsToday: number;
  pendingProfiles?: number;
  blockedProfiles?: number;
}

export interface BannerSlide {
  id: number;
  imageUrl: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
}

export interface Testimonial {
  id: number;
  name: string;
  partnerName: string;
  photo: string;
  quote: string;
  matchDate: string;
}

export interface PremiumPlan {
  id: string;
  name: string;
  tier: MembershipTier;
  price: number;
  duration: string;
  features: string[];
  isPopular: boolean;
}

export interface UserToken {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  access_token: string;
}