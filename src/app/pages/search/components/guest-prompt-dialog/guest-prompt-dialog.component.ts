import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

export interface GuestPromptData {
  icon?: string;
  title: string;
  message: string;
}

/** Shown wherever a guest reaches a members-only feature. */
@Component({
  selector: 'app-guest-prompt-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="gp">
      <mat-icon class="gp__icon">{{ data.icon ?? 'lock_open' }}</mat-icon>
      <h2 class="gp__title">{{ data.title }}</h2>
      <p class="gp__msg">{{ data.message }}</p>
      <div class="gp__actions">
        <button mat-raised-button class="suhana-btn-primary" type="button" (click)="goRegister()">
          <mat-icon>person_add</mat-icon> Register Free
        </button>
        <button mat-stroked-button type="button" class="gp__login" (click)="goLogin()">
          <mat-icon>login</mat-icon> Login
        </button>
      </div>
      <button mat-button type="button" class="gp__dismiss" (click)="close()">Keep Browsing</button>
    </div>
  `,
  styles: [`
    .gp {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 8px;
      padding: 28px 26px 20px;
      min-width: min(380px, 84vw);
    }
    .gp__icon {
      font-size: 46px; width: 46px; height: 46px;
      color: var(--suhana-rose-gold, #b76e79);
    }
    .gp__title {
      margin: 4px 0 0; font-size: 1.15rem; font-weight: 700;
      color: var(--suhana-maroon, #800020);
    }
    .gp__msg {
      margin: 0 0 8px; font-size: 0.9rem; line-height: 1.55;
      color: var(--suhana-text-secondary, #6b5557);
    }
    .gp__actions {
      display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; width: 100%;
    }
    .gp__actions button { flex: 1 1 auto; }
    .gp__actions mat-icon { margin-right: 5px; font-size: 18px; width: 18px; height: 18px; }
    .gp__login {
      border-color: var(--suhana-rose-gold, #b76e79) !important;
      color: var(--suhana-maroon, #800020) !important;
    }
    .gp__dismiss {
      margin-top: 4px; font-size: 0.8rem;
      color: var(--suhana-text-secondary, #6b5557) !important;
    }
  `],
})
export class GuestPromptDialogComponent {
  protected readonly data = inject<GuestPromptData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<GuestPromptDialogComponent>);
  private readonly router = inject(Router);

  /**
   * The page the guest was on when the prompt opened. Captured up front because
   * the dialog does not change the URL, so this is the page they want back.
   * LoginComponent already reads `returnUrl`, matching authGuard's convention.
   */
  private readonly returnUrl = this.router.url;

  protected goLogin(): void {
    this.dialogRef.close();
    void this.router.navigate(['/login'], { queryParams: { returnUrl: this.returnUrl } });
  }

  /** Register ends at /registration-success, which has no returnUrl handling. */
  protected goRegister(): void {
    this.dialogRef.close();
    void this.router.navigate(['/register']);
  }

  protected close(): void { this.dialogRef.close(); }
}
