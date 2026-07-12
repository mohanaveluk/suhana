import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import type { UserProfile } from '../../models/user.model';
import type { KundliMatching } from '../horoscope-match/horoscope-match.model';
import type { ProfileMatchReport } from './profile-match.component';

// ─────────────────────────────────────────────────────────────────────────────
// Report data model (decoupled from Angular / the DOM)
// ─────────────────────────────────────────────────────────────────────────────

export interface ReportPartner {
  role: 'Bride' | 'Groom';
  name: string;
  profileCode: string;
  age: string;
  height: string;
  education: string;
  profession: string;
  location: string;
  religion: string;
  motherTongue: string;
  rashi: string;
  nakshatra: string;
  manglik: string;
}

export interface ReportCategory {
  title: string;
  score: number;
  comment: string;
}

export interface ReportKoota {
  label: string;
  score: number;
  maxScore: number;
  description: string;
}

export interface ReportKundli {
  totalScore: number;
  maxScore: number;
  compatibilityPercentage: number;
  category: string;
  kootas: ReportKoota[];
}

export interface CompatibilityReportData {
  reportId: string;
  generatedAt: Date;
  fileName: string;
  overallPercentage: number;
  matchLabel: string;
  recommendation: string;
  bride: ReportPartner;
  groom: ReportPartner;
  categories: ReportCategory[];
  strengths: string[];
  challenges: string[];
  horoscopeMatchScore: number;
  horoscopeMatchComment: string;
  kundli: ReportKundli | null;
}

export interface GenerateReportInput {
  myProfile: UserProfile;
  theirProfile: UserProfile;
  report: ProfileMatchReport;
  kundli: KundliMatching | null;
}

