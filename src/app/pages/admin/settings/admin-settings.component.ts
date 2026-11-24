import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { firstValueFrom } from 'rxjs';

import { MaterialModule } from '../../../shared/modules/material.module';
import { ApiService } from '../../../services/api.service';
import { SmsSettings } from '../../../models/sms-settings.model';
import { AdminLayoutComponent } from '../layout/admin-layout.component';

/** Confirmation before switching SMS off site-wide (destructive-ish: members stop receiving texts). */
@Component({
  selector: 'app-confirm-sms-off-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialModule],
  template: `
    <h2 mat-dialog-title>Turn off text messages?</h2>
    <mat-dialog-content>
      <p>No text messages will be sent anywhere on the site until you turn this back on.</p>
      <ul class="sms-off-effects">
        <li>Login and password-reset codes will be sent by <strong>email</strong> instead.</li>
        <li>Members <strong>cannot verify a mobile number</strong> while SMS is off.</li>
      </ul>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="ref.close(false)">Cancel</button>
      <button mat-flat-button color="warn" type="button" (click)="ref.close(true)">Turn off SMS</button>
    </mat-dialog-actions>
  `,
  styles: [`.sms-off-effects { margin: 8px 0 0; padding-left: 20px; line-height: 1.6; }`],
})
export class ConfirmSmsOffDialogComponent {
  protected readonly ref = inject(MatDialogRef<ConfirmSmsOffDialogComponent, boolean>);
}

@Component({
  selector: 'app-admin-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialModule, DatePipe, AdminLayoutComponent],
  templateUrl: './admin-settings.component.html',
  styleUrl: './admin-settings.component.scss',
})
export class AdminSettingsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  protected readonly sms = signal<SmsSettings | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  /** What members actually experience right now. */
  protected readonly smsState = computed<'on' | 'off' | 'not-configured' | 'log-only'>(() => {
    const s = this.sms();
    if (!s) return 'off';
    if (!s.sendingEnabled) return 'off';
    if (!s.providerConfigured) return 'not-configured';
    if (s.provider === 'log') return 'log-only';
    return 'on';
  });

  ngOnInit(): void {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.sms.set(await firstValueFrom(this.api.getSmsSettings()));
    } catch (e: any) {
      this.error.set(e?.status === 403 ? 'You need admin access to view site settings.' : 'Could not load settings. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  protected async onSmsToggle(event: MatSlideToggleChange): Promise<void> {
    const enabled = event.checked;
    if (!enabled) {
      const ok = await firstValueFrom(
        this.dialog.open(ConfirmSmsOffDialogComponent, { width: '440px', autoFocus: 'dialog' }).afterClosed(),
      );
      if (!ok) {
        event.source.checked = true; // revert the visual toggle
        return;
      }
    }

    this.saving.set(true);
    try {
      this.sms.set(await firstValueFrom(this.api.updateSmsSettings(enabled)));
      this.snack.open(enabled ? 'Text messages turned on' : 'Text messages turned off', 'OK', { duration: 3000 });
    } catch (e: any) {
      event.source.checked = !enabled;
      this.snack.open(e?.error?.message ?? 'Could not save the setting. Please try again.', 'OK', { duration: 5000 });
    } finally {
      this.saving.set(false);
    }
  }
}
