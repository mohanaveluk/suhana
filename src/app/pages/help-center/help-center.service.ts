import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import {
  HELP_ARTICLES, HELP_CATEGORIES, HELP_FAQS,
  HelpArticle, HelpCategory, HelpFaq, HelpSearchHit,
} from './help-center.model';

/**
 * Backs the Help Center with static mock data behind the same method
 * signatures the real API will use later (GET /v1/help/categories,
 * /v1/help/articles/popular, /v1/help/faqs/popular, /v1/help/search).
 * Swapping to the live backend is a one-line change per method —
 * replace the `of(...).pipe(delay(...))` body with an `ApiService` call.
 */
@Injectable({ providedIn: 'root' })
export class HelpCenterService {
  private static readonly LATENCY_MS = 300;

  getCategories(): Observable<HelpCategory[]> {
    return of(HELP_CATEGORIES).pipe(delay(HelpCenterService.LATENCY_MS));
  }

  getPopularArticles(): Observable<HelpArticle[]> {
    return of([...HELP_ARTICLES].sort((a, b) => b.viewCount - a.viewCount))
      .pipe(delay(HelpCenterService.LATENCY_MS));
  }

  getFeaturedFaqs(): Observable<HelpFaq[]> {
    return of(HELP_FAQS).pipe(delay(HelpCenterService.LATENCY_MS));
  }

  search(query: string): Observable<HelpSearchHit[]> {
    const q = query.trim().toLowerCase();
    if (!q) return of([]);

    const hits: HelpSearchHit[] = [
      ...HELP_CATEGORIES
        .filter(c => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q))
        .map((c): HelpSearchHit => ({
          type: 'category', id: c.id, title: c.title, subtitle: c.description, link: '',
        })),
      ...HELP_ARTICLES
        .filter(a => a.title.toLowerCase().includes(q) || a.excerpt.toLowerCase().includes(q))
        .map((a): HelpSearchHit => ({
          type: 'article', id: a.id, title: a.title, subtitle: a.excerpt, link: a.link,
        })),
      ...HELP_FAQS
        .filter(f => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q))
        .map((f): HelpSearchHit => ({
          type: 'faq', id: f.id, title: f.question, subtitle: f.answer, link: '/faq',
        })),
    ];

    return of(hits.slice(0, 8)).pipe(delay(180));
  }
}
