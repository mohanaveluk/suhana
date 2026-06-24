import {
  Component, ChangeDetectionStrategy, inject, signal, computed,
  OnInit, ViewChild,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatStepper } from '@angular/material/stepper';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControlStatus } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { MaterialModule } from '../../shared/modules/material.module';
import { ApiService, AuthService } from '../../services';
import { PaymentService } from './payment.service';
import { PremiumPlan } from '../../models/user.model';
import {
  PaymentMethod, PAYMENT_METHODS, INDIAN_BANKS, ALL_PLANS, GST_RATE,
} from './models/payment.models';

@Component({
  selector: 'app-premium-payment',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MaterialModule, MatAutocompleteModule, DatePipe, DecimalPipe], //RouterLink
  templateUrl: './premium-payment.html',
  styleUrl: './premium-payment.scss',
})
export class PremiumPaymentComponent implements OnInit {
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb     = inject(FormBuilder);
  private readonly api    = inject(ApiService);
  private readonly auth   = inject(AuthService);
  private readonly svc    = inject(PaymentService);

  @ViewChild('stepper') private stepper!: MatStepper;

  // ── Constants exposed to template ─────────────────────────────────────────
  protected readonly PaymentMethod  = PaymentMethod;
  protected readonly paymentMethods = PAYMENT_METHODS;
  protected readonly now            = new Date();

  // ── Plan state ─────────────────────────────────────────────────────────────
  protected readonly plan  = signal<PremiumPlan | null>(null);
  protected readonly gst   = computed(() => Math.round((this.plan()?.price ?? 0) * GST_RATE));
  protected readonly total = computed(() => (this.plan()?.price ?? 0) + this.gst());

  // ── Payment method ─────────────────────────────────────────────────────────
  protected readonly selectedMethod = signal<PaymentMethod | null>(null);

  // ── Bank autocomplete ──────────────────────────────────────────────────────
  protected readonly bankSearch    = signal('');
  protected readonly filteredBanks = computed(() => {
    const q = this.bankSearch().toLowerCase().trim();
    return q ? INDIAN_BANKS.filter(b => b.name.toLowerCase().includes(q)) : INDIAN_BANKS;
  });

  // ── Step / verification state ──────────────────────────────────────────────
  protected readonly step1Done     = signal(false);
  protected readonly isProcessing  = signal(false);
  protected readonly isSuccess     = signal(false);
  protected readonly isError       = signal(false);
  protected readonly errorMessage  = signal<string | null>(null);
  protected readonly transactionId = signal<string | null>(null);

