import {
  Component, ChangeDetectionStrategy, DestroyRef, ElementRef, inject, signal, computed, viewChild, OnInit,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatChipInputEvent } from '@angular/material/chips';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialModule } from '../../modules/material.module';
import { ApiService } from '../../../services/api.service';
import { debounceTime, firstValueFrom } from 'rxjs';
import { AuthService } from '../../../services';
import { UserProfile } from '../../../models/user.model';
import { renderElementToJpeg } from '../../utils/html-capture.util';

export interface ShareProfileData {
  profileId?: string;
  profileCode: string;
  profileName?: string;
  profile?: UserProfile;
}

const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
const SESSION_KEY = 'sp_recent_emails';
const MAX_RECENT = 5;
/** Width (CSS px) the profile content is rendered at when it is turned into an image. */
const CARD_WIDTH = 640;

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

  private readonly emailInput = viewChild<ElementRef<HTMLInputElement>>('emailInput');

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
  /** Which quick-share button is currently building + uploading the profile image. */
  protected readonly mediaBusy      = signal<'idle' | 'whatsapp' | 'email'>('idle');
  protected readonly mediaNote      = signal<string | null>(null);
  private readonly destroyRef = inject(DestroyRef);
  /** Uploaded image URL / rendered JPEG for the current receiver name + message (the preview text depends on both). */
  private cardCache: { key: string; url: string } | null = null;
  private cardBlob: { key: string; blob: Blob } | null = null;
  private cardPending: { key: string; promise: Promise<Blob> } | null = null;

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
    // Build the profile image ahead of time (and again, debounced, whenever the receiver name or message
    // changes). Share sheets and the clipboard only work shortly after a click, so by the time WhatsApp is
    // pressed the JPEG must already exist.
    const warm = () => { void this.renderCardBlob().catch(() => undefined); };
    setTimeout(warm, 0);
    this.form.valueChanges.pipe(debounceTime(800), takeUntilDestroyed(this.destroyRef)).subscribe(warm);

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

  /**
   * Turns whatever is still typed in the recipient box into chips, exactly as pressing
   * Enter would. Returns false if some of it is not a valid address (it is left in the
   * box and an error is shown) so callers can stop instead of sending without it.
   */
  private commitPendingEmail(): boolean {
    const input = this.emailInput()?.nativeElement;
    const raw = (input?.value ?? '').trim();
    if (!input || !raw) return true;

    const leftovers: string[] = [];
    for (const part of raw.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean)) {
      const result = this.tryAddEmail(part);
      if (result === 'invalid') leftovers.push(part);
    }
    input.value = leftovers.join(', ');
    if (leftovers.length === 0) this.emailError.set(null); // a duplicate is not a reason to block sending
    return leftovers.length === 0;
  }

  /** 'added' | 'duplicate' (already in the list — harmless) | 'invalid' */
  private tryAddEmail(email: string): 'added' | 'duplicate' | 'invalid' {
    if (!EMAIL_RE.test(email)) {
      this.emailError.set(`"${email}" is not a valid email address.`);
      return 'invalid';
    }
    if (this.emails().includes(email)) {
      this.emailError.set(`"${email}" is already added.`);
      return 'duplicate';
    }
    this.emailError.set(null);
    this.emails.update(list => [...list, email]);
    return 'added';
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

  /**
   * Sends the profile image to WhatsApp as an actual attachment.
   *  1. Share sheet with the JPEG file (phones, and desktops whose browser supports file sharing; pick
   *     WhatsApp there). The file travels with a short caption — no link to the image.
   *  2. Otherwise the image is copied to the clipboard and WhatsApp opens: paste it (Ctrl+V) into the chat.
   *     A web page cannot attach a file to a chat window by itself.
   *  3. Last resort (clipboard blocked): the image is uploaded (profile-media/{profileId}-{datetime}.jpg)
   *     and its URL goes in the message.
   */
  protected async shareViaWhatsApp(): Promise<void> {
    if (this.mediaBusy() !== 'idle') return;
    this.mediaBusy.set('whatsapp');
    this.mediaNote.set(null);

    const canShareFile = this.supportsFileShare();
    // No share sheet: open the tab right now, inside the click, and point it at WhatsApp afterwards
    // (browsers block window.open after a slow await).
    const win = canShareFile ? null : window.open('', '_blank');
    if (win) win.document.title = 'Preparing…';
    const go = (target: string) => {
      if (win) { win.opener = null; win.location.href = target; }
      else window.open(target, '_blank', 'noopener,noreferrer');
    };

    try {
      let blob: Blob | null = null;
      try { blob = await this.renderCardBlob(); } catch { /* handled below */ }

      if (blob && canShareFile) {
        const file = new File([blob], `${this.data.profileCode}-profile.jpg`, { type: 'image/jpeg' });
        try {
          await navigator.share({ files: [file], text: this.shortCaption() });
          return;
        } catch (err) {
          if ((err as DOMException)?.name === 'AbortError') return; // member closed the share sheet
          // share sheet failed for another reason — fall through to the clipboard route
        }
      }

      if (blob) {
        try {
          await this.copyImageToClipboard(blob);
          go(`https://wa.me/?text=${encodeURIComponent(this.shortCaption())}`);
          this.snackBar.open('Profile image copied — open the chat and paste it (Ctrl+V) to attach it.', '✕', {
            duration: 8000,
            panelClass: ['af-snack', 'af-snack--success'],
          });
          return;
        } catch { /* clipboard not available — use the link route */ }
      }

      const imageUrl = await this.prepareCardImage();
      go(`https://wa.me/?text=${encodeURIComponent(this.buildWhatsAppMessage(imageUrl))}`);
    } finally {
      this.mediaBusy.set('idle');
    }
  }

  private shortCaption(): string {
    const p = this.data.profile;
    const name = this.data.profileName || (p ? `${p.firstName} ${p.lastName}`.trim() : '');
    return [
      `💑 *${name}*${p?.age ? `, ${p.age} yrs` : ''}`,
      `🔗 Full profile: ${this.shareUrl}`,
      '',
      '_Shared via Aurora Matrimony_',
    ].join('\n');
  }

  private supportsFileShare(): boolean {
    try {
      return typeof navigator.canShare === 'function'
        && navigator.canShare({ files: [new File(['x'], 'x.jpg', { type: 'image/jpeg' })] });
    } catch {
      return false;
    }
  }

  /** Browsers only accept PNG for image clipboard items, so the JPEG is re-encoded. */
  private async copyImageToClipboard(jpeg: Blob): Promise<void> {
    if (!navigator.clipboard || typeof ClipboardItem === 'undefined') throw new Error('Clipboard images are not supported.');
    const bmp = await createImageBitmap(jpeg);
    const canvas = document.createElement('canvas');
    canvas.width = bmp.width;
    canvas.height = bmp.height;
    canvas.getContext('2d')!.drawImage(bmp, 0, 0);
    const png = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png'));
    if (!png) throw new Error('Could not prepare the image.');
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
  }

  /**
   * Builds a WhatsApp-friendly "profile card" as plain text, using WhatsApp's
   * own bold/italic markdown for section headers. `wa.me`'s text deep link
   * has no way to attach an actual image — the photo only becomes visible once
   * the recipient opens the profile link — so the hero leads with a prompt to
   * tap through rather than repeating the link twice.
   */
  private buildWhatsAppMessage(imageUrl?: string | null): string {
    const p = this.data.profile;
    const name = this.data.profileName || (p ? `${p.firstName} ${p.lastName}`.trim() : '');

    // With the profile image uploaded, the image carries the details — keep the text short.
    // The image URL leads so WhatsApp shows it as the link preview.
    if (imageUrl) {
      return [imageUrl, '', this.shortCaption()].join('\n');
    }

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
  protected async shareViaEmailClient(): Promise<void> {
    if (this.mediaBusy() !== 'idle') return;
    this.mediaBusy.set('email');
    try {
      const imageUrl = await this.prepareCardImage();
      const v = this.form.value;
      const subject = encodeURIComponent(v.subject || "A Matrimony Profile I'd Like to Share With You");
      const body = encodeURIComponent(this.buildEmailMessage(imageUrl));
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
    } finally {
      this.mediaBusy.set('idle');
    }
  }

  /** Builds the full plain-text profile card for the mailto: body — same section set as buildWhatsAppMessage(). */
  private buildEmailMessage(imageUrl?: string | null): string {
    const v = this.form.value;
    const p = this.data.profile;
    const name = this.data.profileName || (p ? `${p.firstName} ${p.lastName}`.trim() : 'this profile');
    const greeting = `Dear ${v.receiverName?.trim() || 'Friend'},`;
    const intro = v.message?.trim()
      || `I found this matrimonial profile and thought it may be of interest to you.`;

    if (!p) {
      // No full profile data was passed in — fall back to a simple link share.
      return `${greeting}\n\n${intro}\n\nProfile Link:\n${this.shareUrl}${imageUrl ? `\n\nProfile Image:\n${imageUrl}` : ''}\n\n— Shared via Aurora Matrimony`;
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
    if (imageUrl) {
      lines.push('');
      lines.push('Profile Image:');
      lines.push(imageUrl);
    }
    lines.push('----------------------------------------');
    lines.push('');
    lines.push('— Shared via Aurora Matrimony');

    return lines.join('\n');
  }

  // ── Preview ───────────────────────────────────────────────────────────────
  /** "Show email preview" toggle — fetches the rendered template on each open, since form fields may have changed. */
  protected async togglePreview(): Promise<void> {
    const next = !this.showPreview();
    if (next) this.commitPendingEmail(); // so the preview's "To:" includes an email typed but not yet confirmed
    this.showPreview.set(next);
    if (next) await this.loadPreview();
  }

  /** Asks the API to render the profile email (preview mode) and returns its HTML. */
  private async fetchPreviewHtml(): Promise<string | null> {
    const payload = this.buildSharePayload(true);
    const res = this.isAuthenticated()
      ? await firstValueFrom(this.api.shareProfile(payload))
      : await firstValueFrom(this.api.shareProfileByGuest(payload));
    return res?.data ?? null;
  }

  // ── Profile content → image → bucket ──────────────────────────────────────
  /**
   * Turns the profile content (the same HTML as the preview body) into a JPEG, uploads it through
   * POST /images/profile-media and returns the public URL. Returns null — never throws — when
   * sharing should go ahead without an image: guests (the upload needs a sign-in) or any failure.
   * Reused while the receiver name / message are unchanged.
   */
  private async prepareCardImage(): Promise<string | null> {
    if (!this.isAuthenticated()) return null;
    this.mediaNote.set(null);
    const key = this.cardKey();
    if (this.cardCache?.key === key) return this.cardCache.url;

    try {
      const blob = await this.renderCardBlob();
      const res = await firstValueFrom(
        this.api.uploadProfileMediaImage(this.data.profileId ?? this.data.profileCode, blob),
      );
      const url: string | undefined = res?.data?.imageUrl;
      if (!url) throw new Error('no image url');
      this.cardCache = { key, url };
      return url;
    } catch {
      this.mediaNote.set("The profile image couldn't be attached, so the text version was shared instead.");
      return null;
    }
  }

  private cardKey(): string {
    const v = this.form.value;
    return JSON.stringify([this.data.profileCode, v.receiverName, v.message]);
  }

  /** The profile content as a JPEG — built once per receiver name + message and reused (also while still in progress). */
  private renderCardBlob(): Promise<Blob> {
    const key = this.cardKey();
    if (this.cardBlob?.key === key) return Promise.resolve(this.cardBlob.blob);
    if (this.cardPending?.key === key) return this.cardPending.promise;

    const promise: Promise<Blob> = (async () => {
      const html = await this.fetchPreviewHtml();
      if (!html) throw new Error('empty preview');
      const blob = await this.renderHtmlToJpeg(html);
      this.cardBlob = { key, blob };
      return blob;
    })().finally(() => {
      if (this.cardPending?.promise === promise) this.cardPending = null;
    });
    this.cardPending = { key, promise };
    return promise;
  }

  /**
   * Renders backend HTML in an off-screen host. Bucket images (photo, logo) are first fetched through
   * the API image proxy and swapped for blob URLs: the bucket sends no CORS headers, so html2canvas
   * would otherwise leave them out of the picture.
   */
  private async renderHtmlToJpeg(html: string): Promise<Blob> {
    const host = document.createElement('div');
    Object.assign(host.style, { position: 'absolute', left: '-10000px', top: '0', width: `${CARD_WIDTH}px`, background: '#ffffff' });
    host.innerHTML = html;
    document.body.appendChild(host);
    const blobUrls: string[] = [];
    try {
      await Promise.all(Array.from(host.querySelectorAll('img')).map(async img => {
        const src = img.getAttribute('src') ?? '';
        if (src.startsWith('https://storage.googleapis.com/')) {
          try {
            const fetched = await firstValueFrom(this.api.fetchStoredImage(src));
            if (fetched.type.includes('svg')) {
              // e.g. the default avatar. SVGs may have no intrinsic size, which breaks the crop/round
              // step and html2canvas, so turn it into a plain bitmap first.
              img.src = await this.rasterizeSvg(fetched);
            } else {
              const local = URL.createObjectURL(fetched);
              blobUrls.push(local);
              img.src = local;
            }
          } catch {
            img.removeAttribute('src'); // not one of ours / unavailable: leave it out rather than break the export
          }
        }
        await img.decode().catch(() => undefined);
        this.bakeImage(img);
        await img.decode().catch(() => undefined);
        this.bakeFrame(img);
      }));
      return await renderElementToJpeg(host, {
        width: CARD_WIDTH,
        height: Math.ceil(host.scrollHeight),
        scale: 2,
        backgroundColor: '#ffffff',
      });
    } finally {
      host.remove();
      blobUrls.forEach(u => URL.revokeObjectURL(u));
    }
  }

  /** Draws an SVG onto a canvas (max 512px on its long side, aspect taken from its viewBox) and returns a PNG data URL. */
  private async rasterizeSvg(svg: Blob): Promise<string> {
    const text = await svg.text();
    const vb = /viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(text);
    const wAttr = /<svg[^>]*\swidth\s*=\s*["']([\d.]+)/i.exec(text), hAttr = /<svg[^>]*\sheight\s*=\s*["']([\d.]+)/i.exec(text);
    const vw = vb ? +vb[1] : wAttr ? +wAttr[1] : 1;
    const vh = vb ? +vb[2] : hAttr ? +hAttr[1] : 1;
    const scale = 512 / Math.max(vw, vh);
    const w = Math.max(1, Math.round(vw * scale)), h = Math.max(1, Math.round(vh * scale));

    // Give the SVG explicit dimensions so it renders at a known size in every browser.
    const sized = text.replace(/<svg\b([^>]*)>/i, (_m, attrs: string) =>
      `<svg${attrs.replace(/\s(width|height)\s*=\s*["'][^"']*["']/gi, '')} width="${w}" height="${h}">`);
    const url = URL.createObjectURL(new Blob([sized], { type: 'image/svg+xml' }));
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d')!.drawImage(image, 0, 0, w, h);
      return canvas.toDataURL('image/png');
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  /**
   * html2canvas paints an <img> with `object-fit: cover` and a large `border-radius` as nothing at all
   * (the profile photo in the email template is exactly that). So such images are cropped and rounded
   * onto a canvas here, with the same fit/position/radius, and replaced by the finished bitmap.
   */
  private bakeImage(img: HTMLImageElement): void {
    const cs = getComputedStyle(img);
    const w = img.offsetWidth, h = img.offsetHeight;
    const radii = [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius]
      .map(r => Math.min(parseFloat(r) || 0, w / 2, h / 2));
    const needsBake = cs.objectFit === 'cover' || cs.objectFit === 'contain' || radii.some(r => r > 0);
    if (!needsBake || !w || !h || !img.naturalWidth) return;

    const px = 2; // keep it sharp at the 2× export scale
    const canvas = document.createElement('canvas');
    canvas.width = w * px;
    canvas.height = h * px;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(px, px);

    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(0, 0, w, h, radii);
    else ctx.rect(0, 0, w, h);
    ctx.clip();

    const [posX, posY] = cs.objectPosition.split(' ').map(v => (v.endsWith('%') ? parseFloat(v) / 100 : 0.5));
    const nw = img.naturalWidth, nh = img.naturalHeight;
    let dw = w, dh = h;
    if (cs.objectFit === 'cover' || cs.objectFit === 'contain') {
      const s = cs.objectFit === 'cover' ? Math.max(w / nw, h / nh) : Math.min(w / nw, h / nh);
      dw = nw * s;
      dh = nh * s;
    }
    ctx.drawImage(img, (w - dw) * (posX ?? 0.5), (h - dh) * (posY ?? 0.5), dw, dh);

    img.src = canvas.toDataURL('image/png');
    img.style.objectFit = 'fill';
    img.style.borderRadius = '0';
  }

  /**
   * The profile photo sits inside a <table> with a rounded gold border and white background (the "arch"
   * frame). html2canvas loses what is inside a rounded inline-block table, so that frame — border, rounded
   * corners, white fill and the (already baked) photo — is drawn onto one canvas and the table is replaced
   * by that single image.
   */
  private bakeFrame(img: HTMLImageElement): void {
    const table = img.closest('table');
    if (!table || !img.complete || !img.naturalWidth) return;
    const cs = getComputedStyle(table);
    const w = table.offsetWidth, h = table.offsetHeight;
    const radii = [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius]
      .map(r => Math.min(parseFloat(r) || 0, w / 2, h / 2));
    if (!w || !h || !radii.some(r => r > 0)) return;

    const px = 2;
    const canvas = document.createElement('canvas');
    canvas.width = w * px;
    canvas.height = h * px;
    const ctx = canvas.getContext('2d');
    if (!ctx || typeof ctx.roundRect !== 'function') return;
    ctx.scale(px, px);

    const bw = parseFloat(cs.borderTopWidth) || 0;
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, radii);
    ctx.fillStyle = cs.backgroundColor === 'rgba(0, 0, 0, 0)' ? '#ffffff' : cs.backgroundColor;
    ctx.fill();
    if (bw > 0) {
      ctx.beginPath();
      ctx.roundRect(bw / 2, bw / 2, w - bw, h - bw, radii.map(r => Math.max(0, r - bw / 2)));
      ctx.lineWidth = bw;
      ctx.strokeStyle = cs.borderTopColor;
      ctx.stroke();
    }
    const t = table.getBoundingClientRect(), i = img.getBoundingClientRect();
    ctx.drawImage(img, i.left - t.left, i.top - t.top, i.width, i.height);

    const flat = document.createElement('img');
    flat.src = canvas.toDataURL('image/png');
    flat.width = w;
    flat.height = h;
    flat.alt = img.alt;
    Object.assign(flat.style, { display: 'block', width: `${w}px`, height: `${h}px`, border: '0' });
    table.replaceWith(flat);
  }

  private async loadPreview(): Promise<void> {
    this.isPreviewLoading.set(true);
    this.previewError.set(null);
    try {
      const html = await this.fetchPreviewHtml();
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
    // Apply an email that was typed but never confirmed with Enter/comma.
    // If it's invalid, tryAddEmail has already shown why — don't send without it.
    if (!this.commitPendingEmail()) return;
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
