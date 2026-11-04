import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { UserProfile } from '../../../../models/user.model';

/** Brand contact details printed in the poster footer (static, same on every poster). */
export const POSTER_CONTACT = {
  phone: '92533 20011',
  website: 'www.auroramatrimony.com',
} as const;

/** Poster canvas size in CSS px — 9:16, so it also fits Instagram stories / WhatsApp status. */
export const POSTER_WIDTH = 768;
export const POSTER_HEIGHT = 1376;

interface Row { k: string; v: string; }

/** Material icon outlines as inline SVG paths — webfont ligatures are unreliable inside html2canvas. */
const ICONS = {
  person: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
  school: 'M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z',
  star: 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
  heart: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
  group: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
  shield: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z',
  phone: 'M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z',
} as const;

/** Where each house number sits in a North-Indian style chart (viewBox 200×200). House 1 is the top diamond. */
const HOUSE_LABELS: ReadonlyArray<{ n: number; x: number; y: number }> = [
  { n: 1, x: 100, y: 44 }, { n: 2, x: 50, y: 24 }, { n: 3, x: 24, y: 52 }, { n: 4, x: 48, y: 104 },
  { n: 5, x: 24, y: 152 }, { n: 6, x: 50, y: 182 }, { n: 7, x: 100, y: 156 }, { n: 8, x: 150, y: 182 },
  { n: 9, x: 176, y: 152 }, { n: 10, x: 152, y: 104 }, { n: 11, x: 176, y: 52 }, { n: 12, x: 150, y: 24 },
];

/**
 * The shareable "profile card" — a fixed 768×1376 poster rendered from a profile.
 * Presentational only: ShareToMediaComponent rasterises it with html2canvas.
 *
 * Privacy: only fields that appear in the public profile card are shown. Street address,
 * parents' names, phone numbers and the like are deliberately never read here.
 */
@Component({
  selector: 'app-profile-poster',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile-poster.component.html',
  styleUrl: './profile-poster.component.scss',
})
export class ProfilePosterComponent {
  readonly profile = input.required<UserProfile>();
  /** Same-origin/blob URL of the primary photo; null renders the placeholder. */
  readonly photoSrc = input<string | null>(null);
  /** Blob/data URL of the brand logo. A remote logo URL can't be exported by html2canvas, so the host supplies a local copy. */
  readonly logoSrc = input<string | null>(null);
  protected readonly logoCss = computed(() => (this.logoSrc() ? `url("${this.logoSrc()}")` : null));

  protected readonly icons = ICONS;
  protected readonly houses = HOUSE_LABELS;
  protected readonly contact = POSTER_CONTACT;

  protected readonly isBride = computed(() => String(this.profile().gender ?? '').toLowerCase() === 'bride');
  protected readonly title = computed(() => (this.isBride() ? 'BRIDE PROFILE' : 'GROOM PROFILE'));
  protected readonly name = computed(() => `${this.profile().firstName ?? ''} ${this.profile().lastName ?? ''}`.trim());
  protected readonly code = computed(() => this.profile().profileCode ?? '');

  protected readonly meta = computed(() => {
    const p = this.profile();
    return [
      p.age ? `${p.age} yrs` : '',
      p.height ?? '',
      [p.location?.city, p.location?.state].filter(Boolean).join(', '),
    ].filter(Boolean).join(' · ');
  });

  protected readonly tagline = computed(() => {
    const text = (this.profile().aboutMe ?? '').replace(/\s+/g, ' ').trim();
    if (!text) return '';
    if (text.length <= 130) return text;
    const cut = text.slice(0, 130);
    return cut.slice(0, cut.lastIndexOf(' ') > 80 ? cut.lastIndexOf(' ') : 130).replace(/[,.;:\s]+$/, '') + '…';
  });

  protected readonly personal = computed<Row[]>(() => {
    const p = this.profile();
    const h = p.horoscope;
    const familyType = p.familyDetails?.familyType;
    return this.rows([
      ['Date of birth', this.formatDate(h?.dateOfBirth ?? p.dateOfBirth)],
      ['Time of birth', h?.timeOfBirth ?? ''],
      ['Religion', p.religion],
      ['Community', p.caste],
      ['Mother tongue', p.motherTongue],
      ['Height', p.height],
      ['Family type', familyType ? `${this.capitalize(String(familyType))} family` : ''],
      ['Native / Lives in', [p.location?.city, p.location?.country].filter(Boolean).join(', ')],
    ]);
  });

  protected readonly career = computed<Row[]>(() => {
    const p = this.profile();
    const level = p.education?.level ?? '';
    const education = level && p.education?.field ? `${level} – ${p.education.field}` : level;
    const occupation = [p.occupation?.title, p.occupation?.company].filter(Boolean).join(', ');
    return this.rows([
      ['Education', education],
      ['Institution', p.education?.institution],
      ['Occupation', occupation],
      ['Annual income', p.occupation?.annualIncome],
      ['Working status', p.occupation?.workingStatus],
    ]);
  });

  protected readonly horoscope = computed<Row[]>(() => {
    const h = this.profile().horoscope;
    return this.rows([
      ['Rashi (Moon sign)', h?.rashi],
      ['Nakshatra', h?.nakshatra],
      ['Lagna', h?.lagna],
      ['Manglik status', h?.manglikStatus],
    ]);
  });

  protected readonly hasLagna = computed(() => !!this.profile().horoscope?.lagna);

  protected readonly preferences = computed<Row[]>(() => {
    const pr = this.profile().preferences;
    if (!pr) return [];
    const age = pr.ageRange?.min && pr.ageRange?.max ? `${pr.ageRange.min} – ${pr.ageRange.max} years` : '';
    return this.rows([
      ['Age', age],
      ['Religion', (pr.religions ?? []).join(' / ')],
      ['Education', (pr.education ?? []).join(' / ')],
    ]);
  });

  protected readonly highlights = [
    { icon: ICONS.group, label: 'All communities welcome' },
    { icon: ICONS.star, label: 'Horoscope matching' },
    { icon: ICONS.shield, label: 'Privacy-protected profiles' },
    { icon: ICONS.heart, label: 'Personal matchmaking support' },
  ];

  private rows(pairs: ReadonlyArray<readonly [string, string | null | undefined]>): Row[] {
    return pairs
      .filter(([, v]) => !!v && String(v).trim())
      .map(([k, v]) => ({ k, v: String(v).trim() }));
  }

  private capitalize(s: string): string {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  }

  private formatDate(value?: Date | string | null): string {
    if (!value) return '';
    // A date-only value ("1995-03-12" or "1995-03-12T00:00:00Z") means that calendar day — build it
    // in local time, or negative-offset time zones show the previous day.
    const m = typeof value === 'string' ? /^(\d{4})-(\d{2})-(\d{2})/.exec(value) : null;
    const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(value);
    return Number.isNaN(d.getTime())
      ? ''
      : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  }
}