type RGB = [number, number, number];
interface Cursor { y: number; }
interface Cell { text: string; color?: RGB; bold?: boolean; }
interface Col { header: string; width: number; align?: 'left' | 'center'; }

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class PdfReportService {
  // A4 portrait geometry (mm)
  private readonly PAGE_W = 210;
  private readonly PAGE_H = 297;
  private readonly M = 15;
  private readonly CONTENT_W = 180;   // PAGE_W - 2*M
  private readonly BOTTOM = 273;      // content cutoff before the footer band

  // Blue theme palette
  private readonly NAVY: RGB  = [26, 54, 93];
  private readonly BLUE: RGB  = [43, 108, 176];
  private readonly LIGHT: RGB = [235, 242, 250];
  private readonly INK: RGB   = [33, 41, 54];
  private readonly GRAY: RGB  = [120, 130, 142];
  private readonly LINE: RGB  = [212, 220, 230];

  /**
   * Maps the on-screen match data into a self-contained report model.
   * Bride/Groom roles are derived from gender.
   */
  generateCompatibilityReport(input: GenerateReportInput): CompatibilityReportData {
    const { myProfile, theirProfile, report, kundli } = input;

    const bride = myProfile.gender === 'bride' ? myProfile : theirProfile;
    const groom = myProfile.gender === 'groom' ? myProfile : theirProfile;

    const categories: ReportCategory[] = report.categories.map(c => ({
      title: c.title,
      score: c.percentage,
      comment: c.explanation,
    }));

    const byTitle = (title: string) => categories.find(c => c.title === title)?.score ?? 0;
    const strengths = report.strengthAreas.map(t => `Strong ${t} compatibility (${byTitle(t)}%)`);
    const challenges = report.weakAreas.map(t => `${t} may need mutual understanding (${byTitle(t)}%)`);
    if (report.commonInterests.length) {
      strengths.push(`Shared interests: ${report.commonInterests.join(', ')}`);
    }

    const horoscopeCat = report.categories.find(c => c.key === 'horoscope');

    const generatedAt = new Date();
    const brideCode = (bride.profileCode || 'NA').replace(/[^A-Za-z0-9]/g, '');
    const groomCode = (groom.profileCode || 'NA').replace(/[^A-Za-z0-9]/g, '');

    return {
      reportId: `SM-${brideCode}-${groomCode}-${this.stamp(generatedAt)}`,
      generatedAt,
      fileName: `Suhana_Match_Report_${brideCode}_${groomCode}.pdf`,
      overallPercentage: report.overallPercentage,
      matchLabel: report.matchLabel,
      recommendation: report.recommendation,
      bride: this.toPartner(bride, 'Bride'),
      groom: this.toPartner(groom, 'Groom'),
      categories,
      strengths,
      challenges,
      horoscopeMatchScore: horoscopeCat?.percentage ?? 0,
      horoscopeMatchComment: horoscopeCat?.explanation ?? 'Horoscope details are not available for this match.',
      kundli: kundli ? this.toKundli(kundli) : null,
    };
  }

  /** Builds the multi-page A4 PDF document from the report model. */
  generatePdf(data: CompatibilityReportData): jsPDF {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const cur: Cursor = { y: 0 };

    this.drawHeader(doc, cur, data);
    this.drawPartners(doc, cur, data);
    this.drawSummary(doc, cur, data);
    this.drawCategories(doc, cur, data);
    this.drawHoroscope(doc, cur, data);
    this.drawBullets(doc, cur, 'Relationship Strengths', data.strengths, [56, 142, 60]);
    this.drawBullets(doc, cur, 'Potential Challenges', data.challenges, [239, 108, 0]);
    this.drawRecommendation(doc, cur, data);
    this.drawFooters(doc, data);

    return doc;
  }

  /** Triggers the browser download of a generated document. */
  downloadPdf(doc: jsPDF, fileName: string): void {
    doc.save(fileName);
  }

  // ── Mapping helpers ──────────────────────────────────────────────────────────
  private toPartner(p: UserProfile, role: 'Bride' | 'Groom'): ReportPartner {
    const loc = [p.location?.city, p.location?.state, p.location?.country].filter(Boolean).join(', ');
    return {
      role,
      name: `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() || '—',
      profileCode: p.profileCode || '—',
      age: p.age != null ? `${p.age} yrs` : '—',
      height: p.height || '—',
      education: [p.education?.level, p.education?.field].filter(Boolean).join(' – ') || '—',
      profession: [p.occupation?.title, p.occupation?.company].filter(Boolean).join(', ') || '—',
      location: loc || '—',
      religion: [p.religion, p.caste].filter(Boolean).join(' / ') || '—',
      motherTongue: p.motherTongue || '—',
      rashi: p.horoscope?.rashi || '—',
      nakshatra: p.horoscope?.nakshatra || '—',
      manglik: p.horoscope?.manglikStatus || '—',
    };
  }

  private toKundli(k: KundliMatching): ReportKundli {
    const kootas: ReportKoota[] = [
      { label: 'Varna',        ...k.varna },
      { label: 'Vashya',       ...k.vashya },
      { label: 'Tara',         ...k.tara },
      { label: 'Yoni',         ...k.yoni },
      { label: 'Graha Maitri', ...k.grahaMaitri },
      { label: 'Gana',         ...k.gana },
      { label: 'Bhakoot',      ...k.bhakoot },
      { label: 'Nadi',         ...k.nadi },
    ].map(e => ({ label: e.label, score: e.score, maxScore: e.maxScore, description: e.description }));
    return {
      totalScore: k.totalScore,
      maxScore: k.maxScore,
      compatibilityPercentage: k.compatibilityPercentage,
      category: k.compatibilityCategory,
      kootas,
    };
  }

  // ── Section renderers ────────────────────────────────────────────────────────
  private drawHeader(doc: jsPDF, cur: Cursor, data: CompatibilityReportData): void {
    doc.setFillColor(...this.NAVY);
    doc.rect(0, 0, this.PAGE_W, 34, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(20);
    doc.text('Suhana Matrimony', this.M, 15);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
    doc.text('AI Match Compatibility Report', this.M, 23);

    doc.setFont('helvetica', 'bold'); doc.setFontSize(24);
    doc.text(`${data.overallPercentage}%`, this.PAGE_W - this.M, 16, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.text(data.matchLabel, this.PAGE_W - this.M, 22, { align: 'right' });

    cur.y = 41;
    doc.setTextColor(...this.GRAY); doc.setFontSize(8.5);
    doc.text(`Report ID: ${data.reportId}`, this.M, cur.y);
    doc.text(`Generated: ${this.formatDateTime(data.generatedAt)}`, this.PAGE_W - this.M, cur.y, { align: 'right' });
    cur.y += 3;
    doc.setDrawColor(...this.LINE);
    doc.line(this.M, cur.y, this.PAGE_W - this.M, cur.y);
    cur.y += 3;
    doc.setTextColor(...this.INK);
  }

  private drawPartners(doc: jsPDF, cur: Cursor, data: CompatibilityReportData): void {
    this.sectionHeading(doc, cur, 'Partner Information');

    const gap = 6;
    const colW = (this.CONTENT_W - gap) / 2;
    const labelW = 26;
    const valueW = colW - labelW - 6;
    const lineH = 4.6;

    const rowsOf = (p: ReportPartner): [string, string][] => ([
      ['Name', p.name], ['Profile Code', p.profileCode], ['Age', p.age],
      ['Height', p.height], ['Education', p.education], ['Profession', p.profession],
      ['Location', p.location], ['Religion', p.religion], ['Mother Tongue', p.motherTongue],
    ]);

    doc.setFontSize(8.5);
    const measure = (rows: [string, string][]): number =>
      rows.reduce((h, [, v]) => h + doc.splitTextToSize(v, valueW).length * lineH + 1.4, 0);

    const bodyH = Math.max(measure(rowsOf(data.bride)), measure(rowsOf(data.groom)));
    const cardH = bodyH + 12;

    this.ensureSpace(doc, cur, cardH + 2);

    const drawCard = (x: number, p: ReportPartner): void => {
      doc.setDrawColor(...this.LINE);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(x, cur.y, colW, cardH, 2, 2, 'FD');
      // title bar
      doc.setFillColor(...this.BLUE);
      doc.roundedRect(x, cur.y, colW, 8, 2, 2, 'F');
      doc.rect(x, cur.y + 4, colW, 4, 'F');
      doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
      doc.text(`${p.role} Information`, x + 3, cur.y + 5.6);

      let ry = cur.y + 12;
      doc.setFontSize(8.5);
      for (const [label, value] of rowsOf(p)) {
        const lines = doc.splitTextToSize(value, valueW);
        doc.setFont('helvetica', 'bold'); doc.setTextColor(...this.GRAY);
        doc.text(label, x + 3, ry);
        doc.setFont('helvetica', 'normal'); doc.setTextColor(...this.INK);
        doc.text(lines, x + 3 + labelW, ry);
        ry += lines.length * lineH + 1.4;
      }
    };

    drawCard(this.M, data.bride);
    drawCard(this.M + colW + gap, data.groom);
    cur.y += cardH + 2;
    doc.setTextColor(...this.INK);
  }

  private drawSummary(doc: jsPDF, cur: Cursor, data: CompatibilityReportData): void {
    this.sectionHeading(doc, cur, 'Match Summary');
    this.ensureSpace(doc, cur, 28);

    const color = this.scoreRGB(data.overallPercentage);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(30); doc.setTextColor(...color);
    doc.text(`${data.overallPercentage}%`, this.M, cur.y + 9);

    doc.setFontSize(13); doc.setTextColor(...this.NAVY);
    doc.text(data.matchLabel, this.M + 34, cur.y + 4);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...this.GRAY);
    doc.text('Overall Compatibility Score', this.M + 34, cur.y + 9);

    cur.y += 14;
    const barH = 5;
    doc.setFillColor(...this.LIGHT);
    doc.roundedRect(this.M, cur.y, this.CONTENT_W, barH, 2, 2, 'F');
    doc.setFillColor(...color);
    doc.roundedRect(this.M, cur.y, Math.max(2, this.CONTENT_W * data.overallPercentage / 100), barH, 2, 2, 'F');
    cur.y += barH + 6;
    doc.setTextColor(...this.INK);
  }

  private drawCategories(doc: jsPDF, cur: Cursor, data: CompatibilityReportData): void {
    this.sectionHeading(doc, cur, 'Compatibility Breakdown');
    const cols: Col[] = [
      { header: 'Category', width: 50 },
      { header: 'Score', width: 22, align: 'center' },
      { header: 'Comments', width: 108 },
    ];
    const rows: Cell[][] = data.categories.map(c => ([
      { text: c.title, bold: true },
      { text: `${c.score}%`, color: this.scoreRGB(c.score), bold: true },
      { text: c.comment },
    ]));
    this.drawTable(doc, cur, cols, rows);
  }

  private drawHoroscope(doc: jsPDF, cur: Cursor, data: CompatibilityReportData): void {
    this.sectionHeading(doc, cur, 'Horoscope Matching');

    // Per-partner basics (always available)
    this.ensureSpace(doc, cur, 16);
    doc.setFontSize(8.5);
    const basics = (p: ReportPartner) => `${p.role}:  Rashi ${p.rashi}  |  Nakshatra ${p.nakshatra}  |  Manglik ${p.manglik}`;
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...this.INK);
    doc.text(basics(data.bride), this.M, cur.y + 2);
    doc.text(basics(data.groom), this.M, cur.y + 7);
    cur.y += 12;

    if (data.kundli) {
      const k = data.kundli;
      this.ensureSpace(doc, cur, 10);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...this.NAVY);
      doc.text(
        `Kundli Matching Summary — ${k.totalScore}/${k.maxScore} Gunas (${k.compatibilityPercentage}%) · ${k.category}`,
        this.M, cur.y + 2,
      );
      cur.y += 6;

      const cols: Col[] = [
        { header: 'Koota', width: 38 },
        { header: 'Score', width: 26, align: 'center' },
        { header: 'Description', width: 116 },
      ];
      const rows: Cell[][] = k.kootas.map(ko => ([
        { text: ko.label, bold: true },
        { text: `${ko.score} / ${ko.maxScore}`, color: this.ratioRGB(ko.score, ko.maxScore), bold: true },
        { text: ko.description },
      ]));
      this.drawTable(doc, cur, cols, rows);
    } else {
      const lines = doc.splitTextToSize(
        `Horoscope Match: ${data.horoscopeMatchScore}% — ${data.horoscopeMatchComment}`,
        this.CONTENT_W - 4,
      );
      const h = lines.length * 5 + 6;
      this.ensureSpace(doc, cur, h);
      doc.setFillColor(...this.LIGHT);
      doc.roundedRect(this.M, cur.y, this.CONTENT_W, h, 2, 2, 'F');
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...this.INK);
      doc.text(lines, this.M + 3, cur.y + 5);
      cur.y += h + 2;
    }
  }

  private drawBullets(doc: jsPDF, cur: Cursor, title: string, items: string[], marker: RGB): void {
    if (!items.length) return;
    this.sectionHeading(doc, cur, title);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
    for (const item of items) {
      const lines = doc.splitTextToSize(item, this.CONTENT_W - 8);
      const h = lines.length * 5 + 1.5;
      this.ensureSpace(doc, cur, h);
      doc.setFillColor(...marker);
      doc.circle(this.M + 1.6, cur.y + 1.4, 1.1, 'F');
      doc.setTextColor(...this.INK);
      doc.text(lines, this.M + 6, cur.y + 2.5);
      cur.y += h;
    }
    cur.y += 1;
  }

  private drawRecommendation(doc: jsPDF, cur: Cursor, data: CompatibilityReportData): void {
    this.sectionHeading(doc, cur, 'AI Recommendation');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
    const lines = doc.splitTextToSize(data.recommendation, this.CONTENT_W - 8);
    const h = lines.length * 5 + 8;
    this.ensureSpace(doc, cur, h);
    doc.setFillColor(...this.LIGHT);
    doc.roundedRect(this.M, cur.y, this.CONTENT_W, h, 2, 2, 'F');
    doc.setDrawColor(...this.BLUE);
    doc.setLineWidth(0.8);
    doc.line(this.M, cur.y, this.M, cur.y + h);
    doc.setLineWidth(0.2);
    doc.setTextColor(...this.NAVY);
    doc.text(lines, this.M + 4, cur.y + 6);
    cur.y += h + 2;
  }

  // ── Generic table with wrapping + page breaks ─────────────────────────────────
  private drawTable(doc: jsPDF, cur: Cursor, cols: Col[], rows: Cell[][]): void {
    const pad = 2.5, lineH = 4.4, headerH = 8;

    const drawHeaderRow = (): void => {
      doc.setFillColor(...this.BLUE);
      doc.rect(this.M, cur.y, this.CONTENT_W, headerH, 'F');
      doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
      let x = this.M;
      for (const c of cols) {
        const tx = c.align === 'center' ? x + c.width / 2 : x + pad;
        doc.text(c.header, tx, cur.y + 5.4, c.align === 'center' ? { align: 'center' } : undefined);
        x += c.width;
      }
      cur.y += headerH;
      doc.setTextColor(...this.INK); doc.setFont('helvetica', 'normal');
    };

    this.ensureSpace(doc, cur, headerH + 14);
    drawHeaderRow();

    let alt = false;
    for (const row of rows) {
      doc.setFontSize(8.5);
      let maxLines = 1;
      const wrapped = row.map((cell, i) => {
        const lines = doc.splitTextToSize(cell.text || '—', cols[i].width - 2 * pad);
        maxLines = Math.max(maxLines, lines.length);
        return lines;
      });
      const rowH = maxLines * lineH + 3;

      if (cur.y + rowH > this.BOTTOM) {
        doc.addPage();
        cur.y = this.M + 6;
        drawHeaderRow();
      }

      if (alt) {
        doc.setFillColor(...this.LIGHT);
        doc.rect(this.M, cur.y, this.CONTENT_W, rowH, 'F');
      }

      let x = this.M;
      for (let i = 0; i < cols.length; i++) {
        const cell = row[i];
        doc.setTextColor(...(cell.color ?? this.INK));
        doc.setFont('helvetica', cell.bold ? 'bold' : 'normal');
        const tx = cols[i].align === 'center' ? x + cols[i].width / 2 : x + pad;
        doc.text(wrapped[i], tx, cur.y + 5, cols[i].align === 'center' ? { align: 'center' } : undefined);
        x += cols[i].width;
      }

      doc.setDrawColor(...this.LINE);
      doc.line(this.M, cur.y + rowH, this.M + this.CONTENT_W, cur.y + rowH);
      cur.y += rowH;
      alt = !alt;
    }
    cur.y += 3;
    doc.setTextColor(...this.INK); doc.setFont('helvetica', 'normal');
  }

  // ── Footer / page numbers (run after all content is laid out) ─────────────────
  private drawFooters(doc: jsPDF, data: CompatibilityReportData): void {
    const total = doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      doc.setDrawColor(...this.LINE);
      doc.line(this.M, this.PAGE_H - 14, this.PAGE_W - this.M, this.PAGE_H - 14);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...this.GRAY);
      doc.text('Generated by Suhana Matrimony AI Matchmaking Engine', this.M, this.PAGE_H - 9);
      doc.text('www.suhana.com', this.M, this.PAGE_H - 5);
      doc.text(`Page ${i} of ${total}`, this.PAGE_W - this.M, this.PAGE_H - 9, { align: 'right' });
      doc.text(this.formatDateTime(data.generatedAt), this.PAGE_W - this.M, this.PAGE_H - 5, { align: 'right' });
    }
  }

  // ── Low-level helpers ─────────────────────────────────────────────────────────
  private sectionHeading(doc: jsPDF, cur: Cursor, title: string): void {
    this.ensureSpace(doc, cur, 16);
    cur.y += 4;
    doc.setFillColor(...this.NAVY);
    doc.roundedRect(this.M, cur.y, this.CONTENT_W, 8, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5);
    doc.text(title.toUpperCase(), this.M + 3, cur.y + 5.6);
    cur.y += 12;
    doc.setTextColor(...this.INK); doc.setFont('helvetica', 'normal');
  }

  private ensureSpace(doc: jsPDF, cur: Cursor, needed: number): void {
    if (cur.y + needed > this.BOTTOM) {
      doc.addPage();
      cur.y = this.M + 6;
    }
  }

  private scoreRGB(pct: number): RGB {
    if (pct >= 85) return [56, 142, 60];
    if (pct >= 70) return [43, 108, 176];
    if (pct >= 55) return [239, 108, 0];
    return [211, 47, 47];
  }

  private ratioRGB(score: number, max: number): RGB {
    return this.scoreRGB(max > 0 ? (score / max) * 100 : 0);
  }

  private formatDateTime(d: Date): string {
    return d.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  private stamp(d: Date): string {
    const p = (n: number) => `${n}`.padStart(2, '0');
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}`;
  }
}
