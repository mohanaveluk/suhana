import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PaginatedResult } from '../models/pagination.model';
import {
  AdminAllReviewsQuery,
  AdminDashboardMetrics,
  AdminReportsQuery,
  FeatureReviewRequest,
  RejectReviewRequest,
  ResolveReportRequest,
  Review,
  ReviewReport,
  ReviewReorderItem,
} from '../models/review.model';
import {
  SuccessStory,
  VerifyMarriageRequest,
  VerifyMarriageResponse,
} from '../models/success-story.model';
import { ReportStatus } from '../enums/testimonial.enum';

@Injectable({ providedIn: 'root' })
export class AdminReviewsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/v1/admin`;

  dashboard(): Observable<AdminDashboardMetrics> {
    return this.http.get<AdminDashboardMetrics>(`${this.base}/reviews/dashboard`);
  }

  listAll(query: AdminAllReviewsQuery = {}): Observable<PaginatedResult<Review>> {
    let params = new HttpParams();
    if (query.status    !== undefined) params = params.set('status',     query.status);
    if (query.featured  !== undefined) params = params.set('featured',   String(query.featured));
    if (query.reviewType)              params = params.set('reviewType', query.reviewType);
    if (query.minRating !== undefined) params = params.set('minRating',  String(query.minRating));
    if (query.maxRating !== undefined) params = params.set('maxRating',  String(query.maxRating));
    if (query.sort)                    params = params.set('sort',       query.sort);
    if (query.page)                    params = params.set('page',       String(query.page));
    if (query.limit)                   params = params.set('limit',      String(query.limit));
    return this.http.get<PaginatedResult<Review>>(`${this.base}/reviews`, { params });
  }

  reorder(items: ReviewReorderItem[]): Observable<void> {
    return this.http.patch<void>(`${this.base}/reviews/reorder`, items);
  }

  listPending(page = 1, limit = 20): Observable<PaginatedResult<Review>> {
    const params = new HttpParams().set('page', String(page)).set('limit', String(limit));
    return this.http.get<PaginatedResult<Review>>(`${this.base}/reviews/pending`, { params });
  }

  listReports(query: AdminReportsQuery = {}): Observable<PaginatedResult<ReviewReport>> {
    let params = new HttpParams();
    if (query.page)   params = params.set('page', String(query.page));
    if (query.limit)  params = params.set('limit', String(query.limit));
    if (query.status) params = params.set('status', query.status);
    return this.http.get<PaginatedResult<ReviewReport>>(`${this.base}/reviews/reports`, { params });
  }

  approve(id: string): Observable<Review> {
    return this.http.patch<Review>(`${this.base}/reviews/${id}/approve`, {});
  }

  reject(id: string, dto: RejectReviewRequest): Observable<Review> {
    return this.http.patch<Review>(`${this.base}/reviews/${id}/reject`, dto);
  }

  feature(id: string, dto: FeatureReviewRequest): Observable<Review> {
    return this.http.patch<Review>(`${this.base}/reviews/${id}/feature`, dto);
  }

  resolveReport(reportId: string, dto: ResolveReportRequest): Observable<ReviewReport> {
    return this.http.patch<ReviewReport>(`${this.base}/reports/${reportId}/resolve`, dto);
  }

  approveStory(id: string): Observable<SuccessStory> {
    return this.http.patch<SuccessStory>(`${this.base}/success-stories/${id}/approve`, {});
  }

  verifyMarriage(id: string, dto: VerifyMarriageRequest): Observable<VerifyMarriageResponse> {
    return this.http.patch<VerifyMarriageResponse>(`${this.base}/success-stories/${id}/verify-marriage`, dto);
  }
}
