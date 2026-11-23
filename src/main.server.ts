import { BootstrapContext, bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { config } from './app/app.config.server';

/**
 * Prerendering runs in Node, which has no Web Storage. Many services read localStorage when they are
 * created (session, drafts, chatbot history). Pages are always prerendered as a signed-out guest, so a
 * stateless empty storage is the correct stand-in: every read returns null and writes are ignored —
 * nothing can carry over from one prerendered page to the next.
 */
const emptyStorage: Storage = {
  length: 0,
  clear: () => undefined,
  getItem: () => null,
  key: () => null,
  removeItem: () => undefined,
  setItem: () => undefined,
};
for (const name of ['localStorage', 'sessionStorage'] as const) {
  if (typeof (globalThis as Record<string, unknown>)[name] === 'undefined') {
    Object.defineProperty(globalThis, name, { value: emptyStorage, configurable: true });
  }
}

/** Server entry used at build time to prerender the public pages (angular.json → outputMode "static"). */
const bootstrap = (context: BootstrapContext) => bootstrapApplication(App, config, context);

export default bootstrap;
