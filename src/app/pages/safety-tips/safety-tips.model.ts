export enum SafetyCategory {
  ONLINE_SAFETY        = 'ONLINE_SAFETY',
  PROFILE_VERIFICATION = 'PROFILE_VERIFICATION',
  MEETING_IN_PERSON    = 'MEETING_IN_PERSON',
  FINANCIAL_SAFETY     = 'FINANCIAL_SAFETY',
  COMMUNICATION        = 'COMMUNICATION',
  REPORTING_ABUSE      = 'REPORTING_ABUSE',
  ACCOUNT_SECURITY     = 'ACCOUNT_SECURITY',
  PRIVACY              = 'PRIVACY',
}

export interface SafetyTip {
  id: string;
  guid?: string;
  title: string;
  category: SafetyCategory;
  content: string;
  displayOrder: number;
  isFeatured: boolean;
  isActive?: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CategoryMeta {
  icon:    string;
  label:   string;
  color:   string;
  bgColor: string;
}

export const CATEGORY_META: Record<SafetyCategory, CategoryMeta> = {
  [SafetyCategory.ACCOUNT_SECURITY]:    { icon: 'lock',            label: 'Account Security',     color: '#1565C0', bgColor: '#E3F2FD' },
  [SafetyCategory.ONLINE_SAFETY]:       { icon: 'security',        label: 'Online Safety',        color: '#2E7D32', bgColor: '#E8F5E9' },
  [SafetyCategory.PROFILE_VERIFICATION]:{ icon: 'verified_user',   label: 'Profile Verification', color: '#00838F', bgColor: '#E0F7FA' },
  [SafetyCategory.COMMUNICATION]:       { icon: 'chat_bubble',     label: 'Communication Safety', color: '#6A1B9A', bgColor: '#F3E5F5' },
  [SafetyCategory.FINANCIAL_SAFETY]:    { icon: 'account_balance', label: 'Financial Safety',     color: '#E65100', bgColor: '#FFF3E0' },
  [SafetyCategory.MEETING_IN_PERSON]:   { icon: 'people',          label: 'Meeting in Person',    color: '#558B2F', bgColor: '#F1F8E9' },
  [SafetyCategory.PRIVACY]:             { icon: 'shield',          label: 'Privacy Protection',   color: '#4527A0', bgColor: '#EDE7F6' },
  [SafetyCategory.REPORTING_ABUSE]:     { icon: 'flag',            label: 'Reporting Abuse',      color: '#C62828', bgColor: '#FFEBEE' },
};

export const FALLBACK_TIPS: SafetyTip[] = [
  // Account Security
  { id: 'b059a3aa-939f-4d42-9023-888e5d42e90d', title: 'Use a Strong, Unique Password', category: SafetyCategory.ACCOUNT_SECURITY, content: 'Create a password with at least 12 characters combining uppercase, lowercase, numbers, and symbols. Never reuse passwords from other websites.', displayOrder: 1, isFeatured: false },
  { id: 'daee61e9-7b15-4676-8996-96c9c218bf60', title: 'Enable Two-Factor Authentication', category: SafetyCategory.ACCOUNT_SECURITY, content: 'Add an extra layer of security to your account by enabling 2FA. This ensures only you can access your account even if your password is compromised.', displayOrder: 2, isFeatured: false },
  { id: '42c79afb-0043-4e54-ad80-52a762c3999f', title: 'Never Share Your OTP Code', category: SafetyCategory.ACCOUNT_SECURITY, content: 'Suhana will never ask for your OTP over phone or chat. If someone claiming to be from Suhana asks for your OTP, it is a scam — report it immediately.', displayOrder: 3, isFeatured: false },
  { id: '3336ec09-3621-4063-b0f1-8077b2d1718d', title: 'Log Out from Shared Devices', category: SafetyCategory.ACCOUNT_SECURITY, content: 'Always log out from your Suhana account when using shared computers, phones, or public devices to prevent unauthorized access to your profile.', displayOrder: 4, isFeatured: false },

  // Online Safety
  { id: '4853bb0e-b5f3-43a5-88d8-3298ef1ff711', title: 'Avoid Clicking Suspicious Links', category: SafetyCategory.ONLINE_SAFETY, content: 'Never click links sent by matches leading to unknown websites, login pages, or file downloads. These could be phishing attempts designed to steal your credentials.', displayOrder: 1, isFeatured: false },
  { id: 'df45258b-ca5f-498a-b66c-a059638b9574', title: 'Use a Secure Internet Connection', category: SafetyCategory.ONLINE_SAFETY, content: 'Avoid accessing your Suhana account over public Wi-Fi. Use mobile data or a trusted home connection, or use a reputable VPN when on public networks.', displayOrder: 2, isFeatured: false },
  { id: '981a4aa3-5314-4403-9b70-bedca13cf65c', title: 'Keep Your App and Device Updated', category: SafetyCategory.ONLINE_SAFETY, content: 'Keep your browser, Suhana app, and device operating system updated to ensure you have the latest security patches against known vulnerabilities.', displayOrder: 3, isFeatured: false },

  // Profile Verification
  { id: '8541030d-228d-4e27-9778-9eb1aa50a863', title: 'Verify Before You Trust', category: SafetyCategory.PROFILE_VERIFICATION, content: 'Review profile information carefully. Check for consistency in education, employment, city, and age across the conversation. Inconsistencies are red flags.', displayOrder: 1, isFeatured: false },
  { id: '8f2abb35-6bde-41d2-91d9-62791c0a8bd7', title: 'Request a Video Call Early', category: SafetyCategory.PROFILE_VERIFICATION, content: 'Before serious discussions, request a live video call to confirm the person matches their profile photos. Insist on this before sharing personal information.', displayOrder: 2, isFeatured: false },
  { id: '97a2dbbb-61fb-48c4-9687-cf5e71f380c5', title: 'Report Suspicious Profiles Immediately', category: SafetyCategory.PROFILE_VERIFICATION, content: 'If a profile seems fake, uses stock photos, or has inconsistent information, use the "Report Profile" button immediately. Our team reviews all reports within 24 hours.', displayOrder: 3, isFeatured: false },

  // Communication
  { id: '665b16b4-e08e-4726-8553-474c3fc349a9', title: 'Keep Conversations on the Platform', category: SafetyCategory.COMMUNICATION, content: 'Use Suhana\'s built-in messaging system initially. Moving too quickly to personal numbers or third-party apps removes platform protections and can expose you to fraud.', displayOrder: 1, isFeatured: false },
  { id: '52ec0068-218a-461f-8a22-92336c92b673', title: 'Do Not Share Personal Information Too Soon', category: SafetyCategory.COMMUNICATION, content: 'Avoid sharing your home address, workplace location, daily routine, or personal email in early conversations. Build trust gradually over time.', displayOrder: 2, isFeatured: false },
  { id: '048d16cd-0f50-4926-bd38-2436271229cb', title: 'Recognize Emotional Manipulation', category: SafetyCategory.COMMUNICATION, content: 'Scammers often create urgency, express intense love quickly ("love bombing"), or share dramatic emergencies to manipulate emotions. If it feels too fast, trust your instincts.', displayOrder: 3, isFeatured: true },

  // Financial Safety
  { id: 'a91fa500-5bd4-4e78-bae9-cb1bad3293d8', title: 'Never Send Money to Someone You Have Not Met', category: SafetyCategory.FINANCIAL_SAFETY, content: 'Be extremely cautious of anyone requesting financial assistance, wire transfers, gift cards, investments, loans, or emergency funds. This is the #1 red flag for romance scams.', displayOrder: 1, isFeatured: true },
  { id: '800d193c-410d-4c1c-82ae-f8774d2a8922', title: 'Avoid Investment Schemes', category: SafetyCategory.FINANCIAL_SAFETY, content: 'Be wary of matches who introduce investment opportunities, cryptocurrency schemes, or "too good to be true" financial proposals. These are classic fraud tactics used on matrimony sites.', displayOrder: 2, isFeatured: false },
  { id: '9a1760ea-fc1d-4f88-8168-246be2e9e247', title: 'Never Share Banking or Card Details', category: SafetyCategory.FINANCIAL_SAFETY, content: 'Do not share bank account numbers, card details, UPI IDs, or PAN numbers with anyone you have met online. No legitimate match would ever ask for this information.', displayOrder: 3, isFeatured: false },

  // Meeting in Person
  { id: '7d5d2012-a757-4ddc-a36c-a1a9e483b117', title: 'Always Meet in a Public Place', category: SafetyCategory.MEETING_IN_PERSON, content: 'For the first few meetings, choose busy public locations such as coffee shops, restaurants, or shopping malls. Avoid isolated locations or private residences.', displayOrder: 1, isFeatured: false },
  { id: '36796ecf-ebf8-4fdb-97e6-37f85d92deaa', title: 'Inform a Trusted Family Member or Friend', category: SafetyCategory.MEETING_IN_PERSON, content: 'Always tell someone you trust where you are going, who you are meeting, and when you expect to return. Share the person\'s profile and contact details with them beforehand.', displayOrder: 2, isFeatured: false },
  { id: '97d735c6-ed17-4d97-adef-4daa5089c686', title: 'Arrange Your Own Transportation', category: SafetyCategory.MEETING_IN_PERSON, content: 'Drive yourself or book an independent cab service for the first meeting. Avoid accepting rides from someone you have met only online, regardless of how well you know them digitally.', displayOrder: 3, isFeatured: false },

  // Privacy
  { id: 'ac170f9b-d374-4bb1-bf8e-949a87892de5', title: 'Protect Your Government ID Documents', category: SafetyCategory.PRIVACY, content: 'Never share photos or numbers of Aadhaar, Passport, Driving License, PAN card, or Voter ID with anyone you met online, no matter how convincing their reason sounds.', displayOrder: 1, isFeatured: true },
  { id: '53c9eb28-08f9-4569-9e2d-f55556236247', title: 'Control Your Social Media Visibility', category: SafetyCategory.PRIVACY, content: 'Review your social media privacy settings before sharing profiles. Ensure your home address, workplace, and daily routines are not publicly visible to strangers.', displayOrder: 2, isFeatured: false },
  { id: '4de89db4-bed4-4268-b4eb-fcf59eff7c9f', title: 'Be Careful with Photo Sharing', category: SafetyCategory.PRIVACY, content: 'Once a photo is shared digitally, you lose control over it. Avoid sharing intimate or personally sensitive photos with anyone you have only met online.', displayOrder: 3, isFeatured: false },

  // Reporting Abuse
  { id: '57aef693-726b-4433-9327-c1fb7049437d', title: 'Report Harassment Immediately', category: SafetyCategory.REPORTING_ABUSE, content: 'If you experience harassment, threats, or inappropriate behavior, use the "Report" feature without delay. Our trust and safety team investigates every report seriously.', displayOrder: 1, isFeatured: false },
  { id: '711d348f-1326-4a1f-a7b4-18d21961e37a', title: 'Report Blackmail or Threats', category: SafetyCategory.REPORTING_ABUSE, content: 'If someone threatens to share photos, videos, or personal information unless you comply with their demands, do not pay. Report to us immediately and contact your local police.', displayOrder: 2, isFeatured: true },
  { id: '4f313e8f-8526-42bf-b77a-8f30b365eef6', title: 'Document Everything Before Reporting', category: SafetyCategory.REPORTING_ABUSE, content: 'If you suspect fraud or experience abuse, take screenshots of conversations, profile links, and any suspicious messages before reporting. These records help our investigation.', displayOrder: 3, isFeatured: false },
];
