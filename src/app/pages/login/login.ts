import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MaterialModule } from '../../shared/modules/material.module';
import { AuthService } from '../../services';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule, RouterLink, MaterialModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** Where to go after a successful login — set by authGuard, defaults to home. */
  private get returnUrl(): string {
    return this.route.snapshot.queryParamMap.get('returnUrl') || '/';
  }

  protected readonly hidePassword = signal(true);
  protected readonly isLoggingIn = signal(false);
  protected readonly isSendingVerification = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly showVerifyOption = signal(false);
  protected readonly verificationSent = signal(false);

  protected readonly loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  async onLogin(): Promise<void> {
    this.loginForm.markAllAsTouched();
    if (this.loginForm.invalid) return;

    this.isLoggingIn.set(true);
    this.errorMessage.set(null);
    this.showVerifyOption.set(false);
    this.verificationSent.set(false);

    const { email, password } = this.loginForm.getRawValue();
    try {
      await this.auth.login(email ?? '', password ?? '');
      this.router.navigateByUrl(this.returnUrl);
    } catch (err: any) {
      const msg: string = err?.error?.message ?? err?.message ?? 'Login failed. Please try again.';
      this.errorMessage.set(msg);
      this.showVerifyOption.set(/disabled|not verified|verify|verification/i.test(msg));
    } finally {
      this.isLoggingIn.set(false);
    }
  }

  async sendVerificationEmail(): Promise<void> {
    const email = this.loginForm.getRawValue().email ?? '';
    if (!email) return;

    this.isSendingVerification.set(true);
    try {
      await this.auth.sendVerificationEmail(email);
      this.verificationSent.set(true);
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message ?? 'Failed to send verification email. Please try again.');
    } finally {
      this.isSendingVerification.set(false);
    }
  }

  async loginAsDemo(role: 'registered' | 'admin' | 'tester'): Promise<void> {
    //await this.auth.loginAsRole(role);
    //this.router.navigate([role === 'admin' ? '/admin' : '/']);
  }
}
