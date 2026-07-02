import { MatchSourceType } from './match-fixed.model';

export interface SuccessStoryResponse {
  id: string;
  userName: string;
  partnerName: string;
  profileImageUrl?: string;
  partnerPhotoUrl?: string;
  engagementPhotoUrl?: string;
  weddingPhotoUrl?: string;
  successStory?: string;
  engagementDate?: Date;
  marriageDate?: Date;
  matchSource: MatchSourceType;
  isVerified: boolean;
  verifiedAt?: Date;
  createdAt: Date;
}

export interface PaginatedSuccessStories {
  data: SuccessStoryResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
