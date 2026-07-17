import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialModule } from '../../shared/modules/material.module';
import { ProfileService } from '../../services/profile.service';
import { MatchService } from '../../services/match.service';
import { AuthService } from '../../services/auth.service';
import { InterestService } from '../../services/interest.service';
import { UserProfile } from '../../models/user.model';
import { GalleryService } from '../../services';
import { firstValueFrom } from 'rxjs';
import { GalleryImage } from '../../models';
import { ImageViewerDialogComponent } from '../../features/match-fixed/image-viewer-dialog/image-viewer-dialog.component';
import { GalleryImageData } from '../../models/gallery.model';
import { MatDialog } from '@angular/material/dialog';
import { PdfReportService } from './pdf-report.service';
import { HoroscopeMatchService } from '../horoscope-match/horoscope-match.service';
import { KundliMatching } from '../horoscope-match/horoscope-match.model';

// ─────────────────────────────────────────────────────────────────────────────
// Interfaces & Types
// ─────────────────────────────────────────────────────────────────────────────

export type MatchLevel = 'excellent' | 'suggested' | 'moderate' | 'low';
export type ScoreLevel = 'excellent' | 'good' | 'average' | 'low';

export interface MatchCategory {
  key: string;
  title: string;
  icon: string;
  percentage: number;
  level: ScoreLevel;
  color: string;
  progressColor: string;
  explanation: string;
  myValue: string;
  theirValue: string;
  weight: number;
}

