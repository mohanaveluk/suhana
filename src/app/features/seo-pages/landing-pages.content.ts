import { FaqItem } from '../../core/seo/seo.model';

/**
 * Copy for the public SEO landing pages (one search intent per page).
 *
 * Editorial rules: describe only what Aurora actually does today, no invented statistics, member
 * counts, ratings or locations, and no keyword lists — write for the person searching.
 * Plan-dependent features say so (see /premium for what each plan includes).
 */
export interface LandingSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface LandingRelated {
  path: string;
  /** Descriptive anchor text. */
  text: string;
}

export interface LandingPageContent {
  slug: string;
  title: string;
  description: string;
  /** Short name used in the breadcrumb. */
  crumb: string;
  eyebrow: string;
  h1: string;
  lead: string;
  hero: { src: string; alt: string };
  sections: LandingSection[];
  faqs: FaqItem[];
  related: LandingRelated[];
  cta: { heading: string; text: string; button: string };
  /** Adds schema.org Service markup (feature pages). */
  service?: { name: string; serviceType: string };
}

const IMG = {
  families: { src: '/banners/banner7.webp', alt: 'A bride and groom wearing jasmine garlands, with their smiling families standing behind them' },
  smiling: { src: '/banners/banner12.webp', alt: 'A bride and groom in wedding garlands smiling at each other, with wedding celebrations in the background' },
  southIndian: { src: '/banners/banner6.webp', alt: 'A South Indian bride in a silk saree and her groom, both wearing jasmine and lotus garlands' },
};

