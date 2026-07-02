export enum MatchSourceType {
  SUHANA        = 'SUHANA',
  FAMILY        = 'FAMILY',
  RELATIVE      = 'RELATIVE',
  FRIEND        = 'FRIEND',
  SOCIAL_MEDIA  = 'SOCIAL_MEDIA',
  OTHER_MATRIMONY = 'OTHER_MATRIMONY',
  WORKPLACE     = 'WORKPLACE',
  COMMUNITY     = 'COMMUNITY',
  OTHER         = 'OTHER',
}

export enum MatchFixedStatus {
  ACTIVE    = 'ACTIVE',
  CANCELLED = 'CANCELLED',
}

export interface CreateMatchFixedDto {
  matchSourceType: MatchSourceType;
  matchedUserId?: string;
  matchedUserGuid?: string;
  partnerName?: string;
  partnerAge?: number;
  partnerProfession?: string;
  partnerLocation?: string;
  partnerPhotoUrl?: string;
  engagementPhotoUrl?: string;
  weddingPhotoUrl?: string;
  engagementDate?: string;
  marriageDate?: string;
  successStory?: string;
  allowStoryPublish?: boolean;
  allowPhotoPublish?: boolean;
}

export interface UpdateMatchFixedDto extends Partial<CreateMatchFixedDto> {
  status?: MatchFixedStatus;
}

export interface MatchFixedResponse {
  id: string;
  guid: string;
  userId: string;
  matchSourceType: MatchSourceType;
  isMatchFromSuhana: boolean;
  matchedUserId?: string;
  matchedUserGuid?: string;
  partnerName?: string;
  partnerAge?: number;
  partnerProfession?: string;
  partnerLocation?: string;
  partnerPhotoUrl?: string;
  engagementPhotoUrl?: string;
  weddingPhotoUrl?: string;
  engagementDate?: Date;
  marriageDate?: Date;
  successStory?: string;
  allowStoryPublish: boolean;
  allowPhotoPublish: boolean;
  status: MatchFixedStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicStoriesQuery {
  page?: number;
  limit?: number;
  matchSource?: MatchSourceType;
}

export const MATCH_SOURCE_LABELS: Record<MatchSourceType, string> = {
  [MatchSourceType.SUHANA]:          'Through Suhana Matrimony',
  [MatchSourceType.FAMILY]:          'Family',
  [MatchSourceType.RELATIVE]:        'Relative',
  [MatchSourceType.FRIEND]:          'Friend',
  [MatchSourceType.SOCIAL_MEDIA]:    'Social Media',
  [MatchSourceType.OTHER_MATRIMONY]: 'Other Matrimony Site',
  [MatchSourceType.WORKPLACE]:       'Workplace',
  [MatchSourceType.COMMUNITY]:       'Community',
  [MatchSourceType.OTHER]:           'Other',
};
