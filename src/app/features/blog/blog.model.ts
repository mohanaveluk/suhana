/**
 * Mirrors `NestBlogService.toDto` in suhana-api/src/modules/blog/blog.service.ts
 * (served by GET /v1/public/blog/posts[/:id]). Dates arrive as ISO strings.
 */
export interface PublicBlogPost {
  id: string;
  title: string;
  excerpt: string;
  contentHtml: string;
  category: string;
  categoryLabel: string;
  tags: string[];
  author: { id: string; name: string; role: string; initials: string; avatarColor: string };
  publishedAt: string;
  updatedAt?: string;
  readTime: number;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  trending: boolean;
  featured: boolean;
}

/** Must match `blogSlug()` in suhana-api/src/modules/seo/seo-url.util.ts (used by the sitemap). */
export function blogSlug(title: string): string {
  return (title ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '') || 'article';
}

export function blogPostPath(post: Pick<PublicBlogPost, 'id' | 'title'>): string {
  return `/matrimony-blog/${encodeURIComponent(post.id)}/${blogSlug(post.title)}`;
}
