export interface HelpCategory {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
}

export interface HelpArticle {
  id: string;
  title: string;
  excerpt: string;
  categoryId: string;
  icon: string;
  viewCount: number;
  readTimeMinutes: number;
  updatedAt: string;
  link: string;
  linkLabel: string;
}

export interface HelpFaq {
  id: string;
  question: string;
  answer: string;
  categoryId: string;
}

export type HelpSearchHitType = 'category' | 'article' | 'faq';

export interface HelpSearchHit {
  type: HelpSearchHitType;
  id: string;
  title: string;
  subtitle: string;
  link: string;
}

export const HELP_CATEGORIES: HelpCategory[] = [
  {
    id: 'account',
    title: 'Account & Registration',
    description: 'Creating your account, signing in, email verification, and password resets.',
    icon: 'how_to_reg',
    color: '#800020',
    bgColor: 'rgba(128,0,32,0.08)',
  },
  {
    id: 'profile',
    title: 'Profile Management',
    description: 'Editing your profile, uploading photos, and controlling who sees what.',
    icon: 'account_circle',
    color: '#b76e79',
    bgColor: 'rgba(183,110,121,0.10)',
  },
  {
    id: 'matchmaking',
    title: 'AI Matchmaking',
    description: 'How compatibility scoring, saved matches, and match requests work.',
    icon: 'favorite',
    color: '#da286e',
    bgColor: 'rgba(218,40,110,0.08)',
  },
  {
    id: 'horoscope',
    title: 'Horoscope Matching',
    description: 'Uploading your Kundli and reading compatibility reports.',
    icon: 'auto_awesome',
    color: '#c9a84c',
    bgColor: 'rgba(201,168,76,0.14)',
  },
  {
    id: 'billing',
    title: 'Membership & Billing',
    description: 'Premium plans, payments, subscriptions, and refunds.',
    icon: 'workspace_premium',
    color: '#a40029',
    bgColor: 'rgba(164,0,41,0.08)',
  },
  {
    id: 'safety',
    title: 'Safety & Privacy',
    description: 'Reporting profiles, blocking users, and staying safe while matchmaking.',
    icon: 'shield',
    color: '#5c0018',
    bgColor: 'rgba(92,0,24,0.08)',
  },
  {
    id: 'technical',
    title: 'Technical Support',
    description: 'App issues, slow performance, and mobile troubleshooting.',
    icon: 'build',
    color: '#6b5557',
    bgColor: 'rgba(107,85,87,0.08)',
  },
  {
    id: 'contact',
    title: 'Contact Support',
    description: "Reach our team directly for anything that's not covered here.",
    icon: 'support_agent',
    color: '#b97002',
    bgColor: 'rgba(185,112,2,0.08)',
  },
];

