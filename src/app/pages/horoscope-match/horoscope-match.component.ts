import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  HostListener,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location, CommonModule } from '@angular/common';
import { MaterialModule } from '../../shared/modules/material.module';
import { HoroscopeMatchService } from './horoscope-match.service';
import { BirthChartComponent } from './birth-chart/birth-chart.component';
import {
  HoroscopeMatchResponse,
  HoroscopeUserProfile,
  KootaDisplay,
  PlanetDisplay,
  DoshaDisplay,
  DashboardAspectDisplay,
  PlanetComparisonDisplay,
  HousePlacementDisplay,
} from './horoscope-match.model';

@Component({
  selector: 'app-horoscope-match',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MaterialModule, BirthChartComponent],
  templateUrl: './horoscope-match.component.html',
  styleUrl: './horoscope-match.component.scss',
})
export class HoroscopeMatchComponent implements OnInit {
  private readonly route    = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly svc      = inject(HoroscopeMatchService);

  // ── State ─────────────────────────────────────────────────────────────────
  protected readonly data          = signal<HoroscopeMatchResponse | null>(null);
  protected readonly isLoading     = signal(true);
  protected readonly error         = signal<string | null>(null);
  protected readonly showScrollTop = signal(false);

  // ── Hero ring: r=80 → circumference ≈ 502.65 ─────────────────────────────
  protected readonly RADIUS        = 80;
  protected readonly CIRCUMFERENCE = 2 * Math.PI * this.RADIUS;

  // ── Derived score values ──────────────────────────────────────────────────
  protected readonly overallScore = computed(
    () => this.data()?.horoscopeReport?.compatibilityDashboard?.overallScore ?? 0
  );
  protected readonly overallCategory = computed(
    () => this.data()?.horoscopeReport?.compatibilityDashboard?.category ?? ''
  );
  protected readonly scoreColor = computed(() => this.getScoreColor(this.overallScore()));
  protected readonly categoryClass = computed(() => this.getCategoryClass(this.overallCategory()));
  protected readonly ringDashOffset = computed(() => {
    const pct = this.overallScore();
    return this.CIRCUMFERENCE - (pct / 100) * this.CIRCUMFERENCE;
  });

  // ── Pre-computed display arrays (avoid method calls in template) ──────────
  protected readonly dashboardAspects = computed((): DashboardAspectDisplay[] => {
    const db = this.data()?.horoscopeReport?.compatibilityDashboard;
    if (!db) return [];
    return [
      { key: 'emotional',         label: 'Emotional',          icon: 'favorite',      score: db.emotional.score,         explanation: db.emotional.explanation         },
      { key: 'communication',     label: 'Communication',      icon: 'chat_bubble',   score: db.communication.score,     explanation: db.communication.explanation     },
      { key: 'romance',           label: 'Romance',            icon: 'local_florist', score: db.romance.score,           explanation: db.romance.explanation           },
      { key: 'marriageStability', label: 'Marriage Stability', icon: 'diamond',       score: db.marriageStability.score, explanation: db.marriageStability.explanation },
      { key: 'familyValues',      label: 'Family Values',      icon: 'home',          score: db.familyValues.score,      explanation: db.familyValues.explanation      },
      { key: 'financial',         label: 'Financial',          icon: 'savings',       score: db.financial.score,         explanation: db.financial.explanation         },
      { key: 'personality',       label: 'Personality',        icon: 'psychology',    score: db.personality.score,       explanation: db.personality.explanation       },
    ];
  });

  protected readonly kootasArray = computed((): KootaDisplay[] => {
    const k = this.data()?.horoscopeReport?.kundliMatching;
    if (!k) return [];
    return [
      { key: 'varna',       label: 'Varna',        ...k.varna       },
      { key: 'vashya',      label: 'Vashya',       ...k.vashya      },
      { key: 'tara',        label: 'Tara',         ...k.tara        },
      { key: 'yoni',        label: 'Yoni',         ...k.yoni        },
      { key: 'grahaMaitri', label: 'Graha Maitri', ...k.grahaMaitri },
      { key: 'gana',        label: 'Gana',         ...k.gana        },
      { key: 'bhakoot',     label: 'Bhakoot',      ...k.bhakoot     },
      { key: 'nadi',        label: 'Nadi',         ...k.nadi        },
    ];
  });

  protected readonly doshasArray = computed((): DoshaDisplay[] => {
    const d = this.data()?.horoscopeReport?.doshaAnalysis;
    if (!d) return [];
    return [
      { key: 'manglik',  label: 'Manglik',        entry: d.manglik  },
      { key: 'nadi',     label: 'Nadi',           entry: d.nadi     },
      { key: 'bhakoot',  label: 'Bhakoot',        entry: d.bhakoot  },
      { key: 'kaalSarp', label: 'Kaal Sarp',      entry: d.kaalSarp },
      { key: 'shani',    label: 'Shani (Saturn)', entry: d.shani    },
    ];
  });

  protected readonly planetsPersonOne = computed((): PlanetDisplay[] => {
    const pos = this.data()?.horoscopeReport?.horoscopeGeneration?.personOne?.planetPositions;
    return pos ? this.buildPlanetsArray(pos) : [];
  });

