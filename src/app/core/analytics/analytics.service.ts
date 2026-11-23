import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Conversion events. Parameters must never contain personal or profile data. */
export type AnalyticsEvent =
  | 'cta_register_click'   // a "Register" call-to-action was clicked (cta_location says where)
  | 'registration_start'   // first interaction with the registration form
  | 'sign_up'              // registration completed (GA4 recommended event name)
  | 'generate_lead';       // contact / enquiry form submitted (GA4 recommended event name)

type Consent = 'granted' | 'denied' | null;
const CONSENT_KEY = 'aurora_analytics_consent';

declare global {
  interface Window { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void; }
}

/**
 * Optional, consent-gated Google Analytics 4. Does nothing unless `environment.ga4MeasurementId`
 * is set AND the visitor accepted analytics cookies; never runs during prerendering.
 *
 * Privacy: page views report the route *pattern* (e.g. /profile-view/:id) for any route that has
 * parameters, so member/profile ids never reach Google. Do not add PII to event params.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly router = inject(Router);
  private readonly doc = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly measurementId = environment.ga4MeasurementId;

  /** Whether the consent banner should be shown. */
  readonly needsConsent = signal(false);
  private loaded = false;
  private started = false;

  get enabled(): boolean {
    return this.isBrowser && !!this.measurementId;
  }

  init(): void {
    if (!this.enabled || this.started) return;
    this.started = true;
    const consent = this.readConsent();
    this.needsConsent.set(consent === null);
    if (consent === 'granted') this.load();

    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      if (!this.loaded) return;
      window.gtag?.('event', 'page_view', {
        page_path: this.safePath(this.router.routerState.snapshot.root),
        page_title: this.doc.title,
      });
    });
  }

  setConsent(granted: boolean): void {
    if (!this.enabled) return;
    try { localStorage.setItem(CONSENT_KEY, granted ? 'granted' : 'denied'); } catch { /* storage blocked */ }
    this.needsConsent.set(false);
    if (granted) this.load();
  }

  track(event: AnalyticsEvent, params: Record<string, string | number | boolean> = {}): void {
    if (!this.loaded) return;
    window.gtag?.('event', event, params);
  }

  // ── internals ────────────────────────────────────────────────────────────
  private load(): void {
    if (this.loaded || !this.enabled) return;
    this.loaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() { window.dataLayer!.push(arguments); };
    window.gtag('js', new Date());
    // Page views are sent manually (SPA navigation, and with sanitised paths).
    window.gtag('config', this.measurementId, { send_page_view: false, anonymize_ip: true });
    const s = this.doc.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(this.measurementId)}`;
    this.doc.head.appendChild(s);
    window.gtag('event', 'page_view', {
      page_path: this.safePath(this.router.routerState.snapshot.root),
      page_title: this.doc.title,
    });
  }

  private readConsent(): Consent {
    try {
      const v = localStorage.getItem(CONSENT_KEY);
      return v === 'granted' || v === 'denied' ? v : null;
    } catch {
      return null;
    }
  }

  /** Route pattern when the route has params (no ids), otherwise the real path; never the query string. */
  private safePath(root: ActivatedRouteSnapshot): string {
    const parts: string[] = [];
    let hasParams = false;
    for (let r: ActivatedRouteSnapshot | null = root; r; r = r.firstChild) {
      const p = r.routeConfig?.path;
      if (p) parts.push(p);
      if (Object.keys(r.params ?? {}).length) hasParams = true;
    }
    if (hasParams) return '/' + parts.join('/');
    return this.router.url.split(/[?#]/)[0] || '/';
  }
}
