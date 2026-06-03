import {
  Component, ChangeDetectionStrategy, AfterViewInit,
  ViewChildren, QueryList, ElementRef,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MaterialModule } from '../../shared/modules/material.module';

interface Feature     { icon: string; title: string; description: string; }
interface CoreValue   { icon: string; title: string; description: string; colorClass: string; }
interface TimelineStep { step: number; icon: string; title: string; description: string; }
interface Stat         { value: string; label: string; icon: string; }
interface FaqItem      { question: string; answer: string; }
interface MissionPillar { icon: string; title: string; }
interface SuccessPromise { icon: string; title: string; desc: string; }

@Component({
  selector: 'app-about-us',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MaterialModule],
  templateUrl: './about-us.component.html',
  styleUrl: './about-us.component.scss',
})
export class AboutUsComponent implements AfterViewInit {

  // { read: ElementRef } forces resolution to the DOM element even when
  // #animTarget sits on a Material component (mat-card, mat-accordion, etc.)
  // whose default query result would be the component instance — no nativeElement.
  @ViewChildren('animTarget', { read: ElementRef }) private animTargets!: QueryList<ElementRef>;

  readonly features: Feature[] = [
    { icon: 'auto_awesome',    title: 'AI-Powered Matchmaking',  description: 'Our proprietary AI analyses over 200 compatibility dimensions to suggest truly meaningful matches — beyond age and caste alone.' },
    { icon: 'stars',           title: 'Horoscope Compatibility', description: 'Traditional kundali matching enhanced with AI precision, honouring the timeless wisdom of astrology with modern intelligence.' },
    { icon: 'compare_arrows',  title: 'Match Comparison',        description: 'Compare up to 4 potential partners side-by-side with detailed compatibility breakdowns so you can decide with clarity.' },
    { icon: 'verified_user',   title: 'Verified Profiles',       description: 'Every profile is authenticated through face verification. You connect only with genuine people on a trustworthy platform.' },
    { icon: 'photo_lock',      title: 'Photo Privacy Controls',  description: 'Decide who sees your photos — everyone, mutual matches, or premium members only. Your comfort is always our priority.' },
    { icon: 'videocam',        title: 'Video Introductions',     description: 'Express your personality beyond photographs. Short video profiles help you connect authentically before the first conversation.' },
    { icon: 'family_restroom', title: 'Family-Centric Design',   description: 'Suhana is thoughtfully designed to respectfully involve families in the journey — the way Indian traditions have always intended.' },
    { icon: 'manage_search',   title: 'Smart Search',            description: 'Intelligent multi-dimensional filters surface profiles that truly resonate with your values, lifestyle, and aspirations.' },
    { icon: 'insights',        title: 'Compatibility Insights',  description: 'Understand exactly why you match — from education and lifestyle to emotional temperament and shared life goals.' },
    { icon: 'lock',            title: 'Secure Communication',    description: 'End-to-end encrypted messaging, audio, and video calls ensure every conversation remains entirely private and safe.' },
  ];

  readonly timelineSteps: TimelineStep[] = [
    { step: 1, icon: 'person_add',      title: 'Create Your Profile',    description: 'Build an elegant, detailed profile with photos, a video introduction, and your personal preferences and values.' },
    { step: 2, icon: 'verified',        title: 'Complete Verification',  description: 'Verify your identity through our secure face verification, earning the trust badge your profile deserves.' },
    { step: 3, icon: 'auto_awesome',    title: 'Receive AI Matches',     description: 'Our AI engine analyses your profile across hundreds of dimensions and presents your most meaningful matches.' },
    { step: 4, icon: 'compare_arrows',  title: 'Compare Top Matches',    description: 'Review matches side by side — compatibility scores, horoscope insights, family background, and personality.' },
    { step: 5, icon: 'favorite',        title: 'Connect with Confidence', description: 'Begin meaningful conversations, involve your family, and take the next step toward a lifelong partnership.' },
  ];

  readonly coreValues: CoreValue[] = [
    { icon: 'verified_user',     title: 'Trust',         description: 'Every feature is built on transparency, rigorous verification, and unwavering integrity.',                         colorClass: 'value--trust' },
    { icon: 'handshake',         title: 'Respect',       description: 'We honour every individual\'s journey, boundaries, and the rich diversity of Indian traditions.',                 colorClass: 'value--respect' },
    { icon: 'security',          title: 'Privacy',       description: 'Your data and photographs are yours. Our privacy-first architecture ensures you remain in complete control.',      colorClass: 'value--privacy' },
    { icon: 'lightbulb',         title: 'Innovation',    description: 'We relentlessly advance our AI to make the path to your life partner more clear and more meaningful.',            colorClass: 'value--innovation' },
    { icon: 'family_restroom',   title: 'Family',        description: 'Indian matchmaking is a family affair. Suhana is thoughtfully designed to welcome and honour that involvement.',  colorClass: 'value--family' },
    { icon: 'workspace_premium', title: 'Commitment',    description: 'This is not a dating app. Every feature is oriented toward long-term partnership and lifelong commitment.',       colorClass: 'value--commitment' },
    { icon: 'diamond',           title: 'Authenticity',  description: 'Genuine profiles, real stories, verified faces. A space where real people find real, lasting connections.',       colorClass: 'value--authenticity' },
  ];

