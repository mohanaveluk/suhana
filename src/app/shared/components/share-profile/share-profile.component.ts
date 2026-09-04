import {
  Component, ChangeDetectionStrategy, inject, signal, computed, OnInit,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatChipInputEvent } from '@angular/material/chips';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialModule } from '../../modules/material.module';
import { ApiService } from '../../../services/api.service';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../services';
import { UserProfile } from '../../../models/user.model';

export interface ShareProfileData {
  profileId?: string;
  profileCode: string;
  profileName?: string;
  profile?: UserProfile;
}

const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
const SESSION_KEY = 'sp_recent_emails';
const MAX_RECENT = 5;

@Component({
  selector: 'app-share-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [ReactiveFormsModule, MaterialModule],
  templateUrl: './share-profile.component.html',
  styleUrl: './share-profile.component.scss',
})
export class ShareProfileComponent implements OnInit {
  private readonly fb       = inject(FormBuilder);
  private readonly api      = inject(ApiService);
  private readonly authService     = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly dialogRef = inject<MatDialogRef<ShareProfileComponent>>(MatDialogRef);
  protected readonly data      = inject<ShareProfileData>(MAT_DIALOG_DATA);

  protected readonly shareUrl = `${window.location.origin}/view/${this.data.profileCode}`;

  // ── Chip separator keys ───────────────────────────────────────────────────
  protected readonly separatorKeyCodes = [ENTER, COMMA] as const;

  // ── State ─────────────────────────────────────────────────────────────────
  protected readonly emails         = signal<string[]>([]);
  protected readonly isLoading      = signal(false);
  protected readonly successState   = signal(false);
  protected readonly error          = signal<string | null>(null);
  protected readonly linkCopied     = signal(false);
  protected readonly recentEmails   = signal<string[]>([]);
  protected readonly sharedWithList = signal<string[]>([]);
  protected readonly emailError     = signal<string | null>(null);
  protected readonly showPreview    = signal(false);
  protected readonly previewHtml    = signal<SafeHtml | null>(null);
  protected readonly isPreviewLoading = signal(false);
  protected readonly previewError   = signal<string | null>(null);

  // ── Computed ──────────────────────────────────────────────────────────────
  /**
   * Reads formStatus(), not form.valid: computed() only re-runs when a *signal*
   * it read changes, and form.valid is a plain property. Reading it directly
   * meant that filling the form after adding an email never re-evaluated this,
   * so the submit button stayed disabled.
   */
  protected readonly canSubmit = computed(
    () => this.formStatus() === 'VALID' && this.emails().length > 0,
  );

  // ── Guest mode ──────────────────────────────────────────────────────────────
  protected readonly isAuthenticated = computed(() => this.authService.authenticated());
  protected readonly isGuest = computed(() => !this.isAuthenticated());  

  // ── Form ──────────────────────────────────────────────────────────────────
  protected readonly form = this.fb.nonNullable.group({
    receiverName: ['', [Validators.required, Validators.minLength(2)]],
    subject:    ["A Matrimony Profile I'd Like to Share With You", Validators.required],
    message:    ['', Validators.maxLength(1000)],
  });

  /**
   * Mirrors the form's validity into a signal so canSubmit() reacts to it.
   * Declared after `form` because toSignal() reads it eagerly, unlike computed().
   */
  private readonly formStatus = toSignal(this.form.statusChanges, {
    initialValue: this.form.status,
  });

