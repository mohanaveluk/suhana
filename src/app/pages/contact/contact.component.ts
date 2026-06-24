import {
  Component, ChangeDetectionStrategy, inject, signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { take } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';
import { MaterialModule } from '../../shared/modules/material.module';
import { ContactService } from './contact.service';

@Component({
  selector: 'app-contact',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MaterialModule],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss',
})
export class ContactComponent {
  private readonly fb             = inject(FormBuilder);
  private readonly contactService = inject(ContactService);
  private readonly router         = inject(Router);
  private readonly snackBar       = inject(MatSnackBar);

  protected readonly isSubmitting = signal(false);
  protected readonly isSuccess    = signal(false);

  protected readonly socialLinks = {
    facebookUrl:  'https://facebook.com/suhanamatrimony',
    instagramUrl: 'https://instagram.com/suhanamatrimony',
    youtubeUrl:   'https://youtube.com/@suhanamatrimony',
    twitterUrl:   'https://x.com/suhanamatrimony',
  };

  protected readonly form = this.fb.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName:  ['', [Validators.required, Validators.minLength(2)]],
    email:     ['', [Validators.required, Validators.email]],
    mobile:    ['', [Validators.pattern(/^[6-9]\d{9}$/)]],
    message:   ['', [Validators.required, Validators.minLength(20), Validators.maxLength(1000)]],
  });

  protected get messageLength(): number {
    return this.form.value.message?.length ?? 0;
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const { firstName, lastName, email, mobile, message } = this.form.getRawValue();

    try {
      await firstValueFrom(
        this.contactService.createContact({
          firstName: firstName!,
          lastName:  lastName!,
          email:     email!,
          mobile:    mobile || undefined,
          message:   message!,
        })
      );
      this.isSuccess.set(true);
    } catch {
      const ref = this.snackBar.open(
        'Unable to submit your request. Please try again later.',
        'Retry',
        { duration: 6000, panelClass: ['cu-snack-error'] }
      );
      ref.onAction().pipe(take(1)).subscribe(() => this.onSubmit());
    } finally {
      this.isSubmitting.set(false);
    }
  }

  protected resetForm(): void {
    this.form.reset();
    this.isSuccess.set(false);
  }

  protected goHome(): void {
    this.router.navigate(['/']);
  }

  protected openSocial(url: string): void {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  scrollToContact(): void {
    const element = document.getElementById('contact-form');

    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  }

}
