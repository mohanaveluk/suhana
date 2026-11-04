import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, computed, inject, signal, viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { MaterialModule } from '../../modules/material.module';
import { ApiService } from '../../../services/api.service';
import { AuthService } from '../../../services';
import { ShareProfileData } from '../share-profile/share-profile.component';
import { POSTER_HEIGHT, POSTER_WIDTH, ProfilePosterComponent } from './profile-poster/profile-poster.component';

const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
/** Output is rendered at 2× the poster's CSS size (1536×2752) — sharp enough for Instagram, ~1–2 MB as JPEG. */
const CAPTURE_SCALE = 2;
const JPEG_QUALITY = 0.92;
/** Brand logo in the poster header. Fetched through the API: the bucket has no CORS headers, so html2canvas would silently skip it. */
const LOGO_URL = 'https://storage.googleapis.com/inv-images/matrimony/home/firefly.png';
/** Used only if the logo can't be fetched, so the header is never empty. */
const FALLBACK_LOGO = 'data:image/svg+xml,' + encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 220 120'>" +
  "<path d='M78 104 C28 66 14 44 14 30 C14 14 28 6 42 6 C56 6 70 16 78 30 C86 16 100 6 114 6 C128 6 142 14 142 30 C142 44 128 66 78 104 Z' fill='none' stroke='#f0cf70' stroke-width='9' stroke-linejoin='round'/>" +
  "<path d='M142 104 C92 66 78 44 78 30 C78 14 92 6 106 6 C120 6 134 16 142 30 C150 16 164 6 178 6 C192 6 206 14 206 30 C206 44 192 66 142 104 Z' fill='none' stroke='#d4a53a' stroke-width='9' stroke-linejoin='round'/></svg>");

type Busy = 'idle' | 'rendering' | 'uploading';

/**
 * "Share to media" drawer: builds a poster of the selected profile (ProfilePosterComponent),
 * rasterises it to a JPEG, uploads it through `POST /v1/images/social-media`
 * (stored as social-media/{profileId}-{datetime}.jpg) and hands the public URL to
 * WhatsApp / Facebook / Instagram / email.
 *
 * Sign-in to the social networks is handled by their own share pages — they prompt the
 * member to log in or authorise when needed; this app never sees those credentials.
 */
@Component({
  selector: 'app-share-to-media',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MaterialModule, ProfilePosterComponent],
  templateUrl: './share-to-media.component.html',
  styleUrl: './share-to-media.component.scss',
})
export class ShareToMediaComponent {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly snack = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly dialogRef = inject<MatDialogRef<ShareToMediaComponent>>(MatDialogRef);
  protected readonly data = inject<ShareProfileData>(MAT_DIALOG_DATA);

  private readonly previewBox = viewChild<ElementRef<HTMLElement>>('previewBox');
  private readonly captureEl = viewChild('capture', { read: ElementRef });

  protected readonly posterW = POSTER_WIDTH;
  protected readonly posterH = POSTER_HEIGHT;
  protected readonly shareUrl = `${window.location.origin}/view/${this.data.profileCode}`;

  // ── State ─────────────────────────────────────────────────────────────────
  protected readonly photoSrc = signal<string | null>(null);
  protected readonly logoSrc = signal<string | null>(null);
  protected readonly photoReady = signal(false);
  protected readonly photoNote = signal<string | null>(null);
  protected readonly scale = signal(0.5);
  protected readonly busy = signal<Busy>('idle');
  protected readonly imageUrl = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly emailBusy = signal(false);
  protected readonly emailSent = signal<string[]>([]);
  protected readonly emailError = signal<string | null>(null);

  protected readonly isWorking = computed(() => this.busy() !== 'idle');
  protected readonly busyLabel = computed(() =>
    this.busy() === 'rendering' ? 'Building your poster…' : this.busy() === 'uploading' ? 'Uploading image…' : '');
  protected readonly isGuest = computed(() => !this.auth.authenticated());
  protected readonly canNativeShare = computed(() => this.supportsFileShare());

  protected readonly form = this.fb.nonNullable.group({
    receiverName: ['', [Validators.required, Validators.minLength(2)]],
    emails: ['', Validators.required],
    message: ['Hello,\n\nI found this profile and thought it may be of interest to you.', Validators.maxLength(1000)],
  });

