export type UserRole = 'guest' | 'registered' | 'admin' | 'tester';
export type Gender = 'bride' | 'groom';
export type ProfileStatus = 'active' | 'inactive' | 'pending' | 'reported' | 'blocked';
export type MatchStatus = 'suggested' | 'shortlisted' | 'interested' | 'connected' | 'skipped' | 'reconsidered';
export type PhotoPrivacy = 'everyone' | 'mutual_matches' | 'premium_only' | 'on_request';
export type MembershipTier = 'free' | 'silver' | 'gold' | 'platinum';
export type FamilyType = 'joint' | 'nuclear';
export type FoodPreference = 'vegetarian' | 'non_vegetarian' | 'vegan' | 'eggetarian';

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
  profile?: UserProfile;

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
}

export interface MatchResult {
  id: string;
  profile: UserProfile;
  matchPercentage: number;
  compatibilityBreakdown: CompatibilityBreakdown;
  explanationText: string;
  badges: CompatibilityBadge[];
  status: MatchStatus;
  suggestedAt: Date;
}

export interface CompatibilityBreakdown {
  lifestyle: number;
  education: number;
  location: number;
  familyValues: number;
  interests: number;
  career: number;
  emotional: number;
  horoscope?: number;
}

export interface CompatibilityBadge {
  label: string;
  icon: string;
  score: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: Date;
  isRead: boolean;
  type: 'text' | 'icebreaker' | 'system';
}

export interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: ChatMessage;
  unreadCount: number;
  isUnlocked: boolean;
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