export const LANDING_CONTENT: Record<string, LandingPageContent> = {
  // ─────────────────────────────────────────────────────────────────────────
  'how-it-works': {
    slug: 'how-it-works',
    title: 'How Aurora Matrimony Works — From Profile to Partner',
    description:
      'See how Aurora Matrimony works: create a profile, get AI-assisted match suggestions, check horoscope and personality compatibility, then connect safely.',
    crumb: 'How It Works',
    eyebrow: 'How Aurora works',
    h1: 'How Aurora Matrimony Helps You Find Your Life Partner',
    lead:
      'Aurora brings together the things families have always cared about — values, background, horoscope — and the things that make a marriage work day to day, like personality and communication. Here is what the journey looks like.',
    hero: IMG.families,
    sections: [
      {
        heading: '1. Create a profile that represents you honestly',
        paragraphs: [
          'Register as a bride or a groom and build your profile step by step: education and career, location, family details, lifestyle, horoscope details if you follow them, and the qualities you hope for in a partner.',
          'You decide who sees your photos, and you can add a short voice introduction so that matches hear you in your own words before the first conversation.',
        ],
      },
      {
        heading: '2. Discover matches with traditional and AI-assisted search',
        paragraphs: [
          'Use familiar filters — religion, location, education and occupation — or simply describe who you are looking for in plain language, for example “a doctor in Chennai who enjoys travel”. Aurora’s AI search understands the request and turns it into filters you can adjust.',
          'Suggested matches come with a compatibility score that explains where you align: education, career, location, family values, lifestyle and more.',
        ],
      },
      {
        heading: '3. Look deeper: horoscope and personality compatibility',
        paragraphs: [
          'If horoscope matching matters to your family, Aurora prepares a Kundli compatibility report with Ashtakoota (guna) scoring and dosha checks. Separately, the optional 16-type personality assessment shows how two people are likely to communicate and handle decisions together.',
        ],
      },
      {
        heading: '4. Connect, talk and involve your family',
        paragraphs: [
          'Shortlist profiles, send an interest, and start chatting once the interest is mutual — with icebreaker suggestions if you are not sure how to begin. Depending on your membership, you can also talk on audio or video calls inside Aurora before sharing personal contact details.',
        ],
      },
    ],
    faqs: [
      { q: 'Is it free to register on Aurora Matrimony?', a: 'Yes. Creating a profile and browsing matches is free. Paid plans add features such as more daily matches, advanced filters, chat and horoscope matching — see the membership page for details.' },
      { q: 'Can my parents help manage my search?', a: 'Many families search together. Parents can help with profile details and shortlisting, while the member stays in control of who they connect with.' },
      { q: 'Do I need a horoscope to use Aurora?', a: 'No. Horoscope details are optional. Members who follow horoscope matching can add their birth details; others can rely on compatibility scores and personality matching.' },
      { q: 'How do I stay safe while talking to matches?', a: 'Keep conversations inside Aurora until you are comfortable, never send money, and involve your family before meeting. Our safety tips page explains more.' },
    ],
    related: [
      { path: '/ai-matchmaking', text: 'How Aurora’s AI matchmaking works' },
      { path: '/horoscope-matching', text: 'Horoscope (Kundli) matching for marriage' },
      { path: '/personality-matching', text: '16 personality type matching' },
      { path: '/verified-profiles', text: 'Profile verification and safety' },
      { path: '/premium', text: 'Compare membership plans' },
    ],
    cta: { heading: 'Start your journey today', text: 'Create your free profile in a few minutes.', button: 'Register free' },
  },

  // ─────────────────────────────────────────────────────────────────────────
  'ai-matchmaking': {
    slug: 'ai-matchmaking',
    title: 'AI Matchmaking for Marriage — Smart Partner Search | Aurora',
    description:
      'Describe your ideal partner in plain words and let Aurora’s AI matchmaking find compatible brides and grooms, with clear compatibility scores you can trust.',
    crumb: 'AI Matchmaking',
    eyebrow: 'Intelligent matrimonial search',
    h1: 'AI-Powered Matchmaking That Understands What You Are Looking For',
    lead:
      'Traditional matrimonial search makes you guess the right combination of filters. Aurora lets you say what matters in your own words, then explains why each suggested match could be right for you.',
    hero: IMG.smiling,
    service: { name: 'AI-assisted matrimonial matchmaking', serviceType: 'Matrimonial matchmaking' },
    sections: [
      {
        heading: 'Search the way you would describe someone to a friend',
        paragraphs: [
          'Type a request such as “software engineer in Bangalore, 27 to 32, Tamil speaking, open to relocating”. Aurora’s AI search reads the request, recognises the details — profession, location, age range, language, relocation — and runs the search for you.',
          'Each detail it understood appears as a removable chip, so you can see exactly what was searched and widen the search with a single tap.',
        ],
      },
      {
        heading: 'Compatibility scores that explain themselves',
        paragraphs: ['Suggested matches include a compatibility percentage built from several dimensions, so a score is never a mystery:'],
        bullets: [
          'Education and career compatibility',
          'Location and willingness to relocate',
          'Religion, community and mother tongue',
          'Family type and family values',
          'Lifestyle and age gap',
          'Horoscope compatibility, when both members have added birth details',
        ],
      },
      {
        heading: 'From suggestion to conversation',
        paragraphs: [
          'Shortlist the profiles you like, compare up to four side by side, and follow each match from suggestion to shortlist, interest and conversation. You can also take the optional personality assessment to see a second, independent view of compatibility.',
        ],
      },
      {
        heading: 'Technology that supports — not replaces — your judgement',
        paragraphs: [
          'AI helps you find and understand potential matches faster. Decisions about who to talk to, and when to involve family, always stay with you.',
        ],
      },
    ],
    faqs: [
      { q: 'What is AI matchmaking in matrimony?', a: 'It uses software to understand what you are looking for — including requests written in plain language — and to rank profiles by how well they fit your preferences and theirs.' },
      { q: 'Does Aurora’s AI decide who I should marry?', a: 'No. It suggests and explains matches. You choose who to shortlist, contact and meet.' },
      { q: 'What does the compatibility score include?', a: 'Education, career, location, religion and community, family values, lifestyle and age gap, plus horoscope compatibility when both profiles include birth details.' },
      { q: 'Can I still use normal search filters?', a: 'Yes. You can use traditional filters, AI search, or both, and refine AI results by removing any detail it picked up.' },
    ],
    related: [
      { path: '/personality-matching', text: 'Add personality compatibility to your search' },
      { path: '/horoscope-matching', text: 'Check horoscope compatibility' },
      { path: '/how-it-works', text: 'See every step from profile to partner' },
      { path: '/matrimony-blog', text: 'Read our partner-search guides' },
    ],
    cta: { heading: 'Try AI matchmaking', text: 'Register free, then describe your ideal partner in your own words.', button: 'Create my profile' },
  },

  // ─────────────────────────────────────────────────────────────────────────
  'horoscope-matching': {
    slug: 'horoscope-matching',
    title: 'Horoscope Matching for Marriage — Kundli & Guna Milan | Aurora',
    description:
      'Check marriage compatibility by horoscope on Aurora Matrimony: Kundli matching with Ashtakoota guna scores, Manglik dosha checks and an easy-to-read report.',
    crumb: 'Horoscope Matching',
    eyebrow: 'Vedic horoscope compatibility',
    h1: 'Horoscope Matching for Marriage, Made Clear',
    lead:
      'For many Indian families, matching horoscopes is an important step before marriage. Aurora turns the birth details of two members into a readable Kundli compatibility report, so the conversation with your family starts from clear information.',
    hero: IMG.southIndian,
    service: { name: 'Horoscope (Kundli) matching for marriage', serviceType: 'Horoscope compatibility analysis' },
    sections: [
      {
        heading: 'What the compatibility report covers',
        paragraphs: ['Aurora’s horoscope match brings the traditional checks together in one place:'],
        bullets: [
          'Ashtakoota (Guna Milan) score out of 36, with a breakdown across all eight kootas',
          'Rasi (Moon sign) and Nakshatra of both members',
          'Manglik (Kuja) dosha and other dosha checks',
          'Planetary positions and birth charts for both members',
          'A plain-language summary of strengths and points to discuss',
        ],
      },
      {
        heading: 'What you need: accurate birth details',
        paragraphs: [
          'Horoscope matching depends on date, time and place of birth. Add them to your profile — along with your Rasi, Nakshatra and Lagna if you know them — and you can review compatibility with members who have done the same. You can also upload your existing horoscope document.',
        ],
      },
      {
        heading: 'Horoscope and compatibility, side by side',
        paragraphs: [
          'Horoscope compatibility is one part of Aurora’s overall match score, next to education, career, family values and lifestyle. Families who give horoscopes the most weight can look at it first; others can treat it as one input among many.',
        ],
      },
      {
        heading: 'A starting point for family conversations',
        paragraphs: [
          'Interpretations differ between traditions and astrologers. Many families use Aurora’s report as a first check and then consult their own astrologer before a final decision — we encourage that.',
        ],
      },
    ],
    faqs: [
      { q: 'How does horoscope matching work before marriage?', a: 'The birth details of both people are used to calculate their charts. Traditional systems such as Ashtakoota then compare eight aspects (kootas) and give a score out of 36, alongside checks such as Manglik dosha.' },
      { q: 'What is a good Guna Milan score?', a: 'Traditionally, 18 or more out of 36 is considered acceptable and higher scores are considered better, but families also weigh doshas and other factors. Treat the score as guidance, not a verdict.' },
      { q: 'Is horoscope matching included in every plan?', a: 'Horoscope matching is part of Aurora’s paid memberships. The membership page shows which plan includes which features.' },
      { q: 'Can I match horoscopes without sharing my birth time publicly?', a: 'Your birth details are used to calculate compatibility. Review your profile privacy settings to control what other members can see.' },
    ],
    related: [
      { path: '/ai-matchmaking', text: 'See how horoscope fits into your overall match score' },
      { path: '/tamil-matrimony', text: 'Tamil matrimony on Aurora' },
      { path: '/hindu-matrimony', text: 'Hindu matrimony on Aurora' },
      { path: '/premium', text: 'Membership plans that include horoscope matching' },
    ],
    cta: { heading: 'Check your horoscope compatibility', text: 'Register free and add your birth details to get started.', button: 'Register free' },
  },

  // ─────────────────────────────────────────────────────────────────────────
  'personality-matching': {
    slug: 'personality-matching',
    title: '16 Personality Type Matching for Marriage | Aurora Matrimony',
    description:
      'Take Aurora’s free personality assessment, discover your type (like ENTJ or INFJ) and see how your personality fits with a potential partner before you meet.',
    crumb: 'Personality Matching',
    eyebrow: 'Personality compatibility',
    h1: '16 Personality Matching: Understand How You Connect',
    lead:
      'Shared values bring two people together; how they communicate keeps them together. Aurora’s personality assessment adds that second lens to your partner search.',
    hero: IMG.smiling,
    service: { name: '16-type personality compatibility for marriage', serviceType: 'Relationship compatibility assessment' },
    sections: [
      {
        heading: 'Discover your personality type',
        paragraphs: [
          'Answer a short set of questions about how you recharge, take in information, make decisions and plan your life. Aurora places you in one of 16 personality types — described with familiar four-letter codes such as ENTJ, INFJ or ISFP — and explains your strengths and communication style.',
          'You can save your progress and finish later; your result appears on your profile so compatible members can see it.',
        ],
      },
      {
        heading: 'See personality compatibility with each match',
        paragraphs: [
          'When both members have taken the assessment, Aurora shows how your types fit: where you naturally agree, where you differ, and what that may mean for everyday life together — from making decisions to handling disagreements.',
        ],
      },
      {
        heading: 'An example: ENTJ and INFJ',
        paragraphs: [
          'An ENTJ tends to be decisive, direct and goal-focused; an INFJ tends to be reflective, empathetic and guided by values. Together they often share a long-term vision — while the ENTJ brings momentum and the INFJ brings depth. Knowing this early helps a couple talk openly about pace and communication.',
        ],
      },
      {
        heading: 'A second lens, not a replacement',
        paragraphs: [
          'Personality compatibility is shown alongside — not blended into — your main compatibility score, so you can weigh it the way you choose. No personality type is “better” than another, and any two types can build a happy marriage.',
        ],
      },
    ],
    faqs: [
      { q: 'What is 16 personality matching in marriage?', a: 'It compares two people’s personality types — based on how each person gains energy, processes information, decides and plans — to highlight natural strengths and possible friction in a relationship.' },
      { q: 'Is this the same as an MBTI test?', a: 'Aurora uses its own assessment built on the same widely known four-letter type framework (for example ENTJ or INFJ). It is designed for relationship insight, not clinical use.' },
      { q: 'Do both people need to take the assessment?', a: 'Yes, to see a compatibility comparison both members need a result. You can still view your own type and description on your own.' },
      { q: 'Does personality change my main match score?', a: 'No. It is shown as a separate view so you can decide how much weight to give it.' },
    ],
    related: [
      { path: '/ai-matchmaking', text: 'Combine personality with AI matchmaking' },
      { path: '/horoscope-matching', text: 'Horoscope compatibility for marriage' },
      { path: '/matrimony-blog', text: 'Articles on marriage compatibility' },
      { path: '/how-it-works', text: 'How Aurora works from start to finish' },
    ],
    cta: { heading: 'Discover your personality match', text: 'Register free, take the assessment and see who you connect with.', button: 'Get started' },
  },

  // ─────────────────────────────────────────────────────────────────────────
  'verified-profiles': {
    slug: 'verified-profiles',
    title: 'Verified Matrimonial Profiles & Safe Partner Search | Aurora',
    description:
      'How Aurora Matrimony helps you search safely: mobile verification, verification badges, trust indicators, photo privacy controls, voice introductions and reporting.',
    crumb: 'Verified Profiles',
    eyebrow: 'Trust and safety',
    h1: 'Verified Profiles and a Safer Way to Find Your Partner',
    lead:
      'Trust is the foundation of every good match. Aurora combines verification, privacy controls and clear signals so you can focus on getting to know genuine people.',
    hero: IMG.families,
    service: { name: 'Matrimonial profile verification', serviceType: 'Profile verification and safety' },
    sections: [
      {
        heading: 'How Aurora helps you identify genuine profiles',
        paragraphs: ['Several signals help you decide who to trust:'],
        bullets: [
          'Mobile number verification with a one-time code',
          'Verified photo and verified profile badges',
          'Trust indicators that reflect how consistently a profile has been maintained',
          'Voice introductions, so you can hear a match before you talk',
        ],
      },
      {
        heading: 'You control your privacy',
        paragraphs: [
          'Decide who can see your photos, and keep personal contact details private until you choose to share them. Chat, and audio or video calls (depending on your plan), happen inside Aurora — you never have to hand out your phone number to get to know someone.',
        ],
      },
      {
        heading: 'Report, block and get help',
        paragraphs: [
          'If something does not feel right, you can report or block a profile. Our team reviews reports, and the safety tips page explains warning signs such as requests for money or pressure to move conversations elsewhere.',
        ],
      },
    ],
    faqs: [
      { q: 'How do I know a matrimonial profile is genuine?', a: 'Look for mobile verification and verified badges, read the profile carefully, listen to the voice introduction if there is one, and take your time. Never send money to someone you have not met.' },
      { q: 'Can I hide my photos?', a: 'Yes. Photo privacy settings let you control who can see your photos.' },
      { q: 'What should I do if a profile seems suspicious?', a: 'Use the report option on the profile and stop responding. Our team reviews reported profiles.' },
    ],
    related: [
      { path: '/safety-tips', text: 'Online matrimony safety tips' },
      { path: '/how-it-works', text: 'How Aurora works' },
      { path: '/premium', text: 'Membership plans and verification badges' },
      { path: '/faq', text: 'Frequently asked questions' },
    ],
    cta: { heading: 'Search with confidence', text: 'Create your profile and verify your mobile number in minutes.', button: 'Register free' },
  },

  // ─────────────────────────────────────────────────────────────────────────
  'hindu-matrimony': {
    slug: 'hindu-matrimony',
    title: 'Hindu Matrimony — Find Hindu Brides & Grooms | Aurora',
    description:
      'Find Hindu brides and grooms who share your values on Aurora Matrimony — search by location, community and language, with Kundli matching and family details.',
    crumb: 'Hindu Matrimony',
    eyebrow: 'Hindu matrimony',
    h1: 'Hindu Matrimony: Find a Partner Who Shares Your Values',
    lead:
      'For Hindu families, a good match balances tradition and today’s life — family values and customs alongside education, career and personality. Aurora is built to bring all of these together.',
    hero: IMG.southIndian,
    sections: [
      {
        heading: 'Search by the details that matter to Hindu families',
        paragraphs: [
          'Search Hindu bride and groom profiles by location, education and occupation, and use AI search to add community or language — for example “Hindu groom in Pune who speaks Marathi”. Read family details such as family type and values before you reach out.',
        ],
      },
      {
        heading: 'Horoscope details and Kundli matching',
        paragraphs: [
          'Members can add Rasi, Nakshatra, Lagna and Manglik status, and upload an existing horoscope. With a paid membership you can view an Ashtakoota (Guna Milan) compatibility report for a match — a helpful first step before consulting your family astrologer.',
        ],
      },
      {
        heading: 'Beyond tradition: everyday compatibility',
        paragraphs: [
          'Aurora’s compatibility score and optional personality assessment help you understand how two people are likely to live, decide and communicate together.',
        ],
      },
    ],
    faqs: [
      { q: 'Can I search Hindu profiles by community?', a: 'Yes. Religion is a standard filter, and AI search understands community and language in requests such as “Hindu Iyer bride in Chennai”.' },
      { q: 'Does Aurora support horoscope matching for Hindu marriages?', a: 'Yes. Members can add their horoscope details, and paid memberships include an Ashtakoota compatibility report with dosha checks.' },
      { q: 'Can parents create a profile for their son or daughter?', a: 'Families often help with the profile and search. Please make sure the person getting married agrees to the profile and its details.' },
    ],
    related: [
      { path: '/horoscope-matching', text: 'Kundli and Guna Milan matching' },
      { path: '/tamil-matrimony', text: 'Tamil matrimony' },
      { path: '/telugu-matrimony', text: 'Telugu matrimony' },
      { path: '/south-indian-matrimony', text: 'South Indian matrimony' },
    ],
    cta: { heading: 'Begin your search', text: 'Register free and discover Hindu brides and grooms who share your values.', button: 'Register free' },
  },

  // ─────────────────────────────────────────────────────────────────────────
  'tamil-matrimony': {
    slug: 'tamil-matrimony',
    title: 'Tamil Matrimony — Find Compatible Tamil Brides & Grooms | Aurora',
    description:
      'Meet Tamil brides and grooms on Aurora Matrimony. Search by community and location, review horoscope details and check compatibility before you connect.',
    crumb: 'Tamil Matrimony',
    eyebrow: 'Tamil matrimony',
    h1: 'Find Your Perfect Life Partner with Tamil Matrimony',
    lead:
      'Whether your family is in Tamil Nadu or abroad, Aurora helps you meet Tamil-speaking brides and grooms whose values, background and plans fit with yours.',
    hero: IMG.southIndian,
    sections: [
      {
        heading: 'Discover Tamil brides and grooms',
        paragraphs: [
          'Type a request like “Tamil-speaking bride in Chennai working in healthcare” and let AI search do the filtering, or use the filters for religion, location, education and occupation.',
        ],
      },
      {
        heading: 'Tamil horoscope compatibility',
        paragraphs: [
          'Many Tamil families consider Nakshatra and Rasi compatibility before marriage. Members can add these details and upload their horoscope (jathagam); Aurora’s compatibility report covers Ashtakoota scoring and dosha checks. Families who prefer porutham matching often share the horoscope with their own astrologer as well.',
        ],
      },
      {
        heading: 'Personality and lifestyle fit',
        paragraphs: [
          'Alongside horoscope details, the compatibility score looks at education, career, family values and lifestyle, and the optional 16-type personality assessment shows how two people are likely to communicate.',
        ],
      },
    ],
    faqs: [
      { q: 'Can I find Tamil profiles living outside India?', a: 'Yes. Ask AI search for Tamil-speaking members in the country or city you prefer, and check whether a member is willing to relocate.' },
      { q: 'Can I upload my jathagam?', a: 'Yes. You can add your Rasi, Nakshatra and Lagna and upload an existing horoscope document to your profile.' },
      { q: 'Is Aurora only for Hindu Tamil families?', a: 'No. Tamil-speaking members of any religion can register and search by religion and community.' },
    ],
    related: [
      { path: '/horoscope-matching', text: 'How horoscope matching works' },
      { path: '/south-indian-matrimony', text: 'South Indian matrimony' },
      { path: '/nri-matrimony', text: 'NRI matrimony for Tamil families abroad' },
      { path: '/personality-matching', text: 'Personality compatibility' },
    ],
    cta: { heading: 'Meet Tamil matches today', text: 'Create your free profile and start discovering compatible Tamil brides and grooms.', button: 'Register free' },
  },

  // ─────────────────────────────────────────────────────────────────────────
  'telugu-matrimony': {
    slug: 'telugu-matrimony',
    title: 'Telugu Matrimony — Telugu Brides & Grooms | Aurora Matrimony',
    description:
      'Find Telugu brides and grooms on Aurora Matrimony — filter by community, profession and location, review family and horoscope details, and connect safely.',
    crumb: 'Telugu Matrimony',
    eyebrow: 'Telugu matrimony',
    h1: 'Telugu Matrimony: Meet Telugu Brides and Grooms Who Fit Your Family',
    lead:
      'From Andhra Pradesh and Telangana to families settled around the world, Aurora helps Telugu-speaking members find partners with shared language, values and life goals.',
    hero: IMG.families,
    sections: [
      {
        heading: 'Search Telugu profiles your way',
        paragraphs: [
          'Ask AI search for Telugu-speaking members — for example “Telugu groom in Hyderabad working in finance” — or use the filters for religion, location, education and occupation.',
        ],
      },
      {
        heading: 'Family details up front',
        paragraphs: [
          'Telugu profiles on Aurora can include family type, family values and parents’ occupations, so families can understand a match before the first conversation.',
        ],
      },
      {
        heading: 'Horoscope and personality compatibility',
        paragraphs: [
          'Add your birth details to check horoscope compatibility, and take the optional personality assessment for a second view of how two people are likely to get along.',
        ],
      },
    ],
    faqs: [
      { q: 'Can I search Telugu profiles by profession?', a: 'Yes. Describe it in AI search (“Telugu-speaking doctor”) or combine the occupation and education filters.' },
      { q: 'Are NRI Telugu profiles on Aurora?', a: 'Members can list any country of residence. Use the location filter to find Telugu members living where you prefer.' },
      { q: 'Can I talk before sharing my phone number?', a: 'Yes. Once interest is mutual you can chat inside Aurora, and depending on your plan use in-app audio or video calls.' },
    ],
    related: [
      { path: '/nri-matrimony', text: 'NRI matrimony' },
      { path: '/south-indian-matrimony', text: 'South Indian matrimony' },
      { path: '/horoscope-matching', text: 'Horoscope matching for marriage' },
      { path: '/ai-matchmaking', text: 'AI matchmaking' },
    ],
    cta: { heading: 'Find your Telugu match', text: 'Register free and start your search today.', button: 'Register free' },
  },

  // ─────────────────────────────────────────────────────────────────────────
  'south-indian-matrimony': {
    slug: 'south-indian-matrimony',
    title: 'South Indian Matrimony — Tamil, Telugu, Kannada & Malayalam | Aurora',
    description:
      'South Indian matrimony on Aurora: find Tamil, Telugu, Kannada and Malayalam brides and grooms, with horoscope details, family information and AI matchmaking.',
    crumb: 'South Indian Matrimony',
    eyebrow: 'South Indian matrimony',
    h1: 'South Indian Matrimony for Tamil, Telugu, Kannada and Malayalam Families',
    lead:
      'South Indian weddings and families have their own traditions, languages and expectations. Aurora helps you search across them — or focus on just one.',
    hero: IMG.southIndian,
    sections: [
      {
        heading: 'One search across four languages',
        paragraphs: [
          'Ask AI search for the language you prefer — Tamil, Telugu, Kannada or Malayalam — and combine it with filters for religion, location, education and occupation to keep results relevant.',
        ],
      },
      {
        heading: 'Traditions that matter, details that help',
        paragraphs: [
          'Profiles can include Rasi, Nakshatra and Lagna, Manglik status, family type and family values. For families who match horoscopes, Aurora’s compatibility report is a convenient first check before consulting an astrologer.',
        ],
      },
      {
        heading: 'Modern compatibility tools',
        paragraphs: [
          'Use AI search in plain language, see explained compatibility scores, and add the optional personality assessment to understand how a match may communicate and make decisions.',
        ],
      },
    ],
    faqs: [
      { q: 'Can I search Kannada and Malayalam profiles?', a: 'Yes. AI search understands requests such as “Malayalam groom in Kochi” or “Kannada bride in Bengaluru”.' },
      { q: 'Can I search across South Indian languages?', a: 'Yes. Leave language out of your search and narrow by location and religion, or mention the languages you are open to in AI search.' },
      { q: 'Does Aurora include horoscope details for South Indian families?', a: 'Members can add Rasi, Nakshatra, Lagna and Manglik status and upload their horoscope; paid plans include a compatibility report.' },
    ],
    related: [
      { path: '/tamil-matrimony', text: 'Tamil matrimony' },
      { path: '/telugu-matrimony', text: 'Telugu matrimony' },
      { path: '/hindu-matrimony', text: 'Hindu matrimony' },
      { path: '/horoscope-matching', text: 'Horoscope matching' },
    ],
    cta: { heading: 'Start your South Indian match search', text: 'Register free and meet compatible brides and grooms.', button: 'Register free' },
  },

  // ─────────────────────────────────────────────────────────────────────────
  'nri-matrimony': {
    slug: 'nri-matrimony',
    title: 'NRI Matrimony — Find Indian Partners Living Abroad | Aurora',
    description:
      'NRI matrimony on Aurora: meet Indian brides and grooms living abroad or open to relocating, filter by country, and talk across time zones inside the app.',
    crumb: 'NRI Matrimony',
    eyebrow: 'NRI matrimony',
    h1: 'NRI Matrimony: Find an Indian Life Partner, Wherever You Live',
    lead:
      'Living abroad makes it harder to meet someone who shares your roots. Aurora helps Non-Resident Indians and their families find partners who understand both worlds.',
    hero: IMG.smiling,
    sections: [
      {
        heading: 'Search by where you live — and where you would move',
        paragraphs: [
          'Filter by location, and see at a glance whether a member is willing to relocate. AI search understands requests such as “Gujarati software engineer in New Jersey” as well.',
        ],
      },
      {
        heading: 'Stay close to your culture',
        paragraphs: [
          'Combine location with religion, add community or language through AI search, review family details, and use horoscope matching if your family follows it.',
        ],
      },
      {
        heading: 'Get to know each other across time zones',
        paragraphs: [
          'Chat inside Aurora once interest is mutual, listen to voice introductions, and — depending on your plan — talk on in-app audio or video calls before sharing personal contact details. Families in India can stay involved throughout.',
        ],
      },
    ],
    faqs: [
      { q: 'How can NRI Indians find a marriage partner?', a: 'Register, add your country of residence and whether you are open to relocating, then search by location and religion — or use AI search to describe who you are looking for, including community and language.' },
      { q: 'Can my family in India help with my search?', a: 'Yes. Many families search together; the member stays in control of who they connect with.' },
      { q: 'Can I talk to matches in another country?', a: 'Yes. Chat works anywhere, and in-app audio and video calls are available on eligible plans.' },
    ],
    related: [
      { path: '/tamil-matrimony', text: 'Tamil matrimony' },
      { path: '/telugu-matrimony', text: 'Telugu matrimony' },
      { path: '/ai-matchmaking', text: 'AI matchmaking' },
      { path: '/verified-profiles', text: 'Verified profiles and safety' },
    ],
    cta: { heading: 'Meet compatible NRI matches', text: 'Create your free profile and start your search from anywhere.', button: 'Register free' },
  },
};
