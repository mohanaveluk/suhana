import { Injectable, signal, computed, inject } from '@angular/core';
import { ProfileService } from './profile.service';
import { ApiService } from './api.service';
import {
  MatchResult, CompatibilityBreakdown, CompatibilityBadge,
  UserProfile, MatchStatus,
} from '../models/user.model';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MatchService {
  private readonly profileService = inject(ProfileService);
  private readonly api = inject(ApiService);
  private readonly matchResults = signal<MatchResult[]>([]);
  private readonly shortlistedIds = signal<Set<string>>(new Set());

  readonly matches = this.matchResults.asReadonly();
  readonly shortlisted = computed(() =>
    this.matchResults().filter(m => this.shortlistedIds().has(m.id))
  );
  readonly suggestedMatches = computed(() =>
    this.matchResults().filter(m => m.status === 'suggested' || m.status === 'shortlisted')
  );

  async generateMatchesFromApi(count = 4): Promise<MatchResult[]> {
    try {
      const results = await firstValueFrom(this.api.generateMatches(count));
      this.matchResults.set(Array.isArray(results) ? results : []);
      return this.matchResults();
    } catch {
      return this.generateMatches('bride', count);
    }
  }

  async loadMatchesFromApi(): Promise<void> {
    try {
      const results = await firstValueFrom(this.api.getMatches());
      this.matchResults.set(Array.isArray(results) ? results : []);
    } catch { /* keep local */ }
  }

  generateMatches(forGender: 'bride' | 'groom', count = 4): MatchResult[] {
    const oppositeGender = forGender === 'bride' ? 'groom' : 'bride';
    const profiles = this.profileService.getProfiles()
      .filter(p => p.gender === oppositeGender && p.status === 'active');
    const shuffled = [...profiles].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count);
    const results = selected.map(profile => this.computeMatch(profile));
    results.sort((a, b) => b.matchPercentage - a.matchPercentage);
    this.matchResults.set(results);
    return results;
  }

  loadAllMatches(forGender: 'bride' | 'groom'): void {
    const oppositeGender = forGender === 'bride' ? 'groom' : 'bride';
    const profiles = this.profileService.getProfiles()
      .filter(p => p.gender === oppositeGender && p.status === 'active');
    const results = profiles.map(profile => this.computeMatch(profile));
    results.sort((a, b) => b.matchPercentage - a.matchPercentage);
    this.matchResults.set(results);
  }

  shortlist(matchId: string): void {
    this.shortlistedIds.update(set => { const s = new Set(set); s.add(matchId); return s; });
    this.updateMatchStatus(matchId, 'shortlisted');
    this.api.updateMatchStatus(matchId, 'shortlisted').subscribe({ error: () => {} });
  }

  removeShortlist(matchId: string): void {
    this.shortlistedIds.update(set => { const s = new Set(set); s.delete(matchId); return s; });
    this.updateMatchStatus(matchId, 'suggested');
  }

  expressInterest(matchId: string): void {
    this.updateMatchStatus(matchId, 'interested');
    this.api.updateMatchStatus(matchId, 'interested').subscribe({ error: () => {} });
  }

  connect(matchId: string): void {
    this.updateMatchStatus(matchId, 'connected');
    this.api.updateMatchStatus(matchId, 'connected').subscribe({ error: () => {} });
  }

  skip(matchId: string): void {
    this.updateMatchStatus(matchId, 'skipped');
    this.api.updateMatchStatus(matchId, 'skipped').subscribe({ error: () => {} });
  }

  reconsider(matchId: string): void {
    this.updateMatchStatus(matchId, 'reconsidered');
    this.api.updateMatchStatus(matchId, 'reconsidered').subscribe({ error: () => {} });
  }

  isShortlisted(matchId: string): boolean {
    return this.shortlistedIds().has(matchId);
  }

  private updateMatchStatus(matchId: string, status: MatchStatus): void {
    this.matchResults.update(matches =>
      matches.map(m => m.id === matchId ? { ...m, status } : m)
    );
  }

  private computeMatch(profile: UserProfile): MatchResult {
    const breakdown = this.calculateCompatibility(profile);
    const totalScore = this.calculateTotalScore(breakdown);
    const badges = this.generateBadges(breakdown);
    const explanation = this.generateExplanation(profile, breakdown);
    return {
      id: `match_${profile.userId}`, profile, matchPercentage: totalScore,
      compatibilityBreakdown: breakdown, explanationText: explanation,
      badges, status: 'suggested', suggestedAt: new Date(),
    };
  }

  private calculateCompatibility(profile: UserProfile): CompatibilityBreakdown {
    const seed = profile.userId.charCodeAt(profile.userId.length - 1);
    return {
      lifestyle: 60 + ((seed * 7) % 40), education: 55 + ((seed * 11) % 45),
      location: 50 + ((seed * 13) % 50), familyValues: 65 + ((seed * 3) % 35),
      interests: 58 + ((seed * 17) % 42), career: 62 + ((seed * 5) % 38),
      emotional: 55 + ((seed * 19) % 45), horoscope: 50 + ((seed * 23) % 50),
    };
  }

  private calculateTotalScore(breakdown: CompatibilityBreakdown): number {
    const weights = { lifestyle: 0.15, education: 0.15, location: 0.1, familyValues: 0.2, interests: 0.15, career: 0.1, emotional: 0.1, horoscope: 0.05 };
    let score = 0;
    for (const [key, weight] of Object.entries(weights)) {
      score += (breakdown[key as keyof CompatibilityBreakdown] ?? 0) * weight;
    }
    return Math.round(Math.min(99, Math.max(50, score)));
  }

  private generateBadges(breakdown: CompatibilityBreakdown): CompatibilityBadge[] {
    const badges: CompatibilityBadge[] = [];
    if (breakdown.lifestyle >= 80) badges.push({ label: 'Lifestyle Match', icon: 'favorite', score: breakdown.lifestyle });
    if (breakdown.familyValues >= 80) badges.push({ label: 'Family Vibes', icon: 'family_restroom', score: breakdown.familyValues });
    if (breakdown.emotional >= 80) badges.push({ label: 'Emotional Compatibility', icon: 'psychology', score: breakdown.emotional });
    if (breakdown.education >= 80) badges.push({ label: 'Education Match', icon: 'school', score: breakdown.education });
    if (breakdown.career >= 80) badges.push({ label: 'Career Aligned', icon: 'work', score: breakdown.career });
    if (breakdown.interests >= 80) badges.push({ label: 'Shared Interests', icon: 'interests', score: breakdown.interests });
    if (breakdown.location >= 80) badges.push({ label: 'Location Match', icon: 'location_on', score: breakdown.location });
    if ((breakdown.horoscope ?? 0) >= 80) badges.push({ label: 'Horoscope Match', icon: 'auto_awesome', score: breakdown.horoscope ?? 0 });
    return badges;
  }

  private generateExplanation(profile: UserProfile, breakdown: CompatibilityBreakdown): string {
    const factors: string[] = [];
    if (breakdown.education >= 75) factors.push('education background');
    if (breakdown.lifestyle >= 75) factors.push('lifestyle preferences');
    if (breakdown.familyValues >= 75) factors.push('family values');
    if (breakdown.location >= 75) factors.push('location preference');
    if (breakdown.interests >= 75) factors.push('shared interests');
    if (breakdown.career >= 75) factors.push('career ambitions');
    if (breakdown.emotional >= 75) factors.push('emotional compatibility');
    if (factors.length === 0) factors.push('overall profile compatibility');
    return `You and ${profile.firstName} match well on ${factors.join(', ')}.`;
  }
}
