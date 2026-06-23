import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MaterialModule } from '../../shared/modules/material.module';

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqCategory {
  id: string;
  title: string;
  icon: string;
  items: FaqItem[];
}

@Component({
  selector: 'app-faq',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MaterialModule],
  templateUrl: './faq.component.html',
  styleUrl: './faq.component.scss',
})
export class FaqComponent {
  protected readonly activeCategory = signal<string>('all');

  protected readonly categories: FaqCategory[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: 'rocket_launch',
      items: [
        {
          question: 'What is Suhana?',
          answer: 'Suhana is an elegant matrimony platform that connects compatible life partners using AI-powered matching, detailed profile analysis, and cultural compatibility scoring. Designed for modern Indian singles seeking meaningful, long-term relationships.',
        },
        {
          question: 'How do I create an account?',
          answer: 'Click "Register Free" on the homepage. Enter your name, email, gender, and mobile number. Verify your email address, then complete your profile with personal, educational, and family information to start receiving matches.',
        },
        {
          question: 'Is Suhana free to use?',
          answer: 'Yes! Suhana offers a free membership that lets you create a profile, browse profiles, and receive AI-generated matches. Premium plans (Silver, Gold, Platinum) unlock unlimited messaging, advanced filters, priority listing, and more.',
        },
        {
          question: 'How do I verify my email?',
          answer: 'After registration, we send a verification link to your email. Click the link to activate your account. Didn\'t receive it? Go to Settings and click "Resend Verification Email". Check your spam folder if it doesn\'t arrive within a few minutes.',
        },
      ],
    },
    {
      id: 'profile',
      title: 'Your Profile',
      icon: 'person',
      items: [
        {
          question: 'How do I set up a complete profile?',
          answer: 'Go to My Profile and fill in all sections: personal details (height, religion, mother tongue), educational background, occupation, family details, partner preferences, and horoscope details. Adding at least 3 photos significantly increases profile views.',
        },
        {
          question: 'What is profile completeness?',
          answer: 'Profile completeness is a percentage showing how much of your profile is filled in. A higher completeness score improves your visibility in search results and the quality of your AI-generated matches. Aim for at least 80% completeness.',
        },
        {
          question: 'How many photos can I add?',
          answer: 'You can add multiple photos to your profile gallery. We recommend 3–5 clear, recent photographs. Your primary photo appears on your profile card in search results. Photos can be individually verified for an extra trust badge.',
        },
        {
          question: 'Who can see my profile?',
          answer: 'All registered members can see your profile details. You can control photo visibility in Settings — set photos to visible by "Everyone", "Connections Only", or keep them private. Contact details are only shared with confirmed connections.',
        },
      ],
    },
    {
      id: 'matching',
      title: 'Finding Matches',
      icon: 'favorite',
      items: [
        {
          question: 'How does AI Matchmaking work?',
          answer: 'Our AI analyses over 12 compatibility dimensions — age, education, occupation, location, family values, religion, lifestyle, career, horoscope, and more. It generates a compatibility score (0–100) with a detailed breakdown for each dimension, helping you understand a match deeply.',
        },
        {
          question: 'What is the compatibility score?',
          answer: 'The compatibility score (0–100) reflects how well two profiles align across multiple dimensions. Scores above 70 indicate high compatibility. The detailed breakdown shows individual scores for each category — e.g., Education: 85, Location: 92 — so you can see exactly where you align.',
        },
        {
          question: 'Can I search for profiles manually?',
          answer: 'Yes! Use the Search page to find profiles by name, city, or occupation. The filter sidebar lets you narrow results by religion, location, education level, occupation, and gender. All searches query the live database to ensure you see the most up-to-date profiles.',
        },
        {
          question: 'What is the Shortlist feature?',
          answer: 'Shortlisting lets you save profiles you\'re interested in. Click the heart icon on any profile card to add it to your Shortlist. View all shortlisted profiles from the Shortlist page. Shortlisting is private — the other person is not notified.',
        },
        {
          question: 'What is Match Tracker?',
          answer: 'Match Tracker helps you follow the journey of each promising connection — from initial interest, to connection, to conversation, and beyond. It gives you a clear picture of where each relationship stands so you never lose track of important interactions.',
        },
      ],
    },
    {
      id: 'messaging',
      title: 'Messaging & Connecting',
      icon: 'chat',
      items: [
        {
          question: 'How do I send a connection request?',
          answer: 'Visit any profile and click "Send Interest". If the other person accepts, you\'ll be connected and messaging will be unlocked. You\'ll be notified when your interest is accepted.',
        },
        {
          question: 'How do I start a conversation?',
          answer: 'Once connected, go to Messages and select the conversation. You can send text messages, photos, and documents. If you\'re unsure how to begin, try an icebreaker — our thoughtfully crafted conversation starters designed for matrimony contexts.',
        },
        {
          question: 'What are Icebreakers?',
          answer: 'Icebreakers are pre-written conversation starters designed for matrimony contexts — covering topics like family values, life goals, travel, and traditions. They\'re great when you want to begin a meaningful conversation but aren\'t sure where to start.',
        },
        {
          question: 'Can I send photos and documents?',
          answer: 'Yes. In a conversation, use the attachment button to send images, videos, or documents (e.g., horoscope documents). File sharing is available to premium members and connected users only.',
        },
      ],
    },
    {
      id: 'safety',
      title: 'Safety & Privacy',
      icon: 'shield',
      items: [
        {
          question: 'How is my personal data protected?',
          answer: 'We use industry-standard encryption for all data in transit and at rest. Sensitive information like contact details is only shared with confirmed connections. We never sell your data to third parties. Read our full Privacy Policy for details.',
        },
        {
          question: 'How do I report an inappropriate profile?',
          answer: 'On any profile page, click the flag/report icon. Select a reason from the list (e.g., fake profile, inappropriate content, harassment) and submit. Our moderation team reviews all reports within 24 hours and takes appropriate action.',
        },
        {
          question: 'How do I block a user?',
          answer: 'On the profile page, use the options menu (three dots) and select "Block User". Blocked users can no longer see your profile, send you messages, or appear in your search results. You can manage your block list in Settings.',
        },
        {
          question: 'Are profiles verified?',
          answer: 'Profiles can earn verification badges — a blue check when their email is verified, and a photo verification badge when their identity photos are reviewed by our team. Look for verified badges when browsing to identify trusted profiles.',
        },
      ],
    },
    {
      id: 'premium',
      title: 'Premium Plans',
      icon: 'star',
      items: [
        {
          question: 'What are the Premium Plans?',
          answer: 'We offer Silver, Gold, and Platinum plans. Each tier unlocks progressively more features: unlimited messaging, priority listing in search results, advanced match filters, profile boosts, access to horoscope detailed reports, and dedicated relationship support.',
        },
        {
          question: 'What extra features do premium members get?',
          answer: 'Premium members enjoy unlimited connection requests and messaging, advanced search filters, the ability to see who viewed their profile, priority placement in search results, detailed horoscope compatibility reports, and access to the Match Tracker premium insights.',
        },
        {
          question: 'How do I upgrade to Premium?',
          answer: 'Go to Premium Plans from your profile menu or the navigation. Compare the plans, choose one that suits you, and complete payment securely. Your account is upgraded instantly. We accept all major payment methods.',
        },
        {
          question: 'Can I cancel my subscription?',
          answer: 'Yes, cancel anytime from Settings > Subscription > Cancel Plan. Your premium benefits remain active until the end of your current billing period. We don\'t offer pro-rated refunds for partial months, but you\'ll continue to enjoy premium features until the period ends.',
        },
      ],
    },
    {
      id: 'horoscope',
      title: 'Horoscope Matching',
      icon: 'auto_awesome',
      items: [
        {
          question: 'What is Horoscope Matching?',
          answer: 'Horoscope Matching (Kundli Milan) is a traditional Indian compatibility analysis based on birth details. Our platform calculates Guna Milan (36 points scoring), Manglik status comparison, and overall astrological compatibility between two birth charts.',
        },
        {
          question: 'How does Kundli compatibility work?',
          answer: 'Enter your birth date, time, and place in your profile under Horoscope Details. When viewing a match, click "Horoscope Match" to see a detailed compatibility report covering all 8 Kootas (Varna, Vashya, Tara, Yoni, Graha Maitri, Gana, Bhakoot, Nadi) with individual and total scores.',
        },
        {
          question: 'Do I need to believe in astrology to use Suhana?',
          answer: 'Not at all! Horoscope Matching is an optional feature for those who value it. Our AI compatibility score is completely independent of astrological factors and focuses on practical, measurable dimensions. Use either or both — the choice is entirely yours.',
        },
        {
          question: 'What is Manglik status?',
          answer: 'Manglik (or Mangal Dosha) is a traditional astrological consideration in Indian matrimony — it refers to the placement of Mars (Mangal) in the birth chart. Our horoscope report clearly indicates each person\'s Manglik status and assesses compatibility accordingly.',
        },
      ],
    },
  ];

  protected get displayedCategories(): FaqCategory[] {
    const active = this.activeCategory();
    if (active === 'all') return this.categories;
    return this.categories.filter(c => c.id === active);
  }

  protected setCategory(id: string): void {
    this.activeCategory.set(id);
  }
}
