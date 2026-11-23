import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AnalyticsService } from './analytics.service';

/** Analytics cookie consent. Renders only when GA4 is configured and the visitor has not chosen yet. */
@Component({
  selector: 'app-consent-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    @if (analytics.needsConsent()) {
      <aside class="cb" role="dialog" aria-live="polite" aria-label="Cookie consent">
        <p>
          We use optional analytics cookies to understand which pages help people find a partner.
          No profile details are shared. <a routerLink="/privacy-policy">Privacy policy</a>
        </p>
        <div class="cb-actions">
          <button type="button" class="cb-btn cb-btn--ghost" (click)="analytics.setConsent(false)">Decline</button>
          <button type="button" class="cb-btn" (click)="analytics.setConsent(true)">Accept</button>
        </div>
      </aside>
    }
  `,
  styles: [`
    .cb {
      position: fixed; left: 16px; right: 16px; bottom: 16px; z-index: 1000; max-width: 640px; margin: 0 auto;
      display: flex; gap: 16px; align-items: center; flex-wrap: wrap;
      padding: 14px 16px; border-radius: 14px; background: #fff; color: var(--suhana-text-primary, #3d2c2e);
      border: 1px solid var(--suhana-rose-gold-lighter, #f0d4d8); box-shadow: 0 10px 30px rgba(92, 0, 24, 0.18);
      font-size: 0.875rem; line-height: 1.5;
    }
    .cb p { margin: 0; flex: 1 1 260px; }
    .cb a { color: var(--suhana-maroon, #800020); }
    .cb-actions { display: flex; gap: 8px; }
    .cb-btn {
      border: 0; border-radius: 999px; padding: 8px 18px; cursor: pointer; font: inherit; font-weight: 600;
      background: var(--suhana-maroon, #800020); color: #fff;
    }
    .cb-btn--ghost { background: transparent; color: var(--suhana-maroon, #800020); border: 1px solid currentColor; }
    .cb-btn:focus-visible { outline: 2px solid var(--suhana-gold, #c9a84c); outline-offset: 2px; }
  `],
})
export class ConsentBannerComponent {
  protected readonly analytics = inject(AnalyticsService);
}
