import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { PaginatedResult } from '../models/pagination.model';
import {
  CreateSuccessStoryRequest,
  PublicSuccessStoryQuery,
  SuccessStory,
} from '../models/success-story.model';

@Injectable({ providedIn: 'root' })
export class SuccessStoriesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/v1/success-stories`;

  getFeatured(): Observable<SuccessStory[]> {
    return this.http.get<SuccessStory[]>(`${this.base}/public/featured`).pipe(retry(1));
  }

  listPublic(query: PublicSuccessStoryQuery = {}): Observable<PaginatedResult<SuccessStory>> {
    let params = new HttpParams();
    if (query.page)        params = params.set('page', String(query.page));
    if (query.limit)       params = params.set('limit', String(query.limit));
    if (query.verifiedOnly !== undefined)
      params = params.set('verifiedOnly', String(query.verifiedOnly));
    return this.http.get<PaginatedResult<SuccessStory>>(`${this.base}/public`, { params }).pipe(retry(1));
  }

  getDetail(id: string): Observable<SuccessStory> {
    return this.http.get<SuccessStory>(`${this.base}/public/${id}`);
  }

  create(dto: CreateSuccessStoryRequest): Observable<SuccessStory> {
    return this.http.post<SuccessStory>(this.base, dto);
  }
}
