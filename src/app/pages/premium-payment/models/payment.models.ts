import { PremiumPlan } from '../../../models/user.model';

export enum PaymentMethod {
  VISA          = 'visa',
  MASTERCARD    = 'mastercard',
  PAYPAL        = 'paypal',
  GOOGLE_PAY    = 'google_pay',
  APPLE_PAY     = 'apple_pay',
  AMAZON_PAY    = 'amazon_pay',
  BANK_TRANSFER = 'bank_transfer',
}

export interface PaymentMethodConfig {
  id: PaymentMethod;
  label: string;
  icon: string;
  logoClass: string;
  description: string;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  errorMessage?: string;
}

export interface IndianBank {
  name: string;
  code: string;
}

export const GST_RATE = 0.18;

export const PAYMENT_METHODS: PaymentMethodConfig[] = [
  { id: PaymentMethod.VISA,          label: 'Visa',          icon: 'credit_card',            logoClass: 'logo--visa',      description: 'Credit / Debit Card' },
  { id: PaymentMethod.MASTERCARD,    label: 'Mastercard',    icon: 'credit_card',            logoClass: 'logo--mc',        description: 'Credit / Debit Card' },
  { id: PaymentMethod.PAYPAL,        label: 'PayPal',        icon: 'account_balance_wallet', logoClass: 'logo--paypal',    description: 'Pay with PayPal' },
  { id: PaymentMethod.GOOGLE_PAY,    label: 'Google Pay',    icon: 'smartphone',             logoClass: 'logo--gpay',      description: 'UPI / Google Pay' },
  { id: PaymentMethod.APPLE_PAY,     label: 'Apple Pay',     icon: 'phone_iphone',           logoClass: 'logo--applepay',  description: 'Pay with Apple' },
  { id: PaymentMethod.AMAZON_PAY,    label: 'Amazon Pay',    icon: 'shopping_basket',        logoClass: 'logo--amazonpay', description: 'Amazon Account' },
  { id: PaymentMethod.BANK_TRANSFER, label: 'Bank Transfer', icon: 'account_balance',        logoClass: 'logo--bank',      description: 'NEFT / RTGS / IMPS' },
];

export const INDIAN_BANKS: IndianBank[] = [
  { name: 'State Bank of India (SBI)',    code: 'SBIN' },
  { name: 'HDFC Bank',                   code: 'HDFC' },
  { name: 'ICICI Bank',                  code: 'ICIC' },
  { name: 'Axis Bank',                   code: 'UTIB' },
  { name: 'Kotak Mahindra Bank',         code: 'KKBK' },
  { name: 'Punjab National Bank',        code: 'PUNB' },
  { name: 'Bank of Baroda',              code: 'BARB' },
  { name: 'Canara Bank',                 code: 'CNRB' },
  { name: 'Union Bank of India',         code: 'UBIN' },
  { name: 'Indian Bank',                 code: 'IDIB' },
  { name: 'IndusInd Bank',               code: 'INDB' },
  { name: 'IDFC First Bank',             code: 'IDFB' },
  { name: 'Federal Bank',                code: 'FDRL' },
  { name: 'South Indian Bank',           code: 'SIBL' },
  { name: 'Yes Bank',                    code: 'YESB' },
  { name: 'Karur Vysya Bank',            code: 'KVBL' },
  { name: 'UCO Bank',                    code: 'UCBA' },
  { name: 'Central Bank of India',       code: 'CBIN' },
  { name: 'Indian Overseas Bank',        code: 'IOBA' },
  { name: 'Punjab & Sind Bank',          code: 'PSIB' },
  { name: 'Bank of India',               code: 'BKID' },
  { name: 'Bank of Maharashtra',         code: 'MAHB' },
  { name: 'Bandhan Bank',                code: 'BDBL' },
  { name: 'RBL Bank',                    code: 'RATN' },
  { name: 'DCB Bank',                    code: 'DCBL' },
  { name: 'Tamilnad Mercantile Bank',    code: 'TMBL' },
  { name: 'City Union Bank',             code: 'CIUB' },
  { name: 'Karnataka Bank',              code: 'KARB' },
  { name: 'Dhanlaxmi Bank',              code: 'DLXB' },
  { name: 'Nainital Bank',               code: 'NTBL' },
];

export const ALL_PLANS: PremiumPlan[] = [
  {
    id: 'silver', name: 'Silver', tier: 'silver', price: 999, duration: '3 months',
    isPopular: false,
    features: [
      'All Free features', 'View 10 matches/day', 'Advanced search filters',
      'See who viewed your profile', 'Send 5 interests/day', 'Chat unlock on mutual interest',
    ],
  },
  {
    id: 'gold', name: 'Gold', tier: 'gold', price: 2499, duration: '6 months',
    isPopular: true,
    features: [
      'All Silver features', 'Unlimited matches', 'Priority connection requests',
      'Boost profile visibility', 'Top Match Picks weekly', 'Video introductions',
      'Horoscope matching', 'Chat with icebreakers',
    ],
  },
  {
    id: 'platinum', name: 'Platinum', tier: 'platinum', price: 4999, duration: '12 months',
    isPopular: false,
    features: [
      'All Gold features', 'Dedicated relationship advisor', 'Profile verification badge',
      'Premium customer support', 'Exclusive matchmaking events', 'Re-match suggestions',
      'Daily match digest', 'Advanced AI insights',
    ],
  },
];