  ngOnInit(): void {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) this.recentEmails.set(JSON.parse(stored));
    } catch { /* ignore */ }

    this.form.patchValue({
      message:
        `Hello,\n\nI found this profile and thought it may be of interest to you.\n\nProfile Link:\n${this.shareUrl}`,
    });
  }

  // ── Email chip management ─────────────────────────────────────────────────
  protected addEmailFromInput(event: MatChipInputEvent): void {
    const raw = (event.value ?? '').trim();
    event.chipInput?.clear();
    if (!raw) return;
    this.tryAddEmail(raw);
  }

  protected addRecentEmail(email: string): void {
    this.tryAddEmail(email);
  }

  protected removeEmail(email: string): void {
    this.emails.update(list => list.filter(e => e !== email));
    this.emailError.set(null);
  }

  protected onEmailInputPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const text = event.clipboardData?.getData('text') ?? '';
    const parts = text.split(/[,;\s\n]+/).map(s => s.trim()).filter(Boolean);
    parts.forEach(p => this.tryAddEmail(p));
  }

  private tryAddEmail(email: string): void {
    if (!EMAIL_RE.test(email)) {
      this.emailError.set(`"${email}" is not a valid email address.`);
      return;
    }
    if (this.emails().includes(email)) {
      this.emailError.set(`"${email}" is already added.`);
      return;
    }
    this.emailError.set(null);
    this.emails.update(list => [...list, email]);
  }

  // ── Link actions ──────────────────────────────────────────────────────────
  protected async copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.shareUrl);
    } catch {
      const el = document.createElement('textarea');
      el.value = this.shareUrl;
      Object.assign(el.style, { position: 'fixed', top: '0', left: '0', opacity: '0' });
      document.body.appendChild(el);
      el.focus();
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    this.linkCopied.set(true);
    this.snackBar.open('Link copied!', '✕', {
      duration: 2500,
      panelClass: ['af-snack', 'af-snack--success'],
    });
    setTimeout(() => this.linkCopied.set(false), 2500);
  }

  protected openInNewTab(): void {
    window.open(this.shareUrl, '_blank', 'noopener,noreferrer');
  }

  protected shareViaWhatsApp(): void {
    const text = encodeURIComponent(this.buildWhatsAppMessage());
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  }

  /**
   * Builds a WhatsApp-friendly "profile card" as plain text, using WhatsApp's
   * own bold/italic markdown for section headers. `wa.me`'s text deep link
   * has no way to attach an actual image — the photo only becomes visible once
   * the recipient opens the profile link — so the hero leads with a prompt to
   * tap through rather than repeating the link twice.
   */
  private buildWhatsAppMessage(): string {
    const p = this.data.profile;
    const name = this.data.profileName || (p ? `${p.firstName} ${p.lastName}`.trim() : '');

    if (!p) {
      // No full profile data was passed in — fall back to a simple link share.
      return `*Hi! I found this matrimonial profile that might interest you:*\n${this.shareUrl}`;
    }

    const lines: string[] = [];

    // ── Hero ──────────────────────────────────────────────────────────────────
    lines.push(`💑 *${name}*${p.age ? `, ${p.age} yrs` : ''}`);
    if (p.occupation?.title) lines.push(`💼 ${p.occupation.title}`);
    lines.push('👉 Photo & full profile below');
    lines.push('');

    // ── Personal Details ─────────────────────────────────────────────────────
    lines.push('📋 *Personal Details*');
    if (p.dateOfBirth) lines.push(`🎂 DOB: ${this.formatDate(p.dateOfBirth)}${p.age ? ` (${p.age} yrs)` : ''}`);
    if (p.height)       lines.push(`📏 Height: ${p.height}`);
    if (p.religion)     lines.push(`🛐 Religion: ${p.religion}${p.caste ? ` (${p.caste})` : ''}`);
    if (p.motherTongue) lines.push(`🗣️ Mother Tongue: ${p.motherTongue}`);
    const locationLine = [p.location?.city, p.location?.state, p.location?.country].filter(Boolean).join(', ');
    if (locationLine) lines.push(`📍 Location: ${locationLine}`);
    lines.push('');

    // ── Career & Education ───────────────────────────────────────────────────
    lines.push('🎓 *Career & Education*');
    if (p.education?.level) {
      const field = p.education.field ? ` in ${p.education.field}` : '';
      const inst  = p.education.institution ? ` (${p.education.institution})` : '';
      lines.push(`🏫 Education: ${p.education.level}${field}${inst}`);
    }
    if (p.occupation?.title) {
      const company = p.occupation.company ? ` at ${p.occupation.company}` : '';
      lines.push(`💼 Occupation: ${p.occupation.title}${company}`);
    }
    if (p.occupation?.annualIncome) lines.push(`💰 Annual Income: ${p.occupation.annualIncome}`);
    lines.push('');

    // ── Horoscope Details — hidden when rashi/nakshatra/manglikStatus are all empty ──
    const h = p.horoscope;
    if (h && (h.rashi || h.nakshatra || h.manglikStatus)) {
      lines.push('🔮 *Horoscope Details*');
      if (h.rashi)         lines.push(`🌙 Rashi: ${h.rashi}`);
      if (h.nakshatra)     lines.push(`⭐ Nakshatra: ${h.nakshatra}`);
      if (h.manglikStatus) lines.push(`🔴 Manglik Status: ${h.manglikStatus}`);
      lines.push('');
    }

    // ── Family Background — hidden when father/mother occupation, siblings, values are all empty ──
    const f = p.familyDetails;
    if (f && (f.fatherOccupation || f.motherOccupation || f.siblings || f.familyValues)) {
      lines.push('👨‍👩‍👧 *Family Background*');
      lines.push(`🏠 Family Type: ${f.familyType === 'joint' ? 'Joint' : 'Nuclear'}`);
      if (f.fatherOccupation)     lines.push(`👔 Father's Occupation: ${f.fatherOccupation}`);
      if (f.motherOccupation)     lines.push(`👗 Mother's Occupation: ${f.motherOccupation}`);
      if (f.siblings != null)     lines.push(`👫 Siblings: ${f.siblings}`);
      if (f.familyValues)         lines.push(`💫 Family Values: ${f.familyValues}`);
      lines.push('');
    }

    // ── Shared profile link ──────────────────────────────────────────────────
    lines.push('━━━━━━━━━━━━━━━');
    lines.push('🔗 *Shared Profile Link*');
    lines.push(this.shareUrl);
    lines.push('━━━━━━━━━━━━━━━');
    lines.push('_Shared via Aurora Matrimony_');

    return lines.join('\n');
  }

  private formatDate(value: Date | string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  /**
   * `mailto:` links open the user's own email client with a prefilled draft —
   * but the `body` parameter is defined (RFC 6068) as plain text only; no mail
   * client renders HTML from it, so there's no way to reuse the styled preview
   * template here. Built directly from `this.data.profile` instead, the same
   * way buildWhatsAppMessage() is — no network round-trip, always available.
   */
  protected shareViaEmailClient(): void {
    const v = this.form.value;
    const subject = encodeURIComponent(v.subject || "A Matrimony Profile I'd Like to Share With You");
    const body = encodeURIComponent(this.buildEmailMessage());
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  /** Builds the full plain-text profile card for the mailto: body — same section set as buildWhatsAppMessage(). */
  private buildEmailMessage(): string {
    const v = this.form.value;
    const p = this.data.profile;
    const name = this.data.profileName || (p ? `${p.firstName} ${p.lastName}`.trim() : 'this profile');
    const greeting = `Dear ${v.receiverName?.trim() || 'Friend'},`;
    const intro = v.message?.trim()
      || `I found this matrimonial profile and thought it may be of interest to you.`;

    if (!p) {
      // No full profile data was passed in — fall back to a simple link share.
      return `${greeting}\n\n${intro}\n\nProfile Link:\n${this.shareUrl}\n\n— Shared via Aurora Matrimony`;
    }

    const lines: string[] = [greeting, '', intro, ''];

    // ── Hero ──────────────────────────────────────────────────────────────────
    lines.push('========================================');
    lines.push(`${name}${p.age ? `, ${p.age} yrs` : ''}`);
    if (p.occupation?.title) lines.push(p.occupation.title);
    lines.push('========================================');
    lines.push('');

    // ── Personal Details ─────────────────────────────────────────────────────
    lines.push('PERSONAL DETAILS');
    if (p.dateOfBirth) lines.push(`  DOB: ${this.formatDate(p.dateOfBirth)}${p.age ? ` (${p.age} yrs)` : ''}`);
    if (p.height)       lines.push(`  Height: ${p.height}`);
    if (p.religion)     lines.push(`  Religion: ${p.religion}${p.caste ? ` (${p.caste})` : ''}`);
    if (p.motherTongue) lines.push(`  Mother Tongue: ${p.motherTongue}`);
    const locationLine = [p.location?.city, p.location?.state, p.location?.country].filter(Boolean).join(', ');
    if (locationLine) lines.push(`  Location: ${locationLine}`);
    lines.push('');

    // ── Career & Education ───────────────────────────────────────────────────
    lines.push('CAREER & EDUCATION');
    if (p.education?.level) {
      const field = p.education.field ? ` in ${p.education.field}` : '';
      const inst  = p.education.institution ? ` (${p.education.institution})` : '';
      lines.push(`  Education: ${p.education.level}${field}${inst}`);
    }
    if (p.occupation?.title) {
      const company = p.occupation.company ? ` at ${p.occupation.company}` : '';
      lines.push(`  Occupation: ${p.occupation.title}${company}`);
    }
    if (p.occupation?.annualIncome) lines.push(`  Annual Income: ${p.occupation.annualIncome}`);
    lines.push('');

    // ── Horoscope Details — hidden when rashi/nakshatra/manglikStatus are all empty ──
    const h = p.horoscope;
    if (h && (h.rashi || h.nakshatra || h.manglikStatus)) {
      lines.push('HOROSCOPE DETAILS');
      if (h.rashi)         lines.push(`  Rashi: ${h.rashi}`);
      if (h.nakshatra)     lines.push(`  Nakshatra: ${h.nakshatra}`);
      if (h.manglikStatus) lines.push(`  Manglik Status: ${h.manglikStatus}`);
      lines.push('');
    }

    // ── Family Background — hidden when father/mother occupation, siblings, values are all empty ──
    const f = p.familyDetails;
    if (f && (f.fatherOccupation || f.motherOccupation || f.siblings || f.familyValues)) {
      lines.push('FAMILY BACKGROUND');
      lines.push(`  Family Type: ${f.familyType === 'joint' ? 'Joint' : 'Nuclear'}`);
      if (f.fatherOccupation)     lines.push(`  Father's Occupation: ${f.fatherOccupation}`);
      if (f.motherOccupation)     lines.push(`  Mother's Occupation: ${f.motherOccupation}`);
      if (f.siblings != null)     lines.push(`  Siblings: ${f.siblings}`);
      if (f.familyValues)         lines.push(`  Family Values: ${f.familyValues}`);
      lines.push('');
    }

    // ── Shared profile link ──────────────────────────────────────────────────
    lines.push('----------------------------------------');
    lines.push('View Full Profile:');
    lines.push(this.shareUrl);
    lines.push('----------------------------------------');
    lines.push('');
    lines.push('— Shared via Aurora Matrimony');

    return lines.join('\n');
  }

  // ── Preview ───────────────────────────────────────────────────────────────
  /** "Show email preview" toggle — fetches the rendered template on each open, since form fields may have changed. */
  protected async togglePreview(): Promise<void> {
    const next = !this.showPreview();
    this.showPreview.set(next);
    if (next) await this.loadPreview();
  }

  private async loadPreview(): Promise<void> {
    this.isPreviewLoading.set(true);
    this.previewError.set(null);
    try {
      const payload = this.buildSharePayload(true);
      const res = this.isAuthenticated()
        ? await firstValueFrom(this.api.shareProfile(payload))
        : await firstValueFrom(this.api.shareProfileByGuest(payload));
      const html = res?.data ?? null;
      // Angular's [innerHTML] sanitizer strips the `style` attribute entirely
      // (it's not in its HTML_ATTRS allowlist), which is why the table's inline
      // background-color was silently dropped. This is our own backend's
      // templated response, not arbitrary third-party markup, so it's safe to
      // explicitly trust it and bypass that stripping.
      this.previewHtml.set(html ? this.sanitizer.bypassSecurityTrustHtml(html) : null);
    } catch (err: any) {
      this.previewError.set(err?.error?.message ?? 'Could not load preview. Please try again.');
    } finally {
      this.isPreviewLoading.set(false);
    }
  }

  private buildSharePayload(preview: boolean) {
    const v = this.form.value;
    return {
      profileId: this.data.profileId,
      profileCode: this.data.profileCode,
      // Falls back to "Friend" so a preview requested before the Receiver
      // Name field is filled in still renders a sensible greeting.
      receiverName: v.receiverName?.trim() || 'Friend',
      toEmail: this.emails(),
      shareUrl: this.shareUrl,
      subject: v.subject ?? '',
      body: v.message ?? '',
      preview,
    };
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  protected async sendShare(): Promise<void> {
    this.form.markAllAsTouched();
    if (!this.canSubmit()) {
      if (!this.emails().length) {
        this.emailError.set('Please add at least one recipient email address.');
      }
      return;
    }

    const authed = this.isAuthenticated();

    this.isLoading.set(true);
    this.error.set(null);

    try {
      const payload = this.buildSharePayload(false);
      if (!authed) {
        await firstValueFrom(this.api.shareProfileByGuest(payload));
      } else {
        await firstValueFrom(this.api.shareProfile(payload));
      }
      this.sharedWithList.set([...this.emails()]);
      this.saveRecentEmails(this.emails());
      this.successState.set(true);
    } catch (err: any) {
      this.error.set(
        err?.error?.message ?? 'We were unable to share the profile at this time. Please try again.',
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  protected shareAnother(): void {
    this.successState.set(false);
    this.emails.set([]);
    this.emailError.set(null);
    this.error.set(null);
    this.showPreview.set(false);
    this.previewHtml.set(null);
    this.previewError.set(null);
    this.form.patchValue({
      message:
        `Hello,\n\nI found this profile and thought it may be of interest to you.\n\nProfile Link:\n${this.shareUrl}`,
    });
  }

  protected close(): void {
    this.dialogRef.addPanelClass('sp-closing');
    setTimeout(() => this.dialogRef.close(), 280);
  }

  protected get messageLength(): number {
    return this.form.get('message')?.value?.length ?? 0;
  }

  private saveRecentEmails(newEmails: string[]): void {
    const current = this.recentEmails();
    const merged  = [...new Set([...newEmails, ...current])].slice(0, MAX_RECENT);
    this.recentEmails.set(merged);
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(merged)); } catch { /* ignore */ }
  }
}
