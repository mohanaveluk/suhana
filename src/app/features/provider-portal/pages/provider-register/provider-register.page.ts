import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MaterialModule } from '../../../../shared/modules/material.module';
import { ApiService } from '../../../../services/api.service';
import { CountryCode, DiscoverCategory } from '../../../discover/models/discover.model';
import { apiErrorMessage } from '../../../discover/utils/discover.utils';

const passwordsMatch = (g: AbstractControl): ValidationErrors | null =>
  g.get('password')?.value === g.get('confirm')?.value ? null : { mismatch: true };

/**
 * Provider self-registration (/providers/register). Separate from the
 * bride/groom flow; creates a provider account + a draft listing on the API.
 */
@Component({
  selector: 'app-provider-register',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialModule, ReactiveFormsModule, RouterLink],
  templateUrl: './provider-register.page.html',
  styleUrl: '../provider-auth.scss',
})
export class ProviderRegisterPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);

  protected readonly categories = signal<DiscoverCategory[]>([]);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly done = signal<string | null>(null);
  protected readonly showPassword = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    businessName: ['', [Validators.required, Validators.maxLength(150)]],
    categorySlug: ['', Validators.required],
    country: this.fb.nonNullable.control<CountryCode>('IN'),
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: [''],
    email: ['', [Validators.required, Validators.email]],
    mobile: ['', [Validators.required, Validators.pattern(/^\+?[0-9 ()-]{7,24}$/)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/)]],
    confirm: ['', Validators.required],
    agree: [false, Validators.requiredTrue],
  }, { validators: passwordsMatch });

  async ngOnInit(): Promise<void> {
    try {
      const cats = await firstValueFrom(this.api.getProviderPortalCategories());
      this.categories.set(cats.filter((c) => c.kind === 'SERVICE' || c.isActive));
    } catch {
      this.error.set('Could not load business categories. Please refresh the page.');
    }
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    this.error.set(null);
    const v = this.form.getRawValue();
    try {
      const res = await firstValueFrom(this.api.registerDiscoverProvider({
        businessName: v.businessName.trim(),
        categorySlug: v.categorySlug,
        country: v.country,
        firstName: v.firstName.trim(),
        lastName: v.lastName.trim() || null,
        email: v.email.trim().toLowerCase(),
        mobile: v.mobile.trim(),
        password: v.password,
      }));
      this.done.set(res.email);
    } catch (err) {
      this.error.set(apiErrorMessage(err, 'Registration failed. Please try again.'));
    } finally {
      this.saving.set(false);
    }
  }
}
