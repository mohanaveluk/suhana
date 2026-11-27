import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MaterialModule } from '../../../../shared/modules/material.module';
import { AuthService } from '../../../../services/auth.service';
import { apiErrorMessage } from '../../../discover/utils/discover.utils';

/**
 * Provider login (/providers/login). Uses the same AuthService/JWT as members —
 * one identity, separate entry point and landing (the provider dashboard).
 */
@Component({
  selector: 'app-provider-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="pa" style="--pa-img: url('/providers/photographer.webp')">
      <aside class="pa__art">
        <a class="pa__brand" routerLink="/providers"><span class="pa__logo" aria-hidden="true"><mat-icon>storefront</mat-icon></span>
          <span>Aurora <strong>for Business</strong></span></a>
        <h2>Grow your business with Aurora</h2>
        <p>Connect with families and individuals planning their marriage journey. Manage your listing, services and photos in one place.</p>
      </aside>
      <section class="pa__panel">
        <div class="pa__card">
          <h1>Provider login</h1>
          <p class="pa__lead">Sign in to manage your business on Aurora Discover.</p>
          @if (error()) { <div class="pa__error" role="alert"><mat-icon aria-hidden="true">error_outline</mat-icon><span>{{ error() }}</span></div> }
          <form class="pa__form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <mat-form-field appearance="outline">
              <mat-label>Business email</mat-label>
              <input matInput type="email" formControlName="email" autocomplete="username" />
              @if (form.controls.email.invalid) { <mat-error>Enter your email.</mat-error> }
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Password</mat-label>
              <input matInput [type]="show() ? 'text' : 'password'" formControlName="password" autocomplete="current-password" />
              <button mat-icon-button matSuffix type="button" (click)="show.set(!show())" [attr.aria-label]="show() ? 'Hide password' : 'Show password'">
                <mat-icon>{{ show() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (form.controls.password.invalid) { <mat-error>Enter your password.</mat-error> }
            </mat-form-field>
            <button mat-flat-button type="submit" class="suhana-btn-primary pa__submit" (click)="form.markAllAsTouched()">
              {{ busy() ? 'Signing in…' : 'Provider login' }}
            </button>
          </form>
          <p class="pa__alt"><a routerLink="/forgot-password">Forgot password?</a></p>
          <p class="pa__alt">New to Aurora? <a routerLink="/providers/register">Register your business</a></p>
        </div>
      </section>
    </div>
  `,
  styleUrl: '../provider-auth.scss',
})
export class ProviderLoginPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly show = signal(false);
  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  ngOnInit(): void {
    if (this.auth.authenticated()) void this.router.navigateByUrl(this.target());
  }

  /** Only same-portal return URLs; anything else lands on the dashboard. */
  private target(): string {
    const r = this.route.snapshot.queryParamMap.get('returnUrl');
    return r && r.startsWith('/providers/') ? r : '/providers/dashboard';
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid || this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      const v = this.form.getRawValue();
      await this.auth.login(v.email.trim().toLowerCase(), v.password);
      if (!this.auth.authenticated()) throw new Error('Sign-in failed.');
      await this.router.navigateByUrl(this.target());
    } catch (err) {
      this.error.set(apiErrorMessage(err, 'Sign-in failed. Check your email and password.'));
    } finally {
      this.busy.set(false);
    }
  }
}
