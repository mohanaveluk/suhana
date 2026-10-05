import { Routes } from '@angular/router';

/** Mounted at /personality (authGuard applied on the parent route in app.routes.ts). */
export const PERSONALITY_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/personality-home/personality-home.page').then(m => m.PersonalityHomePage),
  },
  {
    path: 'assessment',
    loadComponent: () =>
      import('./pages/personality-assessment/personality-assessment.page').then(m => m.PersonalityAssessmentPage),
  },
  {
    path: 'result',
    loadComponent: () =>
      import('./pages/personality-result/personality-result.page').then(m => m.PersonalityResultPage),
  },
  {
    // :profileId is a profile id (profiles.id), not a userId — see CLAUDE.md §5 on id semantics.
    path: 'result/:profileId',
    loadComponent: () =>
      import('./pages/personality-result/personality-result.page').then(m => m.PersonalityResultPage),
  },
  {
    path: 'compatibility/:profileId',
    loadComponent: () =>
      import('./pages/personality-compatibility/personality-compatibility.page').then(
        m => m.PersonalityCompatibilityPage,
      ),
  },
];