  protected readonly planetsPersonTwo = computed((): PlanetDisplay[] => {
    const pos = this.data()?.horoscopeReport?.horoscopeGeneration?.personTwo?.planetPositions;
    return pos ? this.buildPlanetsArray(pos) : [];
  });

  protected readonly planetaryComparison = computed((): PlanetComparisonDisplay[] => {
    const pc  = this.data()?.horoscopeReport?.planetaryCompatibility?.planets;
    const adv = this.data()?.horoscopeReport?.advancedAstrologyDetails?.planetPositions ?? {};
    if (!pc) return [];
    const order = ['sun','moon','mars','mercury','venus','jupiter','saturn','rahu','ketu'];
    return order
      .filter(p => p in pc)
      .map(planet => ({
        planet: planet.charAt(0).toUpperCase() + planet.slice(1),
        personOnePos: adv[planet]?.personOne ?? pc[planet].personOne,
        personTwoPos: adv[planet]?.personTwo ?? pc[planet].personTwo,
        compatibility: pc[planet].compatibility,
      }));
  });

  protected readonly housePlacementsOne = computed((): HousePlacementDisplay[] => {
    const hp = this.data()?.horoscopeReport?.advancedAstrologyDetails?.housePlacements?.personOne;
    return hp ? Object.entries(hp).map(([house, placement]) => ({ house, placement })) : [];
  });

  protected readonly housePlacementsTwo = computed((): HousePlacementDisplay[] => {
    const hp = this.data()?.horoscopeReport?.advancedAstrologyDetails?.housePlacements?.personTwo;
    return hp ? Object.entries(hp).map(([house, placement]) => ({ house, placement })) : [];
  });

  private matchUserId = '';

  ngOnInit(): void {
    this.matchUserId = this.route.snapshot.paramMap.get('matchUserId') ?? '';
    this.loadData();
  }

  /** Loads (or reloads) the horoscope compatibility report from the API */
  protected loadData(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.svc.getHoroscopeMatch(this.matchUserId).subscribe({
      next: response => {
        this.data.set(response);
        this.isLoading.set(false);
      },
      error: err => {
        this.error.set(
          err?.error?.message ?? 'Failed to load horoscope report. Please try again.'
        );
        this.isLoading.set(false);
      },
    });
  }

  protected goBack():     void { this.location.back(); }
  protected scrollToTop(): void { window.scrollTo({ top: 0, behavior: 'smooth' }); }

  @HostListener('window:scroll')
  protected onScroll(): void { this.showScrollTop.set(window.scrollY > 300); }

  /** Returns a hex color for a 0–100 score */
  protected getScoreColor(score: number): string {
    if (score >= 75) return '#4caf50';
    if (score >= 50) return '#ff9800';
    return '#f44336';
  }

  /** Returns a CSS modifier class for the hero category badge */
  protected getCategoryClass(category: string): string {
    const c = category.toLowerCase();
    if (c.includes('highly') || c.includes('excellent')) return 'cat-excellent';
    if (c.includes('strong') || c.includes('good') || c.includes('compatible')) return 'cat-good';
    if (c.includes('moderate')) return 'cat-moderate';
    return 'cat-caution';
  }

  /** Returns a CSS modifier class for the final recommendation card */
  protected getRecommendationClass(category: string): string {
    const c = category.toLowerCase();
    if (c.includes('highly') || c.includes('excellent')) return 'rec-excellent';
    if (c.includes('strong') || c.includes('good'))      return 'rec-good';
    if (c.includes('moderate'))                          return 'rec-moderate';
    return 'rec-caution';
  }

  /** Returns a CSS class for koota bar colouring */
  protected getKootaBarClass(score: number, maxScore: number): string {
    if (score === maxScore) return 'bar-green';
    if (score > 0)          return 'bar-amber';
    return 'bar-red';
  }

  /** Returns a CSS class for the dosha severity chip */
  protected getSeverityClass(severity: string): string {
    const s = severity.toLowerCase();
    if (s === 'none')             return 'severity-none';
    if (s.startsWith('low'))      return 'severity-low';
    if (s.includes('medium'))     return 'severity-medium';
    if (s.includes('high'))       return 'severity-high';
    return 'severity-medium';
  }

  /** Returns the primary (or first) photo URL for a profile */
  protected getPrimaryPhoto(profile: HoroscopeUserProfile): string {
    return (
      profile.photos?.find(p => p.isPrimary)?.url ??
      profile.photos?.[0]?.url ??
      ''
    );
  }

  /** Returns whether the primary photo carries a verified badge */
  protected isPrimaryPhotoVerified(profile: HoroscopeUserProfile): boolean {
    return (
      profile.photos?.find(p => p.isPrimary)?.isVerified ??
      profile.photos?.[0]?.isVerified ??
      false
    );
  }

  private buildPlanetsArray(positions: Record<string, string>): PlanetDisplay[] {
    const order = ['sun','moon','mars','mercury','venus','jupiter','saturn','rahu','ketu'];
    return order
      .filter(p => p in positions)
      .map(planet => ({
        planet: planet.charAt(0).toUpperCase() + planet.slice(1),
        position: positions[planet].replace(' (Retrograde)', ''),
        isRetrograde: positions[planet].includes('(Retrograde)'),
      }));
  }
}
