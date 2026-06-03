import { Injectable } from '@angular/core';
import { PaymentResult } from './models/payment.models';

@Injectable({ providedIn: 'root' })
export class PaymentService {

  private generateTransactionId(): string {
    const ts  = Date.now().toString(36).toUpperCase();
    const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `TXN-${ts}-${rnd}`;
  }

  private simulate(successRate = 0.92): Promise<PaymentResult> {
    return new Promise(resolve =>
      setTimeout(() => {
        if (Math.random() < successRate) {
          resolve({ success: true, transactionId: this.generateTransactionId() });
        } else {
          resolve({
            success: false,
            errorMessage: 'Your payment was declined by the gateway. Please verify your details and try again.',
          });
        }
      }, 2800),
    );
  }

  verifyCardPayment(_data: {
    cardHolderName: string; cardNumber: string; expiryMonth: string; expiryYear: string; cvv: string;
  }): Promise<PaymentResult> {
    return this.simulate(0.92);
  }

  verifyPaypalPayment(_email: string): Promise<PaymentResult> {
    return this.simulate(0.95);
  }

  verifyGooglePayPayment(_data: { mobile: string; email: string }): Promise<PaymentResult> {
    return this.simulate(0.95);
  }

  verifyApplePayPayment(_appleId: string): Promise<PaymentResult> {
    return this.simulate(0.94);
  }

  verifyAmazonPayPayment(_email: string): Promise<PaymentResult> {
    return this.simulate(0.93);
  }

  verifyBankPayment(_data: {
    bank: string; accountHolder: string; accountNumber: string; ifsc: string;
  }): Promise<PaymentResult> {
    return this.simulate(0.90);
  }
}