  // ── Reactive Forms ─────────────────────────────────────────────────────────
  protected readonly cardForm = this.fb.group({
    cardHolderName: ['', [Validators.required, Validators.minLength(3)]],
    cardNumber:     ['', [Validators.required, Validators.pattern(/^\d{4} \d{4} \d{4} \d{4}$/)]],
    expiryMonth:    ['', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])$/)]],
    expiryYear:     ['', [Validators.required, Validators.pattern(/^20[2-9]\d$/)]],
    cvv:            ['', [Validators.required, Validators.pattern(/^\d{3,4}$/)]],
  });

  protected readonly paypalForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected readonly googlePayForm = this.fb.group({
    mobile: ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],
    email:  ['', [Validators.required, Validators.email]],
  });

  protected readonly applePayForm = this.fb.group({
    appleId: ['', [Validators.required, Validators.email]],
  });

  protected readonly amazonPayForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected readonly bankForm = this.fb.group({
    bank:          ['', Validators.required],
    accountHolder: ['', [Validators.required, Validators.minLength(3)]],
    accountNumber: ['', [Validators.required, Validators.pattern(/^\d{9,18}$/)]],
    ifsc:          ['', [Validators.required, Validators.pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)]],
  });

  // ── Form validity as signals → OnPush-compatible canPay ───────────────────
  private readonly s_card      = toSignal(this.cardForm.statusChanges,      { initialValue: 'INVALID' as FormControlStatus });
  private readonly s_paypal    = toSignal(this.paypalForm.statusChanges,    { initialValue: 'INVALID' as FormControlStatus });
  private readonly s_gpay      = toSignal(this.googlePayForm.statusChanges, { initialValue: 'INVALID' as FormControlStatus });
  private readonly s_apple     = toSignal(this.applePayForm.statusChanges,  { initialValue: 'INVALID' as FormControlStatus });
  private readonly s_amazon    = toSignal(this.amazonPayForm.statusChanges, { initialValue: 'INVALID' as FormControlStatus });
  private readonly s_bank      = toSignal(this.bankForm.statusChanges,      { initialValue: 'INVALID' as FormControlStatus });

  protected readonly canPay = computed(() => {
    switch (this.selectedMethod()) {
      case PaymentMethod.VISA:
      case PaymentMethod.MASTERCARD: return this.s_card()   === 'VALID';
      case PaymentMethod.PAYPAL:     return this.s_paypal() === 'VALID';
      case PaymentMethod.GOOGLE_PAY: return this.s_gpay()   === 'VALID';
      case PaymentMethod.APPLE_PAY:  return this.s_apple()  === 'VALID';
      case PaymentMethod.AMAZON_PAY: return this.s_amazon() === 'VALID';
      case PaymentMethod.BANK_TRANSFER: return this.s_bank() === 'VALID';
      default: return false;
    }
  });

  // ──────────────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    // Router state is preferred (full PremiumPlan object passed from PremiumComponent)
    const statePlan = (history.state as { plan?: PremiumPlan })?.plan;
    if (statePlan?.id) { this.plan.set(statePlan); return; }

    // Fallback: reconstruct from query param
    const planId = this.route.snapshot.queryParamMap.get('planId');
    if (!planId) { this.router.navigate(['/premium']); return; }
    const found = ALL_PLANS.find(p => p.id === planId);
    if (found) { this.plan.set(found); return; }
    this.router.navigate(['/premium']);
  }

  selectMethod(method: PaymentMethod): void {
    if (this.selectedMethod() === method) return;
    this.selectedMethod.set(method);
    [this.cardForm, this.paypalForm, this.googlePayForm,
     this.applePayForm, this.amazonPayForm, this.bankForm].forEach(f => f.reset());
    this.bankSearch.set('');
  }

  confirmPlan(): void {
    this.step1Done.set(true);
    this.stepper.next();
  }

  async processPayment(): Promise<void> {
    if (!this.canPay() || !this.plan()) return;
    this.isProcessing.set(true);
    this.isError.set(false);
    this.errorMessage.set(null);
    this.stepper.next(); // → Verification step

    let result;
    try {
      switch (this.selectedMethod()!) {
        case PaymentMethod.VISA:
        case PaymentMethod.MASTERCARD:
          result = await this.svc.verifyCardPayment(this.cardForm.getRawValue() as any); break;
        case PaymentMethod.PAYPAL:
          result = await this.svc.verifyPaypalPayment(this.paypalForm.value.email!); break;
        case PaymentMethod.GOOGLE_PAY:
          result = await this.svc.verifyGooglePayPayment(this.googlePayForm.getRawValue() as any); break;
        case PaymentMethod.APPLE_PAY:
          result = await this.svc.verifyApplePayPayment(this.applePayForm.value.appleId!); break;
        case PaymentMethod.AMAZON_PAY:
          result = await this.svc.verifyAmazonPayPayment(this.amazonPayForm.value.email!); break;
        case PaymentMethod.BANK_TRANSFER:
          result = await this.svc.verifyBankPayment(this.bankForm.getRawValue() as any); break;
        default:
          result = { success: false, errorMessage: 'Unknown payment method.' };
      }
    } catch {
      result = { success: false, errorMessage: 'An unexpected error occurred. Please try again.' };
    }

    if (result.success) {
      try {
        await firstValueFrom(this.api.subscribePlan(this.plan()!.id));
        this.auth.updateMembership(this.plan()!.tier);
        this.transactionId.set(result.transactionId ?? null);
        this.isSuccess.set(true);
        this.stepper.next(); // → Success step
      } catch {
        this.isError.set(true);
        this.transactionId.set(result.transactionId ?? null);
        this.errorMessage.set(
          'Payment verified but membership activation failed. ' +
          'Please contact support with your transaction ID: ' + result.transactionId,
        );
      }
    } else {
      this.isError.set(true);
      this.errorMessage.set(result.errorMessage ?? 'Payment declined. Please try again.');
    }

    this.isProcessing.set(false);
  }

  retryPayment(): void {
    this.isError.set(false);
    this.errorMessage.set(null);
    this.stepper.previous(); // back to Payment step
  }

  // ── Input event handlers ───────────────────────────────────────────────────

  onCardNumberInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const raw   = input.value.replace(/\D/g, '').slice(0, 16);
    const fmt   = raw.replace(/(.{4})/g, '$1 ').trim();
    this.cardForm.get('cardNumber')?.setValue(fmt, { emitEvent: false });
    input.value = fmt;
  }

  onIfscInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const upper = input.value.toUpperCase().slice(0, 11);
    this.bankForm.get('ifsc')?.setValue(upper, { emitEvent: false });
    input.value = upper;
  }

  onBankInput(event: Event): void {
    this.bankSearch.set((event.target as HTMLInputElement).value);
  }

  onBankSelected(): void {
    this.bankSearch.set('');
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  tierIcon(tier?: string): string {
    if (tier === 'platinum') return 'diamond';
    if (tier === 'gold')     return 'star';
    return 'workspace_premium';
  }

  goBack(): void       { this.router.navigate(['/premium']); }
  goToDashboard(): void { this.router.navigate(['/profile']); }
}
