import { Component, Input, ChangeDetectionStrategy, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../shared/modules/material.module';
import { HoroscopeGenPerson } from '../horoscope-match.model';

// ── Constants ──────────────────────────────────────────────────────────────

const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
] as const;

const SIGN_ABBR: Record<string, string> = {
  Aries: 'Ari', Taurus: 'Tau', Gemini: 'Gem', Cancer: 'Can',
  Leo: 'Leo', Virgo: 'Vir', Libra: 'Lib', Scorpio: 'Sco',
  Sagittarius: 'Sag', Capricorn: 'Cap', Aquarius: 'Aqu', Pisces: 'Pis',
};

const SIGN_SANSKRIT: Record<string, string> = {
  Aries: 'Mesha', Taurus: 'Vrishabha', Gemini: 'Mithuna', Cancer: 'Karka',
  Leo: 'Simha', Virgo: 'Kanya', Libra: 'Tula', Scorpio: 'Vrishchika',
  Sagittarius: 'Dhanu', Capricorn: 'Makara', Aquarius: 'Kumbha', Pisces: 'Meena',
};

// South Indian fixed grid positions: sign index → [row, col] (1-indexed for CSS grid)
const SIGN_POS: [number, number][] = [
  [1,2],[1,3],[1,4],   // Aries, Taurus, Gemini      — top row
  [2,4],[3,4],[4,4],   // Cancer, Leo, Virgo          — right column
  [4,3],[4,2],[4,1],   // Libra, Scorpio, Sagittarius — bottom row
  [3,1],[2,1],[1,1],   // Capricorn, Aquarius, Pisces — left column
];