  private blob: Blob | null = null;
  private uploading: Promise<string> | null = null;
  private objectUrl: string | null = null;
  private logoObjectUrl: string | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
      if (this.logoObjectUrl) URL.revokeObjectURL(this.logoObjectUrl);
    });
    void this.loadAssets();

    // Fit the 768px-wide poster into the drawer.
    afterNextRender(() => {
      const box = this.previewBox()?.nativeElement;
      if (!box) return;
      const fit = () => this.scale.set(Math.min(1, Math.max(0.2, box.clientWidth / POSTER_WIDTH)));
      fit();
      const ro = new ResizeObserver(fit);
      ro.observe(box);
      this.destroyRef.onDestroy(() => ro.disconnect());
    });
  }

  // ── Photo ─────────────────────────────────────────────────────────────────
  /**
   * html2canvas can only export a canvas if every image on it is same-origin or CORS-enabled,
   * and the storage bucket sends no CORS headers. So the photo is downloaded through the API
   * (which only serves our own images) and drawn from a blob URL. If that fails the poster is
   * built with the "photo on request" placeholder.
   */
  private async loadPhoto(): Promise<void> {
    const photos = this.data.profile?.photos ?? [];
    const photo = photos.find(p => p.isPrimary) ?? photos[0];
    const url = photo?.variants?.displayUrl ?? photo?.url;
    if (url) {
      try {
        this.objectUrl = URL.createObjectURL(await firstValueFrom(this.api.fetchStoredImage(url)));
        this.photoSrc.set(this.objectUrl);
      } catch {
        this.photoNote.set('The profile photo could not be loaded, so the poster shows a placeholder.');
      }
    }
  }

  /** Logo and photo are both fetched before the poster counts as ready to capture. */
  private async loadAssets(): Promise<void> {
    await Promise.all([this.loadLogo(), this.loadPhoto()]);
    this.photoReady.set(true);
    // Render ahead of the first click: share sheets and the clipboard only work shortly after a
    // user gesture, so the click handlers must find the image already built.
    await new Promise(r => setTimeout(r, 100)); // let the off-screen poster mount
    void this.renderBlob().catch(() => { /* surfaced when the member actually shares */ });
  }

  private async loadLogo(): Promise<void> {
    try {
      this.logoObjectUrl = URL.createObjectURL(await firstValueFrom(this.api.fetchStoredImage(LOGO_URL)));
      this.logoSrc.set(this.logoObjectUrl);
    } catch {
      this.logoSrc.set(FALLBACK_LOGO);
    }
  }

  // ── Poster → JPEG → bucket ────────────────────────────────────────────────
  private async renderBlob(): Promise<Blob> {
    if (this.blob) return this.blob;
    const el = this.captureEl()?.nativeElement;
    if (!el) throw new Error('Poster is not ready yet.');
    this.busy.set('rendering');
    try {
      const html2canvas = (await import('html2canvas')).default;
      await document.fonts?.ready;
      const canvas = await html2canvas(el, {
        scale: CAPTURE_SCALE,
        useCORS: true,
        backgroundColor: '#fffaf2',
        logging: false,
        width: POSTER_WIDTH,
        height: POSTER_HEIGHT,
        windowWidth: POSTER_WIDTH,
        windowHeight: POSTER_HEIGHT,
        scrollX: 0,
        scrollY: 0,
        // The live poster sits off-screen inside the dialog, whose overflow/transform/position
        // would clip or offset it. In html2canvas's private copy of the page, lift it out to the
        // body at 0,0 so it is painted exactly as designed.
        // Everything else in the copy (sticky app toolbar, dialog backdrop and drawer — all
        // position:fixed with high z-index) is removed too, otherwise it paints over the poster's header.
        onclone: (doc, cloned) => {
          // While a dialog is open the CDK locks page scroll with `html { position: fixed; top: -<scrollY>px }`
          // (class cdk-global-scrollblock). The clone inherits that, which shoves the poster out of view and
          // exports a blank image whenever the page was scrolled. Neutralise it, and drop everything else.
          doc.documentElement.className = '';
          doc.body.className = '';
          doc.body.replaceChildren(cloned);
          Object.assign(doc.documentElement.style, {
            position: 'static', top: 'auto', left: 'auto', margin: '0', padding: '0',
            background: 'transparent', overflow: 'visible', width: `${POSTER_WIDTH}px`, height: `${POSTER_HEIGHT}px`,
          });
          Object.assign(doc.body.style, { margin: '0', padding: '0', overflow: 'visible', width: `${POSTER_WIDTH}px`, height: `${POSTER_HEIGHT}px`, position: 'relative' });
          Object.assign(cloned.style, { position: 'absolute', left: '0', top: '0', margin: '0', transform: 'none' });        },
      });
      const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', JPEG_QUALITY));
      if (!blob) throw new Error('Could not create the image.');
      this.blob = blob;
      return blob;
    } finally {
      this.busy.set('idle');
    }
  }

  /** Renders and uploads once; later share actions reuse the same URL. */
  private ensureUploaded(): Promise<string> {
    const existing = this.imageUrl();
    if (existing) return Promise.resolve(existing);
    this.uploading ??= (async () => {
      try {
        const blob = await this.renderBlob();
        this.busy.set('uploading');
        const res = await firstValueFrom(
          this.api.uploadSocialMediaImage(this.data.profileId ?? this.data.profileCode, blob),
        );
        const url: string | undefined = res?.data?.imageUrl;
        if (!url) throw new Error('The server did not return an image URL.');
        this.imageUrl.set(url);
        return url;
      } finally {
        this.busy.set('idle');
        this.uploading = null;
      }
    })();
    return this.uploading;
  }

  private caption(): string {
    const p = this.data.profile;
    const name = this.data.profileName || (p ? `${p.firstName} ${p.lastName}`.trim() : 'this profile');
    const bits = [p?.age ? `${p.age} yrs` : '', p?.location?.city ?? ''].filter(Boolean).join(' · ');
    return `💑 ${name}${bits ? ` — ${bits}` : ''}\nView the full profile: ${this.shareUrl}\n\nShared via Aurora Matrimony`;
  }

  private fail(err: unknown, fallback: string): void {
    const msg = (err as any)?.error?.message ?? (err as Error)?.message ?? fallback;
    this.error.set(Array.isArray(msg) ? msg.join(', ') : String(msg));
  }

  // ── Share actions ─────────────────────────────────────────────────────────
  /**
   * Browsers only allow window.open inside the click that triggered it, but the poster takes a
   * moment to render and upload — so the tab is opened immediately and pointed at the share
   * URL once the image URL exists.
   */
  private async viaPopup(build: (imageUrl: string) => string): Promise<void> {
    this.error.set(null);
    const win = window.open('', '_blank');
    if (win) win.document.title = 'Preparing…';
    try {
      const target = build(await this.ensureUploaded());
      if (win) { win.opener = null; win.location.href = target; }
      else window.open(target, '_blank', 'noopener,noreferrer');
    } catch (err) {
      win?.close();
      this.fail(err, 'Could not prepare the poster. Please try again.');
    }
  }

  /**
   * A wa.me link can only carry text, so it can never attach the picture. Real attachment:
   *  1. share sheet with the image file (phones, and desktops with the WhatsApp app installed);
   *  2. otherwise copy the image to the clipboard and open WhatsApp — the member pastes it (Ctrl+V);
   *  3. last resort: the old text message with the image link.
   */
  protected async shareWhatsApp(): Promise<void> {
    this.error.set(null);
    if (this.canNativeShare()) { await this.shareNative(); return; }
    try {
      await this.copyImageToClipboard();
      window.open(`https://wa.me/?text=${encodeURIComponent(this.caption())}`, '_blank', 'noopener,noreferrer');
      this.snack.open('Poster copied — open the chat and paste it (Ctrl+V) to attach the image.', 'OK', { duration: 8000 });
    } catch {
      await this.viaPopup(url => `https://wa.me/?text=${encodeURIComponent(`${this.caption()}\n\n${url}`)}`);
    }
  }

  /** Copies the poster itself (not a link) so it can be pasted into any chat or document. */
  protected async copyImage(): Promise<void> {
    this.error.set(null);
    try {
      await this.copyImageToClipboard();
      this.snack.open('Poster copied — paste it where you want it.', 'OK', { duration: 3500 });
    } catch (err) {
      this.fail(err, 'Your browser did not allow copying the image. Use Download JPG instead.');
    }
  }

  /** Browsers only accept PNG for image clipboard items, so the JPEG is re-encoded. */
  private async copyImageToClipboard(): Promise<void> {
    if (!navigator.clipboard || typeof ClipboardItem === 'undefined') throw new Error('Clipboard images are not supported here.');
    const jpeg = await this.renderBlob();
    const bmp = await createImageBitmap(jpeg);
    const canvas = document.createElement('canvas');
    canvas.width = bmp.width;
    canvas.height = bmp.height;
    canvas.getContext('2d')!.drawImage(bmp, 0, 0);
    const png = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png'));
    if (!png) throw new Error('Could not prepare the image.');
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
  }

  protected shareFacebook(): Promise<void> {
    return this.viaPopup(url =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(this.caption())}`);
  }

  /**
   * Instagram has no web share link. On phones the system share sheet (which lists Instagram)
   * receives the image itself; elsewhere the poster is saved, the caption copied, and
   * instagram.com opened (it asks the member to sign in) so they can post it.
   */
  protected async shareInstagram(): Promise<void> {
    if (this.canNativeShare()) { await this.shareNative(); return; }
    this.error.set(null);
    window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
    try {
      await this.download();
      await this.copyText(this.caption());
      this.snack.open('Poster saved and caption copied — create a new post on Instagram and paste it.', 'OK', { duration: 7000 });
    } catch (err) {
      this.fail(err, 'Could not prepare the poster.');
    }
  }

  protected async shareNative(): Promise<void> {
    this.error.set(null);
    try {
      const blob = await this.renderBlob();
      const file = new File([blob], `${this.data.profileCode}-aurora-profile.jpg`, { type: 'image/jpeg' });
      await navigator.share({ files: [file], text: this.caption() });
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') return; // member dismissed the sheet
      this.fail(err, 'Sharing was not completed.');
    }
  }

  protected async download(): Promise<void> {
    this.error.set(null);
    try {
      const blob = await this.renderBlob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${this.data.profileCode}-aurora-profile.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
    } catch (err) {
      this.fail(err, 'Could not create the image.');
    }
  }

  protected async copyImageLink(): Promise<void> {
    this.error.set(null);
    try {
      await this.copyText(await this.ensureUploaded());
      this.snack.open('Image link copied', 'OK', { duration: 2500 });
    } catch (err) {
      this.fail(err, 'Could not prepare the poster.');
    }
  }

  // ── Email ─────────────────────────────────────────────────────────────────
  protected async sendEmail(): Promise<void> {
    this.form.markAllAsTouched();
    this.emailError.set(null);
    const emails = this.form.controls.emails.value.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean);
    const bad = emails.find(e => !EMAIL_RE.test(e));
    if (!emails.length || bad || this.form.controls.receiverName.invalid) {
      if (bad) this.emailError.set(`"${bad}" is not a valid email address.`);
      else if (!emails.length) this.emailError.set('Please enter at least one recipient email address.');
      return;
    }

    this.emailBusy.set(true);
    try {
      const posterImageUrl = await this.ensureUploaded();
      const v = this.form.getRawValue();
      const payload = {
        profileId: this.data.profileId,
        profileCode: this.data.profileCode,
        receiverName: v.receiverName.trim(),
        toEmail: [...new Set(emails)],
        shareUrl: this.shareUrl,
        subject: "A Matrimony Profile I'd Like to Share With You",
        body: v.message ?? '',
        posterImageUrl,
      };
      await firstValueFrom(this.isGuest() ? this.api.shareMediaProfileByGuest(payload) : this.api.shareMediaProfile(payload));
      this.emailSent.set(payload.toEmail);
      this.form.controls.emails.reset('');
    } catch (err) {
      this.emailError.set((err as any)?.error?.message ?? (err as Error)?.message ?? 'We could not send the email. Please try again.');
    } finally {
      this.emailBusy.set(false);
    }
  }

  protected close(): void {
    this.dialogRef.addPanelClass('sp-closing');
    setTimeout(() => this.dialogRef.close(), 280);
  }

  // ── helpers ───────────────────────────────────────────────────────────────
  private supportsFileShare(): boolean {
    try {
      return typeof navigator.canShare === 'function'
        && navigator.canShare({ files: [new File(['x'], 'x.jpg', { type: 'image/jpeg' })] });
    } catch {
      return false;
    }
  }

  private async copyText(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement('textarea');
      el.value = text;
      Object.assign(el.style, { position: 'fixed', top: '0', left: '0', opacity: '0' });
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      el.remove();
    }
  }
}
