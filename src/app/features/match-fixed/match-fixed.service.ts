import { Injectable, inject, signal, computed } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../services/api.service';
import {
  CreateMatchFixedDto, UpdateMatchFixedDto, MatchFixedResponse, PublicStoriesQuery,
} from './models/match-fixed.model';
import { SuccessStoryResponse, PaginatedSuccessStories } from './models/success-story.model';
import { SuccessStatsResponse, AdminDashboardResponse } from './models/dashboard-metrics.model';

@Injectable({ providedIn: 'root' })
export class MatchFixedService {
  private readonly api = inject(ApiService);

  private readonly _myRecord    = signal<MatchFixedResponse | null>(null);
  private readonly _stories     = signal<SuccessStoryResponse[]>([]);
  private readonly _featured    = signal<SuccessStoryResponse[]>([]);
  private readonly _stats       = signal<SuccessStatsResponse | null>(null);
  private readonly _isLoading   = signal(false);
  private readonly _error       = signal<string | null>(null);
  private readonly _currentPage = signal(1);
  private readonly _totalPages  = signal(1);

  readonly myRecord    = this._myRecord.asReadonly();
  readonly stories     = this._stories.asReadonly();
  readonly featured    = this._featured.asReadonly();
  readonly stats       = this._stats.asReadonly();
  readonly isLoading   = this._isLoading.asReadonly();
  readonly error       = this._error.asReadonly();
  readonly currentPage = this._currentPage.asReadonly();
  readonly totalPages  = this._totalPages.asReadonly();
  readonly hasMore     = computed(() => this._currentPage() < this._totalPages());

  async createMatchFixed(dto: CreateMatchFixedDto): Promise<MatchFixedResponse> {
    this._isLoading.set(true);
    this._error.set(null);
    try {
      const res = await firstValueFrom(this.api.createMatchFixed(dto as unknown as Record<string, unknown>));
      const record: MatchFixedResponse = res?.data ?? res;
      this._myRecord.set(record);
      return record;
    } catch (err: any) {
      this._error.set(err?.error?.message ?? 'Failed to submit match details.');
      throw err;
    } finally {
      this._isLoading.set(false);
    }
  }

  async getMyMatchFixed(): Promise<MatchFixedResponse | null> {
    this._isLoading.set(true);
    try {
      const res = await firstValueFrom(this.api.getMyMatchFixed());
      const record: MatchFixedResponse = res?.data ?? res;
      this._myRecord.set(record);
      return record;
    } catch (err: any) {
      if (err?.status === 404) { this._myRecord.set(null); return null; }
      this._error.set(err?.error?.message ?? 'Failed to load your match record.');
      return null;
    } finally {
      this._isLoading.set(false);
    }
  }

  async getMatchFixedById(id: string): Promise<MatchFixedResponse | null> {
    try {
      const res = await firstValueFrom(this.api.getMatchFixedById(id));
      return res?.data ?? res;
    } catch { return null; }
  }

  async updateMatchFixed(id: string, dto: UpdateMatchFixedDto): Promise<MatchFixedResponse> {
    this._isLoading.set(true);
    try {
      const res = await firstValueFrom(this.api.updateMatchFixed(id, dto as Record<string, unknown>));
      const record: MatchFixedResponse = res?.data ?? res;
      this._myRecord.set(record);
      return record;
    } catch (err: any) {
      this._error.set(err?.error?.message ?? 'Failed to update match details.');
      throw err;
    } finally {
      this._isLoading.set(false);
    }
  }

  async cancelMatchFixed(id: string): Promise<void> {
    this._isLoading.set(true);
    try {
      await firstValueFrom(this.api.deleteMatchFixed(id));
      this._myRecord.set(null);
    } catch (err: any) {
      this._error.set(err?.error?.message ?? 'Failed to cancel match.');
      throw err;
    } finally {
      this._isLoading.set(false);
    }
  }

  async getPublicStories(query: PublicStoriesQuery = {}): Promise<PaginatedSuccessStories> {
    this._isLoading.set(true);
    try {
      const params: Record<string, string | number> = {};
      if (query.page)        params['page']        = query.page;
      if (query.limit)       params['limit']       = query.limit;
      if (query.matchSource) params['matchSource'] = query.matchSource;
      const res = await firstValueFrom(this.api.getPublicSuccessStories(params));
      const paginated: PaginatedSuccessStories = res?.data ?? res;
      this._stories.set(paginated.data ?? []);
      this._currentPage.set(paginated.page ?? 1);
      this._totalPages.set(paginated.totalPages ?? 1);
      return res;
    } catch (err: any) {
      this._error.set(err?.error?.message ?? 'Failed to load success stories.');
      return { data: [], total: 0, page: 1, limit: 12, totalPages: 1 };
    } finally {
      this._isLoading.set(false);
    }
  }

  async loadMoreStories(query: PublicStoriesQuery = {}): Promise<void> {
    if (!this.hasMore()) return;
    this._isLoading.set(true);
    try {
      const params: Record<string, string | number> = { page: this._currentPage() + 1, limit: 12 };
      if (query.matchSource) params['matchSource'] = query.matchSource;
      const res = await firstValueFrom(this.api.getPublicSuccessStories(params));
      const paginated: PaginatedSuccessStories = res?.data ?? res;
      this._stories.update(s => [...s, ...(paginated.data ?? [])]);
      this._currentPage.set(paginated.page ?? this._currentPage() + 1);
    } catch { /* silent */ } finally {
      this._isLoading.set(false);
    }
  }

  async getFeaturedStories(): Promise<SuccessStoryResponse[]> {
    try {
      const res = await firstValueFrom(this.api.getFeaturedSuccessStories());
      const list: SuccessStoryResponse[] = res?.data ?? res ?? [];
      this._featured.set(list);
      return list;
    } catch { return []; }
  }

  async getSuccessStats(): Promise<SuccessStatsResponse | null> {
    try {
      const res = await firstValueFrom(this.api.getSuccessStats());
      const s: SuccessStatsResponse = res?.data ?? res;
      this._stats.set(s);
      return s;
    } catch { return null; }
  }

  async getStoryDetails(id: string): Promise<SuccessStoryResponse | null> {
    try {
      const res = await firstValueFrom(this.api.getSuccessStoryById(id));
      return res?.data ?? res;
    } catch { return null; }
  }

  async getAdminDashboard(): Promise<AdminDashboardResponse | null> {
    try {
      const res = await firstValueFrom(this.api.getMatchFixedAdminDashboard());
      return res?.data ?? res;
    } catch { return null; }
  }

  async verifyPartner(id: string): Promise<void> {
    await firstValueFrom(this.api.verifyMatchFixedPartner(id));
  }

  async uploadPhoto(file: File): Promise<string> {
    const res = await firstValueFrom(this.api.uploadMatchFixedPhoto(file));
    return res?.data?.imageUrl ?? res?.imageUrl ?? '';
  }
}
