// ── Profile shapes ────────────────────────────────────────────────────────────

export interface HoroscopeMatchResponse {
  profiles: HoroscopeProfiles;
  match: Record<string, unknown>;
  horoscopeReport: HoroscopeReport;
  fromCache: boolean;
}

export interface HoroscopeProfiles {
  userOne: HoroscopeUserProfile;
  userTwo: HoroscopeUserProfile;
}

export interface HoroscopeUserProfile {
  userId: string;
  profileId: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: 'bride' | 'groom';
  religion: string;
  motherTongue: string;
  dateOfBirth: string;
  height: string;
  weight: string;
  complexion: string;
  aboutMe: string;
  familyDetails: HoroscopeFamilyDetails;
  education: HoroscopeEducation;
  occupation: HoroscopeOccupation;
  horoscope: HoroscopeInfo;
  location: HoroscopeLocation;
  photos: HoroscopePhoto[];
}

export interface HoroscopeFamilyDetails {
  familyType: string;
  fatherOccupation: string;
  motherOccupation: string;
  siblings: number;
  familyValues: string;
}

export interface HoroscopeEducation {
  level: string;
  field: string;
  institution: string;
}

export interface HoroscopeOccupation {
  title: string;
  company: string;
  annualIncome: string;
  workingStatus: string;
}

export interface HoroscopeInfo {
  timeOfBirth: string;
  placeOfBirth: string;
  rashi: string;
  nakshatra: string;
  manglikStatus: string;
  documentUrl: string | null;
}

export interface HoroscopeLocation {
  city: string;
  state: string;
  country: string;
  willingToRelocate: boolean;
}

export interface HoroscopePhoto {
  id: string;
  url: string;
  isPrimary: boolean;
  isVerified: boolean;
}

// ── Report shapes ─────────────────────────────────────────────────────────────

export interface HoroscopeReport {
  doshaAnalysis: DoshaAnalysis;
  aiMatchSummary: string;
  kundliMatching: KundliMatching;
  matchStrengths: string[];
  sideByComparison: {
    personOne: SideByComparisonPerson;
    personTwo: SideByComparisonPerson;
  };
  finalRecommendation: FinalRecommendation;
  horoscopeGeneration: HoroscopeGeneration;
  areasForUnderstanding: string[];
  compatibilityDashboard: CompatibilityDashboard;
  planetaryCompatibility: PlanetaryCompatibility;
  advancedAstrologyDetails: AdvancedAstrologyDetails;
}

export interface DoshaEntry {
  detected: boolean;
  remedies: string[];
  severity: string;
  marriageImpact: string;
}

export interface DoshaAnalysis {
  nadi: DoshaEntry;
  shani: DoshaEntry;
  bhakoot: DoshaEntry;
  manglik: DoshaEntry;
  kaalSarp: DoshaEntry;
}

export interface KootaEntry {
  score: number;
  maxScore: number;
  description: string;
}

export interface KundliMatching {
  gana: KootaEntry;
  nadi: KootaEntry;
  tara: KootaEntry;
  yoni: KootaEntry;
  varna: KootaEntry;
  vashya: KootaEntry;
  bhakoot: KootaEntry;
  maxScore: number;
  totalScore: number;
  grahaMaitri: KootaEntry;
  compatibilityCategory: string;
  compatibilityPercentage: number;
}

export interface SideByComparisonPerson {
  name: string;
  rasi: string;
  lagna: string;
  doshas: string[];
  gunaScore: number;
  nakshatra: string;
  manglikStatus: string;
  compatibilityScore: number;
}

export interface FinalRecommendation {
  category: string;
  justification: string;
}

export interface CompatibilityAspect {
  score: number;
  explanation: string;
}

export interface CompatibilityDashboard {
  romance: CompatibilityAspect;
  summary: string;
  category: string;
  emotional: CompatibilityAspect;
  financial: CompatibilityAspect;
  personality: CompatibilityAspect;
  familyValues: CompatibilityAspect;
  overallScore: number;
  communication: CompatibilityAspect;
  marriageStability: CompatibilityAspect;
}

export interface PlanetCompatibilityEntry {
  personOne: string;
  personTwo: string;
  compatibility: string;
}

export interface PlanetaryCompatibility {
  aspects: {
    romance: CompatibilityAspect;
    emotional: CompatibilityAspect;
    financial: CompatibilityAspect;
    personality: CompatibilityAspect;
    familyValues: CompatibilityAspect;
    communication: CompatibilityAspect;
    marriageStability: CompatibilityAspect;
  };
  planets: Record<string, PlanetCompatibilityEntry>;
  confidenceScore: number;
  marriageProspects: string;
}

export interface HoroscopeGenPerson {
  rasi: string;
  lagna: string;
  nakshatra: string;
  birthChart: string;
  navamsaLagna: string;
  housePlacements: Record<string, string>;
  planetPositions: Record<string, string>;
}

export interface HoroscopeGeneration {
  personOne: HoroscopeGenPerson;
  personTwo: HoroscopeGenPerson;
}

export interface AdvancedAstrologyDetails {
  rasiAnalysis: { personOne: string; personTwo: string };
  housePlacements: {
    personOne: Record<string, string>;
    personTwo: Record<string, string>;
  };
  navamsaAnalysis: { personOne: string; personTwo: string };
  planetPositions: Record<string, { personOne: string; personTwo: string }>;
  nakshatraAnalysis: { personOne: string; personTwo: string };
}

// ── Display-layer helper interfaces (used only in the component) ──────────────

export interface KootaDisplay {
  key: string;
  label: string;
  score: number;
  maxScore: number;
  description: string;
}

export interface PlanetDisplay {
  planet: string;
  position: string;
  isRetrograde: boolean;
}

export interface DoshaDisplay {
  key: string;
  label: string;
  entry: DoshaEntry;
}

export interface DashboardAspectDisplay {
  key: string;
  label: string;
  icon: string;
  score: number;
  explanation: string;
}

export interface PlanetComparisonDisplay {
  planet: string;
  personOnePos: string;
  personTwoPos: string;
  compatibility: string;
}

export interface HousePlacementDisplay {
  house: string;
  placement: string;
}
