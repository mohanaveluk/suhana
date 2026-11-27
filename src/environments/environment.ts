export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  /** Public origin used for canonical URLs, Open Graph and structured data (no trailing slash). */
  siteUrl: 'http://localhost:4200',
  /** Aurora for Providers (separate web app, same Aurora identity). 'For Providers' links and the account switcher go here. */
  providersUrl: 'http://localhost:57844',
  /** GA4 measurement id (e.g. 'G-XXXXXXX'). Empty = analytics disabled. Loaded only after cookie consent. */
  ga4MeasurementId: '',
  cryptoSecret: 'suhana-dev-secret-key-2026',
};