export interface ProfileMatchReport {
  overallPercentage: number;
  matchLevel: MatchLevel;
  matchLabel: string;
  badgeColor: string;
  categories: MatchCategory[];
  commonInterests: string[];
  strengthAreas: string[];
  weakAreas: string[];
  recommendation: string;
  reportGeneratedAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Match Engine – Pure Utility Functions
// ─────────────────────────────────────────────────────────────────────────────

const EDUCATION_RANK: Record<string, number> = {
  'High School': 1, 'Diploma': 2, "Bachelor's": 3,
  'Engineering': 3, 'Medical': 4, 'MBA': 4, "Master's": 4, 'PhD': 5,
};

function scoreLevel(pct: number): ScoreLevel {
  if (pct >= 85) return 'excellent';
  if (pct >= 70) return 'good';
  if (pct >= 55) return 'average';
  return 'low';
}

function scoreColor(pct: number): string {
  if (pct >= 85) return '#4caf50';
  if (pct >= 70) return '#2196f3';
  if (pct >= 55) return '#ff9800';
  return '#f44336';
}

function progressColor(pct: number): string {
  if (pct >= 85) return 'primary';
  if (pct >= 70) return 'accent';
  return 'warn';
}

function computeEducation(a: UserProfile, b: UserProfile) {
  const rankA = EDUCATION_RANK[a.education.level] ?? 2;
  const rankB = EDUCATION_RANK[b.education.level] ?? 2;
  const diff = Math.abs(rankA - rankB);
  const base = diff === 0 ? 95 : diff === 1 ? 78 : diff === 2 ? 60 : 42;
  const fieldBonus = a.education.field?.toLowerCase() === b.education.field?.toLowerCase() ? 5 : 0;
  const score = Math.min(100, base + fieldBonus);
  const explanation = diff === 0
    ? `Both hold ${a.education.level} qualifications — strong academic alignment.`
    : diff === 1
      ? 'Slightly different education levels but academically well-matched aspirations.'
      : `Different education levels; mutual respect for each other's background is key.`;
  return {
    score,
    myValue: `${a.education.level} – ${a.education.field}`,
    theirValue: `${b.education.level} – ${b.education.field}`,
    explanation,
  };
}

function computeLocation(a: UserProfile, b: UserProfile) {
  if (a.location.city === b.location.city) {
    return { score: 100, myValue: a.location.city, theirValue: b.location.city, explanation: 'Both are in the same city — seamless proximity!' };
  }
  if (a.location.state === b.location.state) {
    const bonus = (a.location.willingToRelocate || b.location.willingToRelocate) ? 10 : 0;
    return { score: Math.min(100, 72 + bonus), myValue: a.location.city, theirValue: b.location.city, explanation: 'Same state — manageable distance with plenty of opportunities to meet.' };
  }
  if (a.location.country === b.location.country) {
    const bonus = a.location.willingToRelocate && b.location.willingToRelocate ? 20 : (a.location.willingToRelocate || b.location.willingToRelocate) ? 12 : 0;
    const note = bonus > 0 ? 'At least one partner is open to relocation — a positive sign.' : 'Different cities; openness to relocation would strengthen this match.';
    return { score: Math.min(100, 42 + bonus), myValue: a.location.city, theirValue: b.location.city, explanation: note };
  }
  return { score: 30, myValue: a.location.city, theirValue: b.location.city, explanation: 'Different countries — significant logistical considerations involved.' };
}

function computeReligion(a: UserProfile, b: UserProfile) {
  if (a.religion === b.religion) {
    const casteSame = a.caste && b.caste && a.caste === b.caste;
    return {
      score: casteSame ? 100 : 92,
      myValue: `${a.religion}${a.caste ? ' / ' + a.caste : ''}`,
      theirValue: `${b.religion}${b.caste ? ' / ' + b.caste : ''}`,
      explanation: `Same religion${casteSame ? ' and caste' : ''} — strong cultural and spiritual alignment.`,
    };
  }
  const aOpen = a.preferences?.religions?.includes(b.religion) ?? false;
  const bOpen = b.preferences?.religions?.includes(a.religion) ?? false;
  if (aOpen && bOpen) return { score: 72, myValue: a.religion, theirValue: b.religion, explanation: 'Different religions but both are open to an interfaith relationship.' };
  if (aOpen || bOpen) return { score: 55, myValue: a.religion, theirValue: b.religion, explanation: 'One partner is open to interfaith; an honest conversation will clarify alignment.' };
  return { score: 35, myValue: a.religion, theirValue: b.religion, explanation: 'Different religions; thoughtful discussion on shared values is recommended.' };
}

function computeFamily(a: UserProfile, b: UserProfile) {
  const sameType = a.familyDetails.familyType === b.familyDetails.familyType;
  const aOk = !a.preferences?.familyType || a.preferences.familyType === b.familyDetails.familyType;
  const bOk = !b.preferences?.familyType || b.preferences.familyType === a.familyDetails.familyType;
  let score = sameType ? 95 : aOk && bOk ? 78 : aOk || bOk ? 60 : 45;
  const av = a.familyDetails.familyValues ?? '';
  const bv = b.familyDetails.familyValues ?? '';
  if (av && bv && av.toLowerCase().includes('traditional') && bv.toLowerCase().includes('traditional')) score = Math.min(100, score + 5);
  const explanation = sameType
    ? `Both prefer a ${a.familyDetails.familyType} family — perfect family compatibility.`
    : 'Different family type preferences; open dialogue and compromise will be important.';
  return {
    score,
    myValue: `${a.familyDetails.familyType} family · ${a.familyDetails.siblings ?? 0} sibling(s)`,
    theirValue: `${b.familyDetails.familyType} family · ${b.familyDetails.siblings ?? 0} sibling(s)`,
    explanation,
  };
}

function computeCareer(a: UserProfile, b: UserProfile) {
  const incomeToNum = (inc?: string): number => {
    if (!inc) return 10;
    const n = parseFloat(inc.replace(/[^0-9.]/g, ''));
    return isNaN(n) ? 10 : n;
  };
  const iA = incomeToNum(a.occupation.annualIncome);
  const iB = incomeToNum(b.occupation.annualIncome);
  const ratio = iA > iB ? iB / iA : iA / iB;
  const base = ratio >= 0.85 ? 92 : ratio >= 0.65 ? 78 : ratio >= 0.45 ? 62 : 45;
  const bothEmployed = a.occupation.workingStatus === 'Employed' && b.occupation.workingStatus === 'Employed';
  const score = Math.min(100, base + (bothEmployed ? 5 : 0));
  const explanation = ratio >= 0.8
    ? 'Similar income and career levels — excellent financial compatibility.'
    : ratio >= 0.6
      ? 'Career trajectories align well with a manageable income gap.'
      : 'Different career stages; mutual support and respect for ambition will matter.';
  return {
    score,
    myValue: `${a.occupation.title} · ${a.occupation.annualIncome ?? 'N/A'}`,
    theirValue: `${b.occupation.title} · ${b.occupation.annualIncome ?? 'N/A'}`,
    explanation,
  };
}

function computeLifestyle(a: UserProfile, b: UserProfile) {
  const foodMatch = !a.preferences?.foodPreference || !b.preferences?.foodPreference
    || a.preferences.foodPreference === b.preferences.foodPreference;
  const seed = Math.abs(a.userId.charCodeAt(0) - b.userId.charCodeAt(0)) % 20;
  const score = Math.min(100, (foodMatch ? 78 : 52) + seed);
  const myFoodPref = a.preferences?.foodPreference ?? 'Not specified';
  const theirFoodPref = b.preferences?.foodPreference ?? 'Not specified';
  const explanation = foodMatch
    ? 'Compatible lifestyle habits and food preferences — daily life will flow naturally.'
    : 'Different food preferences; lifestyle differences can be bridged with mutual respect.';
  return { score, myValue: myFoodPref, theirValue: theirFoodPref, explanation };
}

function computeEmotional(a: UserProfile, b: UserProfile) {
  const gap = Math.abs(a.age - b.age);
  const base = gap <= 2 ? 93 : gap <= 4 ? 83 : gap <= 6 ? 70 : gap <= 8 ? 58 : 44;
  const aInRange = a.preferences?.ageRange ? b.age >= a.preferences.ageRange.min && b.age <= a.preferences.ageRange.max : true;
  const bInRange = b.preferences?.ageRange ? a.age >= b.preferences.ageRange.min && a.age <= b.preferences.ageRange.max : true;
  const score = Math.min(100, base + (aInRange && bInRange ? 5 : 0));
  const explanation = gap <= 3
    ? 'Very close in age — high emotional and life-stage compatibility.'
    : gap <= 6
      ? 'Moderate age gap; shared maturity and perspectives support a deep bond.'
      : 'Larger age gap may require extra emotional understanding and patience.';
  return { score, myValue: `${a.age} years`, theirValue: `${b.age} years`, explanation };
}

function computeHoroscope(a: UserProfile, b: UserProfile) {
  const COMPAT: Record<string, string[]> = {
    Aries: ['Leo', 'Sagittarius', 'Gemini'], Taurus: ['Virgo', 'Capricorn', 'Cancer'],
    Gemini: ['Libra', 'Aquarius', 'Aries'], Cancer: ['Scorpio', 'Pisces', 'Taurus'],
    Leo: ['Aries', 'Sagittarius', 'Gemini'], Virgo: ['Taurus', 'Capricorn', 'Cancer'],
    Libra: ['Gemini', 'Aquarius', 'Leo'], Scorpio: ['Cancer', 'Pisces', 'Virgo'],
    Sagittarius: ['Aries', 'Leo', 'Libra'], Capricorn: ['Taurus', 'Virgo', 'Scorpio'],
    Aquarius: ['Gemini', 'Libra', 'Sagittarius'], Pisces: ['Cancer', 'Scorpio', 'Capricorn'],
  };
  if (a.horoscope?.rashi && b.horoscope?.rashi) {
    const rA = a.horoscope.rashi, rB = b.horoscope.rashi;
    if (rA === rB) return { score: 88, myValue: `${rA} · ${a.horoscope.nakshatra ?? '—'}`, theirValue: `${rB} · ${b.horoscope.nakshatra ?? '—'}`, explanation: 'Same Rashi — spiritually and astrologically harmonious.' };
    const compat = COMPAT[rA]?.includes(rB);
    return {
      score: compat ? 82 : 62,
      myValue: `${rA} · ${a.horoscope.nakshatra ?? '—'}`,
      theirValue: `${rB} · ${b.horoscope.nakshatra ?? '—'}`,
      explanation: compat ? 'Highly compatible Rashis — an auspicious astrological alignment.' : 'Average Rashi compatibility; detailed Kundali matching is recommended.',
    };
  }
  const seed = (a.userId.charCodeAt(0) * 7 + b.userId.charCodeAt(0) * 3) % 35;
  return { score: 58 + seed, myValue: 'Not provided', theirValue: 'Not provided', explanation: 'Horoscope details not available; approximate score based on profile data.' };
}

function computeInterests(a: UserProfile, b: UserProfile) {
  const derive = (p: UserProfile): string[] => {
    const tags: string[] = [];
    const occ = p.occupation.title.toLowerCase();
    const edu = p.education.field.toLowerCase();
    if (occ.includes('software') || occ.includes('engineer') || edu.includes('computer')) tags.push('Technology', 'Gaming', 'Coding');
    if (occ.includes('doctor') || edu.includes('medicine')) tags.push('Healthcare', 'Fitness', 'Wellness');
    if (occ.includes('teacher')) tags.push('Reading', 'Writing', 'Education');
    if (occ.includes('business') || occ.includes('entrepreneur')) tags.push('Travel', 'Networking', 'Finance');
    if (occ.includes('design')) tags.push('Art', 'Photography', 'Fashion');
    if (occ.includes('law')) tags.push('Debate', 'Reading', 'Social Work');
    const defaults = ['Music', 'Cooking', 'Family Time', 'Movies', 'Hiking', 'Cricket'];
    tags.push(defaults[p.userId.charCodeAt(0) % defaults.length]);
    tags.push(defaults[(p.userId.charCodeAt(p.userId.length - 1) + 2) % defaults.length]);
    return [...new Set(tags)];
  };
  const aList = derive(a);
  const bList = derive(b);
  const common = aList.filter(i => bList.includes(i));
  const union = [...new Set([...aList, ...bList])];
  const jaccardRaw = union.length > 0 ? (common.length / union.length) * 100 : 50;
  const score = Math.min(100, Math.round(38 + jaccardRaw));
  const explanation = common.length > 0
    ? `You share ${common.length} interest${common.length > 1 ? 's' : ''}: ${common.join(', ')}.`
    : 'Different interests that can beautifully complement each other.';
  return { score, commonList: common, myValue: aList.slice(0, 4).join(', '), theirValue: bList.slice(0, 4).join(', '), explanation };
}

// ─────────────────────────────────────────────────────────────────────────────
// Report Generator (exported for reuse/testing)
// ─────────────────────────────────────────────────────────────────────────────

export function generateMatchReport(myProfile: UserProfile, theirProfile: UserProfile): ProfileMatchReport {
  const edu = computeEducation(myProfile, theirProfile);
  const loc = computeLocation(myProfile, theirProfile);
  const rel = computeReligion(myProfile, theirProfile);
  const fam = computeFamily(myProfile, theirProfile);
  const car = computeCareer(myProfile, theirProfile);
  const lif = computeLifestyle(myProfile, theirProfile);
  const emo = computeEmotional(myProfile, theirProfile);
  const hor = computeHoroscope(myProfile, theirProfile);
  const int = computeInterests(myProfile, theirProfile);

  const raw: Array<{ key: string; title: string; icon: string; weight: number } & ReturnType<typeof computeEducation>> = [
    { key: 'religion',  title: 'Religion & Caste',      icon: 'temple_hindu',      weight: 15, ...rel },
    { key: 'family',    title: 'Family Background',      icon: 'family_restroom',   weight: 15, ...fam },
    { key: 'lifestyle', title: 'Lifestyle',              icon: 'self_improvement',  weight: 12, ...lif },
    { key: 'education', title: 'Education',              icon: 'school',            weight: 12, ...edu },
    { key: 'career',    title: 'Career Compatibility',   icon: 'work',              weight: 12, ...car },
    { key: 'emotional', title: 'Emotional Compatibility',icon: 'favorite',          weight: 12, ...emo },
    { key: 'location',  title: 'Location Match',         icon: 'location_on',       weight: 10, ...loc },
    { key: 'interests', title: 'Shared Interests',       icon: 'interests',         weight: 7,  ...int },
    { key: 'horoscope', title: 'Horoscope Match',        icon: 'auto_awesome',      weight: 5,  ...hor },
  ];

  const categories: MatchCategory[] = raw.map(r => ({
    key: r.key, title: r.title, icon: r.icon, weight: r.weight,
    percentage: r.score, level: scoreLevel(r.score),
    color: scoreColor(r.score), progressColor: progressColor(r.score),
    explanation: r.explanation, myValue: r.myValue, theirValue: r.theirValue,
  }));

  const totalWeight = categories.reduce((s, c) => s + c.weight, 0);
  const overallPercentage = Math.round(categories.reduce((s, c) => s + c.percentage * c.weight, 0) / totalWeight);

  const matchLevel: MatchLevel = overallPercentage >= 90 ? 'excellent'
    : overallPercentage >= 75 ? 'suggested'
    : overallPercentage >= 60 ? 'moderate'
    : 'low';

  const LABELS: Record<MatchLevel, string> = {
    excellent: 'Excellent Match', suggested: 'Suggested Match',
    moderate: 'Moderate Match', low: 'Low Compatibility',
  };
  const BADGE_COLORS: Record<MatchLevel, string> = {
    excellent: '#4caf50', suggested: '#b76e79', moderate: '#ff9800', low: '#f44336',
  };

  const sorted = [...categories].sort((x, y) => y.percentage - x.percentage);
  const strengthAreas = sorted.slice(0, 3).map(c => c.title);
  const weakAreas = sorted.slice(-3).reverse().map(c => c.title);

  const recommendation = overallPercentage >= 85
    ? `${theirProfile.firstName} is an outstanding match for you! High compatibility across multiple dimensions — ${strengthAreas[0]}, ${strengthAreas[1]}, and ${strengthAreas[2]} — suggests a deeply harmonious relationship. We strongly recommend expressing your interest.`
    : overallPercentage >= 70
      ? `${theirProfile.firstName} shows great compatibility with you. Strong alignment in ${strengthAreas[0]} and ${strengthAreas[1]} creates a solid foundation. Minor differences in ${weakAreas[0]} can be worked through with open communication.`
      : overallPercentage >= 55
        ? `${theirProfile.firstName} has moderate compatibility with your profile. With mutual understanding and willingness to embrace differences — especially in ${weakAreas[0]} — this relationship has meaningful potential.`
        : `${theirProfile.firstName} shows limited compatibility with your current profile. You may wish to explore profiles with stronger alignment in ${weakAreas[0]} and ${weakAreas[1]} for a more harmonious match.`;

  return {
    overallPercentage, matchLevel,
    matchLabel: LABELS[matchLevel], badgeColor: BADGE_COLORS[matchLevel],
    categories, commonInterests: int.commonList,
    strengthAreas, weakAreas, recommendation,
    reportGeneratedAt: new Date(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-profile-match',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, RouterLink, MaterialModule],
  templateUrl: './profile-match.component.html',
  styleUrl: './profile-match.component.scss',
})
export class ProfileMatchComponent implements OnInit {
  private readonly route           = inject(ActivatedRoute);
  private readonly router          = inject(Router);
  private readonly profileSvc      = inject(ProfileService);
  private readonly authService     = inject(AuthService);
  private readonly matchSvc        = inject(MatchService);
  private readonly gallerySvc  = inject(GalleryService);
  private readonly interestService = inject(InterestService);
  private readonly snackBar        = inject(MatSnackBar);
  private readonly dialog         = inject(MatDialog);
  private readonly pdfService      = inject(PdfReportService);
  private readonly horoscopeSvc    = inject(HoroscopeMatchService);

  // ── State ────────────────────────────────────────────────────────────────
  protected readonly myProfile       = signal<UserProfile | null>(null);
  protected readonly theirProfile    = signal<UserProfile | null>(null);
  protected readonly report          = signal<ProfileMatchReport | null>(null);
  protected readonly gallery         = signal<GalleryImage[]>([]);
  protected readonly isLoading       = signal(true);
  protected readonly error           = signal<string | null>(null);
  protected readonly isFavorited     = signal(false);
  protected readonly interestSent    = signal(false);
  protected readonly activeTab       = signal(0);
  protected readonly validationError = signal<'same-profile' | 'same-gender' | null>(null);
  protected readonly isGeneratingPdf = signal(false);

  // SVG circle ring (r=54 → c≈339.3)
  protected readonly RADIUS = 54;
  protected readonly CIRCUMFERENCE = 2 * Math.PI * this.RADIUS;

  protected readonly dashOffset = computed(() => {
    const pct = this.report()?.overallPercentage ?? 0;
    return this.CIRCUMFERENCE - (pct / 100) * this.CIRCUMFERENCE;
  });

  protected readonly isSelf = computed(() =>
    !!this.authService.user()?.id && this.authService.user()?.id === this.theirProfile()?.user?.id,
  );

  protected readonly gallaryImages = computed<GalleryImage[]>(() => this.gallery() ?? []);
  
  // ── Lifecycle ─────────────────────────────────────────────────────────────
  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('No profile ID in the URL. Please navigate from a search result.');
      this.isLoading.set(false);
      return;
    }
    try {
      await this.profileSvc.loadProfiles();
      await this.profileSvc.loadMyProfile();

      const theirProfile = await this.profileSvc.getProfileById(id);
      this.theirProfile.set(theirProfile);

      // Use authenticated user profile, or fall back to first profile of opposite gender
      let myProfile = this.profileSvc.myProfile();
      if (!myProfile) {
        const opposite = theirProfile.gender === 'bride' ? 'groom' : 'bride';
        myProfile = this.profileSvc.allProfiles().find(p => p.userId !== id && p.gender === opposite) ?? null;
      }
      this.myProfile.set(myProfile);

      await this.interestService.loadInterests();
      const interestSentDetail = this.interestService.getSentStatus(theirProfile.user?.id ?? '');
      this.interestSent.set(interestSentDetail?.status === 'pending' || interestSentDetail?.status === 'accepted');

      const matchDetail = await this.matchSvc.getMatchByUserId(theirProfile.user?.id ?? '');
      this.isFavorited.set(matchDetail?.status === 'shortlisted');

      //get gallery to check if any photos are verified
      if (theirProfile) {
        const res = await firstValueFrom(this.gallerySvc.getProfileGallery(theirProfile?.userId ?? ''));
        this.gallery.set(res?.data ?? []);
      }

      if (myProfile && theirProfile) {
        if (myProfile.userId === theirProfile.userId) {
          this.validationError.set('same-profile');
        } else if (myProfile.gender === theirProfile.gender) {
          this.validationError.set('same-gender');
        } else {
          this.report.set(generateMatchReport(myProfile, theirProfile));
        }
      } else {
        this.error.set('Could not load your profile. Please ensure you are logged in.');
      }
    } catch {
      this.error.set('Failed to load profiles. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  // ── Template Helpers ──────────────────────────────────────────────────────
  protected validationMessage(): string {
    const v = this.validationError();
    if (v === 'same-profile') {
      return 'You have selected the same profile for both individuals. Please select a different profile to view compatibility and match details.';
    }
    if (v === 'same-gender') {
      const g = this.myProfile()?.gender === 'bride' ? 'Bride' : 'Groom';
      return `Both selected profiles are ${g} profiles. Compatibility can only be calculated between a Bride profile and a Groom profile. Please select one Bride profile and one Groom profile to view compatibility and match details.`;
    }
    return '';
  }

  protected primaryPhoto(profile: UserProfile): string {
    const ph = profile.photos?.find(p => p.isPrimary) ?? profile.photos?.[0];
    return ph?.url ?? '/avatar-default.svg';
  }

  protected matchLevelIcon(level: MatchLevel): string {
    const MAP: Record<MatchLevel, string> = {
      excellent: 'stars', suggested: 'recommend',
      moderate: 'thumbs_up_down', low: 'sentiment_dissatisfied',
    };
    return MAP[level];
  }

  protected levelLabel(level: ScoreLevel): string {
    const MAP: Record<ScoreLevel, string> = {
      excellent: 'Excellent', good: 'Good', average: 'Average', low: 'Low',
    };
    return MAP[level];
  }

  protected onImageError(e: Event): void {
    (e.target as HTMLImageElement).src = '/avatar-default.svg';
  }

  protected trackByKey(_: number, item: MatchCategory): string {
    return item.key;
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  protected async toggleFavorite(): Promise<void> {
    const userId = this.theirProfile()?.user?.id;
    if (!userId) return;

    const isSelf = this.isSelf();
    if (isSelf) {
      this.snackBar.open('You cannot send shortlist request to your own profile.', 'OK', { duration: 3000 });
      return;
    }

    const adding = !this.isFavorited();
    this.isFavorited.set(adding); // optimistic
    const name = this.theirProfile()?.firstName ?? 'Profile';
    try {
      if (adding) {
        await this.matchSvc.shortlistUser(userId);
        this.snackBar.open(`${name} added to shortlist ✨`, 'Dismiss', { duration: 2500 });
      } else {
        await this.matchSvc.removeShortlistUser(userId);
        this.snackBar.open('Removed from shortlist', 'Dismiss', { duration: 2500 });
      }
    } catch {
      this.isFavorited.set(!adding); // roll back
      this.snackBar.open('Could not update shortlist. Please try again.', 'OK', { duration: 3000 });
    }
  }

  protected async sendInterest(): Promise<void> {
    const toUserId = this.theirProfile()?.user?.id;
    if (!toUserId || this.interestSent()) return;

    const isSelf = this.isSelf();
    if (isSelf) {
      this.snackBar.open('You cannot send interest to your own profile.', 'OK', { duration: 3000 });
      return;
    }

    const theirProfile = this.theirProfile()!;
    const report = this.report();
    const defaultMessage = this.interestService.buildDefaultMessage(
      theirProfile,
      report?.overallPercentage,
      report?.commonInterests,
    );

    this.interestSent.set(true); // optimistic
    try {
      await this.interestService.sendInterest(toUserId, defaultMessage);
      this.snackBar.open(`Interest sent to ${theirProfile.firstName}! 💌`, 'Dismiss', { duration: 3500 });
    } catch {
      this.interestSent.set(false); // roll back on failure
      this.snackBar.open('Could not send interest. Please try again.', 'OK', { duration: 3000 });
    }
  }

  protected openProfilePhotoViewer(profile: UserProfile): void {
    const urls = (profile.photos ?? [])
      .filter(p => !!p.url)
      .map(p => p.variants?.originalUrl ?? p.variants?.displayUrl ?? p.variants?.thumbnailUrl ?? p.url as string);
      //      .map(p => p.url as string);


    if (!urls.length) return;
    this.dialog.open(ImageViewerDialogComponent, {
      data: { urls, index: 0 },
      panelClass: 'image-viewer-panel',
      maxWidth: '100vw',
      maxHeight: '100vh',
    });
  }

  protected openGalleryDialog(photos: GalleryImage[], index: number): void {

    const gImages = photos.map(p => p.imageUrl).filter(Boolean) as string[];
    
    this.dialog.open(ImageViewerDialogComponent, {
      data: { urls: gImages, index },
      panelClass: 'image-viewer-panel',
      maxWidth: '100vw',
      maxHeight: '100vh',
    });
  }
    
  protected startChat(): void {
    const isSelf = this.isSelf();
    if (isSelf) {
      this.snackBar.open('You cannot send chat request to your own profile.', 'OK', { duration: 3000 });
      return;
    }

    const p = this.theirProfile();
    if (p) void this.router.navigate(['/chat'], { queryParams: { profileId: p.userId } });
  }

  protected async downloadReport(): Promise<void> {
    if (this.isGeneratingPdf()) return;

    const myProfile = this.myProfile();
    const theirProfile = this.theirProfile();
    const report = this.report();

    if (!myProfile || !theirProfile || !report) {
      this.snackBar.open('Report data is not ready yet. Please wait for the page to finish loading.', 'OK', { duration: 3500 });
      return;
    }

    this.isGeneratingPdf.set(true);
    try {
      // Fetch the full Kundli (Ashtakoota) breakdown; fall back to basic horoscope info on failure.
      let kundli: KundliMatching | null = null;
      try {
        const matchUserId = theirProfile.user?.id ?? theirProfile.userId;
        const res = await firstValueFrom(this.horoscopeSvc.getHoroscopeMatch(matchUserId));
        kundli = res?.horoscopeReport?.kundliMatching ?? null;
      } catch {
        kundli = null;
      }

      const data = this.pdfService.generateCompatibilityReport({ myProfile, theirProfile, report, kundli });
      const doc = this.pdfService.generatePdf(data);
      this.pdfService.downloadPdf(doc, data.fileName);
      this.snackBar.open('Your compatibility report has been downloaded 📄', 'Dismiss', { duration: 3000 });
    } catch {
      this.snackBar.open('Sorry, we could not generate the PDF report. Please try again.', 'OK', { duration: 3500 });
    } finally {
      this.isGeneratingPdf.set(false);
    }
  }

  protected printReport(): void {
    window.print();
  }

  protected goBack(): void {
    window.history.length > 1 ? window.history.back() : void this.router.navigate(['/search']);
  }
}