export const HELP_ARTICLES: HelpArticle[] = [
  {
    id: 'art-photo-upload',
    title: 'How to upload and verify your profile photos',
    excerpt: 'Add clear, recent photos and understand how photo verification badges work.',
    categoryId: 'profile',
    icon: 'add_a_photo',
    viewCount: 5230,
    readTimeMinutes: 3,
    updatedAt: '2026-08-10',
    link: '/profile/edit',
    linkLabel: 'Go to Edit Profile',
  },
  {
    id: 'art-ai-score',
    title: 'Understanding your AI compatibility score',
    excerpt: 'What the 0–100 score means and how each dimension is weighted.',
    categoryId: 'matchmaking',
    icon: 'insights',
    viewCount: 8890,
    readTimeMinutes: 4,
    updatedAt: '2026-08-14',
    link: '/matchmaking',
    linkLabel: 'Open Matchmaking',
  },
  {
    id: 'art-kundli-upload',
    title: 'Uploading your Kundli for horoscope matching',
    excerpt: 'Add birth details or upload a horoscope document to unlock Guna Milan reports.',
    categoryId: 'horoscope',
    icon: 'upload_file',
    viewCount: 3110,
    readTimeMinutes: 3,
    updatedAt: '2026-07-29',
    link: '/profile/edit',
    linkLabel: 'Add Horoscope Details',
  },
  {
    id: 'art-plan-comparison',
    title: 'Comparing Premium plans: Silver vs Gold vs Platinum',
    excerpt: 'A side-by-side look at what each membership tier unlocks.',
    categoryId: 'billing',
    icon: 'workspace_premium',
    viewCount: 6420,
    readTimeMinutes: 5,
    updatedAt: '2026-08-05',
    link: '/premium',
    linkLabel: 'View Plans',
  },
  {
    id: 'art-report-block',
    title: 'How to report or block a profile',
    excerpt: 'Steps to flag inappropriate behaviour and manage your block list.',
    categoryId: 'safety',
    icon: 'flag',
    viewCount: 2870,
    readTimeMinutes: 2,
    updatedAt: '2026-08-01',
    link: '/safety-tips',
    linkLabel: 'Open Safety Center',
  },
  {
    id: 'art-slow-mobile',
    title: 'Fixing slow load times on mobile',
    excerpt: 'Quick checks before you contact support about performance issues.',
    categoryId: 'technical',
    icon: 'speed',
    viewCount: 1540,
    readTimeMinutes: 2,
    updatedAt: '2026-07-20',
    link: '/contact',
    linkLabel: 'Report an Issue',
  },
  {
    id: 'art-reset-password',
    title: 'Resetting a forgotten password',
    excerpt: 'Recover access to your account in under two minutes.',
    categoryId: 'account',
    icon: 'lock_reset',
    viewCount: 4980,
    readTimeMinutes: 2,
    updatedAt: '2026-08-16',
    link: '/forgot-password',
    linkLabel: 'Reset Password',
  },
  {
    id: 'art-privacy-controls',
    title: 'Controlling who can see your photos',
    excerpt: 'Set photo visibility to Everyone, Connections Only, or Private.',
    categoryId: 'profile',
    icon: 'visibility',
    viewCount: 3675,
    readTimeMinutes: 3,
    updatedAt: '2026-08-12',
    link: '/settings',
    linkLabel: 'Open Privacy Settings',
  },
  {
    id: 'art-manual-search',
    title: 'Using filters to search profiles manually',
    excerpt: 'Narrow results by religion, location, education, and occupation.',
    categoryId: 'matchmaking',
    icon: 'tune',
    viewCount: 2255,
    readTimeMinutes: 3,
    updatedAt: '2026-07-25',
    link: '/search',
    linkLabel: 'Go to Search',
  },
  {
    id: 'art-guna-milan',
    title: 'Understanding Guna Milan and Manglik status',
    excerpt: 'A plain-language guide to the 36-point Kundli matching system.',
    categoryId: 'horoscope',
    icon: 'auto_awesome',
    viewCount: 1980,
    readTimeMinutes: 4,
    updatedAt: '2026-08-08',
    link: '/faq',
    linkLabel: 'Read More',
  },
];

export const HELP_FAQS: HelpFaq[] = [
  {
    id: 'faq-free',
    question: 'Is Suhana free to use?',
    answer: 'Yes. Free membership lets you create a profile, browse profiles, and receive AI-generated matches. Premium plans unlock unlimited messaging, advanced filters, and priority listing.',
    categoryId: 'billing',
  },
  {
    id: 'faq-ai-matching',
    question: 'How does AI Matchmaking work?',
    answer: 'Our AI analyses 12+ compatibility dimensions — age, education, location, family values, lifestyle, and more — to produce a 0–100 compatibility score with a detailed breakdown.',
    categoryId: 'matchmaking',
  },
  {
    id: 'faq-verify-email',
    question: 'How do I verify my email?',
    answer: 'We send a verification link after registration. Click it to activate your account. You can resend the email from Settings if it doesn\'t arrive within a few minutes.',
    categoryId: 'account',
  },
  {
    id: 'faq-who-sees-photos',
    question: 'Who can see my profile photos?',
    answer: 'You control this in Settings — set photos to visible by Everyone, Connections Only, or keep them private. Contact details are only shared with confirmed connections.',
    categoryId: 'profile',
  },
  {
    id: 'faq-report-profile',
    question: 'How do I report a suspicious profile?',
    answer: 'Open the profile, click the flag icon, and choose a reason. Our moderation team reviews every report within 24 hours.',
    categoryId: 'safety',
  },
  {
    id: 'faq-horoscope-matching',
    question: 'What is Horoscope Matching (Kundli Milan)?',
    answer: 'A traditional compatibility analysis based on birth details, covering Guna Milan (36-point scoring), Manglik status, and overall astrological compatibility between two charts.',
    categoryId: 'horoscope',
  },
];

export const HELP_TRENDING_SEARCHES: string[] = [
  'upload photos',
  'reset password',
  'premium plans',
  'horoscope matching',
  'report a profile',
  'AI matching score',
];
