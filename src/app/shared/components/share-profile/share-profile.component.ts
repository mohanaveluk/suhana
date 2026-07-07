import {
  Component, ChangeDetectionStrategy, inject, signal, computed, OnInit,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatChipInputEvent } from '@angular/material/chips';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialModule } from '../../modules/material.module';
import { ApiService } from '../../../services/api.service';
import { firstValueFrom } from 'rxjs';

export interface ShareProfileData {
  profileCode: string;
  profileName?: string;
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
  private readonly snackBar = inject(MatSnackBar);
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

  // ── Computed ──────────────────────────────────────────────────────────────
  protected readonly canSubmit = computed(
    () => this.form.valid && this.emails().length > 0,
  );

  // ── Form ──────────────────────────────────────────────────────────────────
  protected readonly form = this.fb.nonNullable.group({
    receiverName: ['', [Validators.required, Validators.minLength(2)]],
    subject:    ["A Matrimony Profile I'd Like to Share With You", Validators.required],
    message:    ['', Validators.maxLength(1000)],
  });

  ngOnInit(): void {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) this.recentEmails.set(JSON.parse(stored));
    } catch { /* ignore */ }

    this.form.patchValue({
      message:
        `Hello,\n\nI found this profile and thought it may be of interest to you.\n\nProfile Link:\n${this.shareUrl},`,
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
    const text = encodeURIComponent(
      `Hi! I found this matrimonial profile that might interest you:\n${this.shareUrl}`,
    );
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  }

  protected shareViaEmailClient(): void {
    const v = this.form.value;
    const subject = encodeURIComponent(v.subject ?? '');
    const body    = encodeURIComponent(v.message ?? `Profile Link: ${this.shareUrl}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
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

    this.isLoading.set(true);
    this.error.set(null);
    const v = this.form.value;

    try {
      await firstValueFrom(this.api.shareProfile({
        receiverName: v.receiverName!,
        toEmail:    this.emails(),
        shareUrl:   this.shareUrl,
        subject:    v.subject!,
        body:       v.message ?? '',
      }));
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
    this.form.patchValue({
      message:
        `Hello,\n\nI found this profile and thought it may be of interest to you.\n\nProfile Link:\n${this.shareUrl},`,
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
