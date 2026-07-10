export interface ChatProfileHoroscope {
  rashi?:         string;
  nakshatra?:     string;
  manglikStatus?: string;
}

export interface ChatProfilePhoto {
  id:        string;
  url:       string;
  isPrimary: boolean;
}

export interface ChatProfileBadge {
  label: string;
  icon:  string;
  score: number;
}

export interface ChatProfileSummary {
  userId:                 string; // Profile id — used with /profile-view/:id
  firstName:              string;
  lastName:               string;
  age:                    number;
  gender:                 string;
  religion:               string;
  caste?:                 string;
  motherTongue:           string;
  height?:                string;
  location:               { city: string; state: string; country: string };
  education:              { level: string; field?: string };
  occupation:             { title: string };
  horoscope?:             ChatProfileHoroscope;
  photos:                 ChatProfilePhoto[];
  matchPercentage:        number;
  compatibilityBreakdown: Record<string, number>;
  badges:                 ChatProfileBadge[];
}