const PLANET_ABBR: Record<string, string> = {
  sun: 'Sun', moon: 'Moon', mars: 'Mars', mercury: 'Mercury',
  venus: 'Venus', jupiter: 'Jupiter', saturn: 'Saturn', rahu: 'Rahu', ketu: 'Ketu',
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Interfaces ─────────────────────────────────────────────────────────────

export interface GridCell {
  sign:       string;
  signAbbr:   string;
  houseNum:   number;
  houseLabel: string;
  planets:    GridPlanet[];
  isLagna:    boolean;
  tooltip:    string;
  gridRow:    number;
  gridCol:    number;
}

export interface GridPlanet {
  key:          string;
  abbr:         string;
  isRetrograde: boolean;
}

interface CompRow {
  planet:   string;
  abbr:     string;
  p1:       string;
  p2:       string;
  sameSign: boolean;
}

// ── Component ──────────────────────────────────────────────────────────────

@Component({
  selector: 'app-birth-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MaterialModule],
  templateUrl: './birth-chart.component.html',
  styleUrl: './birth-chart.component.scss',
})
export class BirthChartComponent implements OnChanges {
  @Input() personOne!:    HoroscopeGenPerson;
  @Input() personTwo!:    HoroscopeGenPerson;
  @Input() personOneName = '';
  @Input() personTwoName = '';
  @Input() personOneDob  = '';
  @Input() personTwoDob  = '';
  @Input() personOneTime?  = '';
  @Input() personTwoTime?  = '';
  @Input() personOnePlace?  = '';
  @Input() personTwoPlace?  = '';

  cellsOne:  GridCell[] = [];
  cellsTwo:  GridCell[] = [];
  compRows:  CompRow[]  = [];

  readonly HOW_TO_READ = [
    { title: 'Lagna (Ascendant)', icon: 'home',
      text: 'The highlighted cell is the Lagna — your rising sign at birth. It governs personality, appearance, and overall life direction.' },
    { title: 'Fixed Signs', icon: 'grid_on',
      text: 'In South Indian charts the 12 signs stay fixed in position. Aries is always top-second; Pisces is top-left. Only planets move.' },
    { title: 'Planet Codes', icon: 'nights_stay',
      text: 'Sun=Sun, Moon=Moon, Mars=Mars, Mercury=Mercury, Venus=Venus, Jupiter=Jupiter, Saturn=Saturn, Rahu=Rahu, Ketu=Ketu.' },
    { title: 'Retrograde ℞', icon: 'sync_disabled',
      text: 'A ℞ superscript means the planet was retrograde at birth — appearing to move backward. This intensifies the planet\'s influence.' },
    { title: 'Rahu & Ketu', icon: 'blur_circular',
      text: 'Shadow planets (lunar nodes). Always 180° apart, they move retrograde and represent karmic patterns.' },
    { title: 'House Numbers', icon: 'format_list_numbered',
      text: 'Numbers 1–12 show house position relative to Lagna. 1=self, 4=home, 7=partner, 10=career, 12=spirituality.' },
  ];

  ngOnChanges(): void {
    if (this.personOne) this.cellsOne = this.buildCells(this.personOne);
    if (this.personTwo) this.cellsTwo = this.buildCells(this.personTwo);
    if (this.personOne && this.personTwo) this.compRows = this.buildCompRows();
  }

  getPlanetClass(key: string): string {
    const map: Record<string, string> = {
      sun: 'pl-sun', moon: 'pl-moon', mars: 'pl-mars', mercury: 'pl-mercury',
      venus: 'pl-venus', jupiter: 'pl-jupiter', saturn: 'pl-saturn',
      rahu: 'pl-rahu', ketu: 'pl-ketu',
    };
    return map[key] ?? 'pl-default';
  }

  /** Formats lagna as "English (Sanskrit)" e.g. "Capricorn (Makara)" */
  formatLagna(lagna: string): string {
    if (!lagna) return '';
    if (lagna.includes('(')) return lagna;
    const sanskrit = SIGN_SANSKRIT[lagna];
    return sanskrit ? `${lagna} (${sanskrit})` : lagna;
  }

  /** Formats an ISO / common date string as "DD MMM YYYY" */
  formatDob(dob: string): string {
    if (!dob) return '';
    const d = new Date(dob);
    if (isNaN(d.getTime())) return dob;
    const day = String(d.getDate()).padStart(2, '0');
    return `${day} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }

  /**
   * Builds 12 GridCell objects from housePlacements.
   * Keys like "1st House", "2nd House" → maps to the sign cell via lagna.
   */
  buildCells(p: HoroscopeGenPerson): GridCell[] {
    const lagnaSign = p.lagna.trim();
    const lagnaIdx  = SIGNS.findIndex(s => s.toLowerCase() === lagnaSign.toLowerCase());

    // houseNum → planets array (from housePlacements)
    const houseMap: Record<number, GridPlanet[]> = {};
    for (const [houseKey, val] of Object.entries(p.housePlacements)) {
      const num = this.parseHouseNum(houseKey);
      if (num >= 1 && num <= 12) {
        const planets = this.parsePlanets(val);
        if (planets.length) houseMap[num] = planets;
      }
    }

    return SIGNS.map((sign, signIdx) => {
      const [row, col] = SIGN_POS[signIdx];
      const houseNum   = lagnaIdx >= 0 ? ((signIdx - lagnaIdx + 12) % 12) + 1 : signIdx + 1;
      const planets    = houseMap[houseNum] ?? [];
      const isLagna    = lagnaIdx >= 0 && signIdx === lagnaIdx;
      const tooltip    = `${sign} · House ${houseNum}` +
        (planets.length ? ' · ' + planets.map(pp => pp.abbr + (pp.isRetrograde ? '℞' : '')).join(', ') : '');
      return {
        sign, signAbbr: SIGN_ABBR[sign] ?? sign.slice(0, 3),
        houseNum, houseLabel: String(houseNum),
        planets, isLagna, tooltip, gridRow: row, gridCol: col,
      };
    });
  }

  buildCompRows(): CompRow[] {
    const order = ['sun', 'moon', 'mars', 'mercury', 'venus', 'jupiter', 'saturn', 'rahu', 'ketu'];
    return order.map(key => {
      const raw1 = this.personOne.planetPositions[key] ?? '';
      const raw2 = this.personTwo.planetPositions[key] ?? '';
      const s1   = this.stripRetro(raw1).toLowerCase();
      const s2   = this.stripRetro(raw2).toLowerCase();
      return { planet: key, abbr: PLANET_ABBR[key] ?? key, p1: raw1, p2: raw2, sameSign: !!(s1 && s2 && s1 === s2) };
    }).filter(r => r.p1 || r.p2);
  }

  /** Extracts numeric house number from keys like "1st House", "2nd House", "12th House" */
  private parseHouseNum(houseKey: string): number {
    const m = houseKey.match(/(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  }

  /** Splits a comma/semicolon list of planet names and returns GridPlanet objects */
  private parsePlanets(val: string): GridPlanet[] {
    if (!val || val.trim().toLowerCase() === 'empty') return [];
    return val.split(/[,;]+/)
      .map(s => s.trim())
      .filter(s => s && s.toLowerCase() !== 'empty')
      .map(s => {
        const isRetro = /\(Retrograde\)/i.test(s) || s.includes('℞');
        const name    = s.replace(/\s*\(Retrograde\)/gi, '').replace(/℞/g, '').trim();
        const key     = name.toLowerCase();
        return { key, abbr: PLANET_ABBR[key] ?? name.slice(0, 4), isRetrograde: isRetro };
      });
  }

  private stripRetro(val: string): string {
    return val.replace(/\s*\(Retrograde\)/gi, '').replace(/℞/g, '').trim();
  }
}
