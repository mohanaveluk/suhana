import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { PaginatedResult } from '../models/pagination.model';
import {
  AdminDashboardMetrics,
  AdminReportsQuery,
  CreateReplyRequest,
  CreateReviewRequest,
  FeatureReviewRequest,
  PublicReviewQuery,
  RejectReviewRequest,
  ReportReviewRequest,
  ResolveReportRequest,
  Review,
  ReviewReport,
  ReviewReply,
  ReviewStats,
  UpdateReviewRequest,
} from '../models/review.model';

@Injectable({ providedIn: 'root' })
export class ReviewsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/v1/reviews`;

  // ── Public ────────────────────────────────────────────────────────────────
  getFeatured(): Observable<Review[]> {
    return this.http.get<Review[]>(`${this.base}/public/featured`).pipe(retry(1));
  }

  getStats(): Observable<ReviewStats> {
    return this.http.get<ReviewStats>(`${this.base}/public/stats`).pipe(retry(1));
  }

  listPublic(query: PublicReviewQuery = {}): Observable<PaginatedResult<Review>> {
    let params = new HttpParams();
    if (query.page)       params = params.set('page', String(query.page));
    if (query.limit)      params = params.set('limit', String(query.limit));
    if (query.reviewType) params = params.set('reviewType', query.reviewType);
    if (query.rating)     params = params.set('rating', String(query.rating));
    if (query.sort)       params = params.set('sort', query.sort);
    if (query.keyword)    params = params.set('keyword', query.keyword);
    return this.http.get<PaginatedResult<Review>>(`${this.base}/public`, { params }).pipe(retry(1));
  }

  getPublicDetail(id: string): Observable<Review> {
    return this.http.get<Review>(`${this.base}/public/${id}`);
  }

  getReplies(reviewId: string): Observable<ReviewReply[]> {
    return this.http.get<ReviewReply[]>(`${this.base}/${reviewId}/replies`).pipe(retry(1));
  }

  // ── Authenticated ─────────────────────────────────────────────────────────
  create(dto: CreateReviewRequest): Observable<Review> {
    return this.http.post<Review>(this.base, dto);
  }

  update(id: string, dto: UpdateReviewRequest): Observable<Review> {
    return this.http.put<Review>(`${this.base}/${id}`, dto);
  }

  remove(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}`);
  }

  getMyReviews(page = 1, limit = 20): Observable<PaginatedResult<Review>> {
    const params = new HttpParams().set('page', String(page)).set('limit', String(limit));
    return this.http.get<PaginatedResult<Review>>(`${this.base}/my`, { params });
  }

  getMyReports(page = 1, limit = 20): Observable<PaginatedResult<ReviewReport>> {
    const params = new HttpParams().set('page', String(page)).set('limit', String(limit));
    return this.http.get<PaginatedResult<ReviewReport>>(`${this.base}/my-reports`, { params });
  }

  createReply(reviewId: string, dto: CreateReplyRequest): Observable<ReviewReply> {
    return this.http.post<ReviewReply>(`${this.base}/${reviewId}/replies`, dto);
  }

  createNestedReply(reviewId: string, replyId: string, dto: CreateReplyRequest): Observable<ReviewReply> {
    return this.http.post<ReviewReply>(`${this.base}/${reviewId}/replies/${replyId}`, dto);
  }

  like(reviewId: string): Observable<unknown> {
    return this.http.post(`${this.base}/${reviewId}/like`, {});
  }

  unlike(reviewId: string): Observable<unknown> {
    return this.http.delete(`${this.base}/${reviewId}/like`);
  }

  report(reviewId: string, dto: ReportReviewRequest): Observable<unknown> {
    return this.http.post(`${this.base}/${reviewId}/report`, dto);
  }
}