  readonly stats: Stat[] = [
    { value: '1,00,000+', label: 'Verified Profiles',         icon: 'people'      },
    { value: '50,000+',   label: 'Matches Suggested',         icon: 'favorite'    },
    { value: '10,000+',   label: 'Success Stories',           icon: 'celebration' },
    { value: '98%',       label: 'Profile Verification Rate', icon: 'verified'    },
  ];

  readonly missionPillars: MissionPillar[] = [
    { icon: 'verified_user',   title: 'Trust'                  },
    { icon: 'visibility',      title: 'Transparency'           },
    { icon: 'fingerprint',     title: 'Authenticity'           },
    { icon: 'lock',            title: 'Privacy'                },
    { icon: 'favorite',        title: 'Meaningful Connections' },
    { icon: 'auto_awesome',    title: 'AI-Driven Matching'     },
    { icon: 'family_restroom', title: 'Family Values'          },
  ];

  readonly successPromises: SuccessPromise[] = [
    { icon: 'verified',          title: 'Verified Members Only', desc: 'Every member undergoes identity verification before connecting with others.'     },
    { icon: 'photo_lock',        title: 'Privacy Protected',     desc: 'You control your photos and personal information at every step.'                  },
    { icon: 'auto_awesome',      title: 'AI Recommendations',    desc: 'Matches curated by intelligence, not random or sponsored placement.'              },
    { icon: 'lock',              title: 'Safe Communication',    desc: 'End-to-end encrypted messages, calls, and file attachments — always.'             },
    { icon: 'family_restroom',   title: 'Family Involvement',    desc: 'Designed to honour and include the role of family in your journey.'               },
    { icon: 'workspace_premium', title: 'Long-term Focus',       desc: 'Every feature is optimised for commitment and lifelong partnership, not casual use.' },
  ];

  readonly faqs: FaqItem[] = [
    {
      question: 'How does AI matchmaking work?',
      answer: 'Suhana\'s AI analyses your profile across 200+ compatibility dimensions — including lifestyle, values, education, career, family background, and personal preferences. It generates a compatibility score with each potential partner and provides a detailed explanation of why you match, empowering you to make a more informed and confident decision.',
    },
    {
      question: 'How is horoscope compatibility calculated?',
      answer: 'We combine the traditional 36-point kundali matching system with AI-enhanced analysis of Rashi, Nakshatra, and Manglik status. Our algorithm respects the wisdom of Vedic astrology while providing modern context — giving families the reassurance they seek in a well-considered, auspicious match.',
    },
    {
      question: 'Can I hide my photos from everyone?',
      answer: 'Absolutely. Suhana offers granular photo privacy controls. You can show your photos to everyone, only to mutual matches, only to premium members, or keep them entirely hidden until you choose to share them personally. Your comfort and dignity always come first.',
    },
    {
      question: 'Are all profiles verified?',
      answer: 'Yes. Every profile undergoes our face verification process, confirming that the person in the photos is the genuine account owner. Verified profiles carry a prominent trust badge. We maintain a 98%+ verification rate — among the highest in Indian matrimony.',
    },
    {
      question: 'Can families participate in the matchmaking process?',
      answer: 'Yes — and we genuinely encourage it. Suhana is designed with family involvement at heart. Families can review profiles, participate in communication decisions, and be present throughout the journey from match suggestions to final connection, honouring the Indian tradition of family-led matchmaking.',
    },
    {
      question: 'Is my personal data secure?',
      answer: 'Suhana uses enterprise-grade encryption for all data storage and communication. Your messages are end-to-end encrypted, your personal data is never sold to third parties, and you have complete control over your profile visibility. We are committed to being the most privacy-conscious matrimony platform in India.',
    },
  ];

  scrollToStory(): void {
    document.getElementById('au-story')?.scrollIntoView({ behavior: 'smooth' });
  }

  ngAfterViewInit(): void {
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) {
          // Element is (or was already) in the viewport — show immediately.
          e.target.classList.remove('au-anim');
          e.target.classList.add('au-visible');
          observer.unobserve(e.target);
        } else {
          // Element is below the fold — hide it so it can animate in on scroll.
          e.target.classList.add('au-anim');
        }
      }),
      { threshold: 0.08 },
    );

    this.animTargets.forEach(r => {
      if (!r?.nativeElement) return;
      observer.observe(r.nativeElement);
    });
  }
}
