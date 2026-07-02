export interface SuccessStatsResponse {
  totalMatchFixed: number;
  totalMarried: number;
  suhanaMatches: number;
  externalMatches: number;
  verifiedStories: number;
}

export interface AdminDashboardResponse {
  totalMatchesFixed: number;
  matchesThroughSuhana: number;
  matchesOutsideSuhana: number;
  engagedCount: number;
  marriedCount: number;
  successRate: number;
  verifiedSuccessStories: number;
  publishedStories: number;
}
