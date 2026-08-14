/**
 * Single source of truth for admin navigation — consumed by both the layout
 * sidebar and the landing page cards so the two can never drift apart.
 */
export interface AdminNavItem {
  title: string;
  /** Short label for the sidebar rail and quick-action buttons. */
  short: string;
  description: string;
  icon: string;
  route: string;
  /** Extra terms the module search should match on. */
  keywords: string;
  /** routerLinkActive exact matching — needed for /admin itself. */
  exact?: boolean;
}

export const ADMIN_HOME: AdminNavItem = {
  title: 'Dashboard',
  short: 'Dashboard',
  description: 'Admin home and navigation hub.',
  icon: 'dashboard',
  route: '/admin',
  keywords: 'dashboard home admin hub overview',
  exact: true,
};

export const ADMIN_MODULES: AdminNavItem[] = [
  {
    title: 'Match Fixed Dashboard',
    short: 'Match Fixed',
    description: 'Manage match-fixed workflows and approvals.',
    icon: 'favorite',
    route: '/match-fixed/admin',
    keywords: 'match fixed workflow approval matchmaking',
  },
  {
    title: 'Testimonials Review',
    short: 'Testimonials',
    description: 'Review and moderate testimonials.',
    icon: 'rate_review',
    route: '/testimonials/admin',
    keywords: 'testimonial review moderate success story rating',
  },
  {
    title: 'Feedback Management',
    short: 'Feedback',
    description: 'Review user feedback and complaints.',
    icon: 'feedback',
    route: '/admin/feedback',
    keywords: 'feedback complaint support ticket',
  },
  {
    title: 'AI Search Analytics',
    short: 'Analytics',
    description: 'Analyze AI search trends and analytics.',
    icon: 'analytics',
    route: '/admin/search-analytics',
    keywords: 'ai search analytics trends fallback insights reports',
  },
];

/** Sidebar order: Dashboard first, then the modules. */
export const ADMIN_NAV: AdminNavItem[] = [ADMIN_HOME, ...ADMIN_MODULES];
