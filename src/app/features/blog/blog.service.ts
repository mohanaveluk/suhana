import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { PublicBlogPost } from './blog.model';

/** Read-only access to published blog articles (public endpoints, no sign-in needed). */
@Injectable({ providedIn: 'root' })
export class BlogService {
  private readonly api = inject(ApiService);

  /** Newest first. Throws on network/API errors so pages can show an error state. */
  async list(page = 1, pageSize = 12): Promise<PublicBlogPost[]> {
    const res = await firstValueFrom(this.api.getPublicBlogPosts(page, pageSize));
    return res?.data ?? [];
  }

  /** Every published article (for prerendering). Returns what it could get on failure. */
  async listAll(max = 500): Promise<PublicBlogPost[]> {
    const all: PublicBlogPost[] = [];
    try {
      for (let page = 1; all.length < max; page++) {
        const batch = await this.list(page, 50);
        all.push(...batch);
        if (batch.length < 50) break;
      }
    } catch { /* API unavailable — prerender what we have; the rest render in the browser */ }
    return all;
  }

  /** null when the article does not exist or is not published. */
  async get(id: string): Promise<PublicBlogPost | null> {
    try {
      return await firstValueFrom(this.api.getPublicBlogPost(id));
    } catch (err: any) {
      if (err?.status === 404 || err?.status === 400) return null;
      throw err;
    }
  }
}
