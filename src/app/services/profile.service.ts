import { Injectable, signal, computed, inject } from '@angular/core';
import {
  UserProfile, Gender, MatchPreferences,
} from '../models/user.model';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly api  = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly profiles = signal<UserProfile[]>([]);
  private readonly userProfile = signal<UserProfile | null>(null);
  private initialized = false;

  private readonly _currentPage = signal(1);
  private readonly _totalPages = signal(1);
  private readonly _isLoadingMore = signal(false);

  /** Page size used for server-side paged fetches. */
  private static readonly PAGE_SIZE = 20;
  /** Base filters (e.g. { status: 'all' }) that persist across paging + search. */
  private readonly _baseFilters = signal<Record<string, string | number>>({});
  /** Active free-text search term, sent to the API as `query`. */
  private readonly _searchTerm = signal('');

  readonly allProfiles = this.profiles.asReadonly();
  readonly myProfile = this.userProfile.asReadonly();
  readonly currentPage = this._currentPage.asReadonly();
  readonly totalPages = this._totalPages.asReadonly();
  readonly isLoadingMore = this._isLoadingMore.asReadonly();
  readonly searchTerm = this._searchTerm.asReadonly();
  readonly hasMoreProfiles = computed(() => this._currentPage() < this._totalPages());

  /**
   * Initial paged load. Captures the caller's filters as the base set for
   * subsequent {@link goToPage}/{@link applySearch} calls, and resets to page 1.
   */
  async loadProfiles(params?: Record<string, string | number>): Promise<void> {
    // Strip pagination + search keys — those are managed internally.
    const base = { ...(params ?? {}) };
    delete base['page'];
    delete base['limit'];
    delete base['query'];
    this._baseFilters.set(base);
    this._searchTerm.set('');
    await this.fetchProfiles(1);
    this.initialized = true;
  }

  /** Navigate to a specific 1-based page within the current filter/search set. */
  async goToPage(page: number): Promise<void> {
    if (page < 1 || page > this._totalPages()) return;
    await this.fetchProfiles(page);
  }

  /**
   * Apply combined server-side filters (free-text query, gender, status).
   * gender/status are folded into the base filters so they persist across paging;
   * always resets to page 1 since the result set changes.
   */
  async applyFilters(filters: { query?: string; gender?: string; status?: string }): Promise<void> {
    const base: Record<string, string | number> = { ...this._baseFilters() };

    if (filters.gender) base['gender'] = filters.gender;
    else delete base['gender'];

    if (filters.status) base['status'] = filters.status;
    else delete base['status'];

    this._baseFilters.set(base);
    this._searchTerm.set((filters.query ?? '').trim());
    await this.fetchProfiles(1);
  }

  /** Server-side page fetch honouring the active base filters + search term. */
  private async fetchProfiles(page: number): Promise<void> {
    const params: Record<string, string | number> = {
      ...this._baseFilters(),
      page,
      limit: ProfileService.PAGE_SIZE,
    };
    const term = this._searchTerm();
    if (term) params['query'] = term;

    try {
      const res = await firstValueFrom(this.api.getProfiles(params));
      const list = res.data ?? res;
      this.profiles.set(Array.isArray(list) ? list : []);
      this._currentPage.set(res.page ?? page);
      this._totalPages.set(res.totalPages ?? 1);
    } catch {
      throw new Error('Failed to load profiles');
    }
  }

  async loadMoreProfiles(): Promise<void> {
    if (!this.hasMoreProfiles() || this._isLoadingMore()) return;
    this._isLoadingMore.set(true);
    try {
      const nextPage = this._currentPage() + 1;
      const res = await firstValueFrom(this.api.getProfiles({ page: nextPage }));
      const list = res.data ?? res;
      if (Array.isArray(list) && list.length > 0) {
        this.profiles.update(existing => [...existing, ...list]);
      }
      if (res.page != null) this._currentPage.set(res.page);
      if (res.totalPages != null) this._totalPages.set(res.totalPages);
    } catch {
      throw new Error('Failed to load more profiles');
    } finally {
      this._isLoadingMore.set(false);
    }
  }

  async loadMyProfile(): Promise<void> {
    try {
      const profile = await firstValueFrom(this.api.getMyProfile());
      this.userProfile.set(profile);
    } catch { /* fallback: keep current */ }
  }

  /**
   * Fetch a single profile by ID.
   * Checks the in-memory cache first (instant). Falls back to the API.
   * The API result is merged into the cache for subsequent lookups.
   */
  async getProfileById(id: string, routePath:  string = 'profile-view'): Promise<UserProfile> {
    // 1 — local cache hit
    const cached = this.getProfile(id);
    if (cached) return cached;

    // 2 — API fetch with fallback to mock
    try {
      const result = routePath === 'profile-view'
        ? await firstValueFrom(this.api.getProfileById(id))
        : await firstValueFrom(this.api.getProfileByCode(id));

      const profile: UserProfile = result?.data ?? result;
      // Store in cache
      this.profiles.update(list => {
        const exists = list.some(p => p.userId === profile.userId);
        return exists ? list : [...list, profile];
      });
      return profile;
    } catch {
      // If profiles haven't been loaded yet, load mocks and retry
      if (!this.initialized) {
        this.profiles.set(this.generateMockProfiles());
        this.initialized = true;
        const mock = this.getProfile(id);
        if (mock) return mock;
      }
      throw new Error(`Profile not found: ${id}`);
    }
  }

  getProfile(userId: string): UserProfile | undefined {
    return this.profiles().find(p => p.userId === userId);
  }

  patchProfileStatus(userId: string, status: import('../models/user.model').ProfileStatus): void {
    this.profiles.update(list =>
      list.map(p => p.user?.id === userId ? { ...p, status } : p)
    );
  }

  getProfiles(filters?: Partial<MatchPreferences>): UserProfile[] {
    if (!this.initialized) {
      //this.profiles.set(this.generateMockProfiles());
      this.initialized = true;
    }
    let results = this.profiles();
    if (filters) {
      if (filters.religions?.length) {
        results = results.filter(p => filters.religions!.includes(p.religion));
      }
      if (filters.locations?.length) {
        results = results.filter(p => filters.locations!.includes(p.location.city));
      }
      if (filters.ageRange) {
        results = results.filter(p => p.age >= filters.ageRange!.min && p.age <= filters.ageRange!.max);
      }
      if (filters.education?.length) {
        results = results.filter(p => filters.education!.includes(p.education.level));
      }
      if (filters.occupations?.length) {
        results = results.filter(p => filters.occupations!.includes(p.occupation.title));
      }
    }
    return results;
  }

  async uploadPhoto(file: File): Promise<string> {
    const res = await firstValueFrom(this.api.uploadPhoto(file));
    const url: string = res?.data?.url ?? res?.imageUrl ?? '';
    if (url) {
      const current = this.userProfile();
      if (current) {
        const newPhoto = { id: res?.profileId ?? `photo_${Date.now()}`, url, isPrimary: true, isVerified: false };
        const rest = (current.photos ?? []).map(p => ({ ...p, isPrimary: false }));
        this.userProfile.set({ ...current, photos: [newPhoto, ...rest] });
      }
    }
    return url;
  }

  async uploadAdmxPhoto(id: string, file: File): Promise<string> {
    const res = await firstValueFrom(this.api.uploadAdmxPhoto(id, file));
    const url: string = res?.data?.url ?? res?.imageUrl ?? '';
    if (url) {
      const current = this.userProfile();
      if (current) {
        const newPhoto = { id: res?.profileId ?? `photo_${Date.now()}`, url, isPrimary: true, isVerified: false };
        const rest = (current.photos ?? []).map(p => ({ ...p, isPrimary: false }));
        this.userProfile.set({ ...current, photos: [newPhoto, ...rest] });
      }
    }
    return url;
  }  

async updateNewProfile(profile: Partial<UserProfile>): Promise<void> {
    try {
      const updated = await firstValueFrom(this.api.updateNewProfile(profile as Record<string, unknown>));
      this.userProfile.set(updated);

    } catch (err) {
      const current = this.userProfile();
      if (current) {
        this.userProfile.set({ ...current, ...profile });
      }
      throw err;
    }
  }

  async updateProfile(profile: Partial<UserProfile>): Promise<void> {
    try {
      const updated = await firstValueFrom(this.api.updateProfile(profile as Record<string, unknown>));
      this.userProfile.set(updated);
      
      this.auth.patchUser({
        firstName: profile.firstName,
        lastName:  profile.lastName,
      });

    } catch (err) {
      const current = this.userProfile();
      if (current) {
        this.userProfile.set({ ...current, ...profile });
      }
      throw err;
    }
  }

  // uploadProfileImage(file: File): Observable<{ imageUrl: string }> {
  //   const formData = new FormData();
  //   formData.append('file', file, file.name);
  //   const url = this.apiUrlBuilder.buildApiUrl('auth/profile/image');
  //   return this.http.post<{ imageUrl: string }>(url, formData).pipe(
  //     tap(() => this.profileUpdatedSource.next())
  //   );
  // }


  createProfile(profile: UserProfile): void {
    this.userProfile.set(profile);
    this.profiles.update(list => [...list, profile]);
    //this.api.updateNewProfile(profile);
  }

  async reportProfile(userId: string, reason: string): Promise<string> {
    // In a real app, this would call an API endpoint to report the profile.
    try {
      const res = await firstValueFrom(this.api.reportUser(userId, reason));
      if (res?.status === 'success') {
        return res?.message.toString() ?? 'Profile reported successfully.';
      }
      return res?.message.toString() ?? 'Failed to report profile.';
    } catch (error) {
      console.error(`Error reporting user ${userId}:`, error);
      return 'Failed to report profile.';
    }
  }  


  private generateMockProfiles(): UserProfile[] {
    const brideNames = [
      { first: 'Ananya', last: 'Sharma' }, { first: 'Priya', last: 'Patel' },
      { first: 'Meera', last: 'Reddy' }, { first: 'Kavya', last: 'Nair' },
      { first: 'Ishita', last: 'Singh' }, { first: 'Riya', last: 'Gupta' },
      { first: 'Aisha', last: 'Khan' }, { first: 'Sneha', last: 'Joshi' },
      { first: 'Tanvi', last: 'Deshmukh' }, { first: 'Pooja', last: 'Menon' },
      { first: 'Divya', last: 'Iyer' }, { first: 'Neha', last: 'Verma' },
    ];
    const groomNames = [
      { first: 'Arjun', last: 'Kapoor' }, { first: 'Rahul', last: 'Mehta' },
      { first: 'Vikram', last: 'Rao' }, { first: 'Karthik', last: 'Suresh' },
      { first: 'Aditya', last: 'Sharma' }, { first: 'Rohan', last: 'Malhotra' },
      { first: 'Siddharth', last: 'Patel' }, { first: 'Nikhil', last: 'Agarwal' },
    ];
    const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad', 'Pune', 'Kolkata', 'Jaipur'];
    const religions = ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Jain', 'Buddhist'];
    const educationLevels = ["Bachelor", "Master", 'PhD', 'MBA', 'Medical', 'Engineering'];
    const occupations = ['Software Engineer', 'Doctor', 'Lawyer', 'Business Analyst', 'Teacher', 'Designer', 'Entrepreneur', 'CA'];
    const companies = ['Google', 'TCS', 'Infosys', 'Wipro', 'Amazon', 'Microsoft', 'Apple', 'Deloitte'];
    const profiles: UserProfile[] = [];

    brideNames.forEach((name, i) => {
      profiles.push(this.createMockProfile(`bride_${i + 1}`, name.first, name.last, 'bride', 23 + (i % 8), cities[i % cities.length], religions[i % religions.length], educationLevels[i % educationLevels.length], occupations[i % occupations.length], companies[i % companies.length], i));
    });
    groomNames.forEach((name, i) => {
      profiles.push(this.createMockProfile(`groom_${i + 1}`, name.first, name.last, 'groom', 25 + (i % 8), cities[i % cities.length], religions[i % religions.length], educationLevels[i % educationLevels.length], occupations[i % occupations.length], companies[i % companies.length], i + 12));
    });
    return profiles;
  }

  private createMockProfile(userId: string, firstName: string, lastName: string, gender: Gender, age: number, city: string, religion: string, education: string, occupation: string, company: string, seed: number): UserProfile {
    const heights = ['5\'2"', '5\'4"', '5\'5"', '5\'6"', '5\'7"', '5\'8"', '5\'9"', '5\'10"', '5\'11"', '6\'0"'];
    const motherTongues = ['Hindi', 'Tamil', 'Telugu', 'Malayalam', 'Marathi', 'Bengali', 'Gujarati', 'Kannada'];
    const photoId = (seed % 20) + 1;
    const genderPath = gender === 'bride' ? 'women' : 'men';
    return {
      userId, firstName, lastName, age, gender, religion,
      dateOfBirth: new Date(2026 - age, seed % 12, (seed % 28) + 1),
      motherTongue: motherTongues[seed % motherTongues.length],
      location: { city, state: city, country: 'India', willingToRelocate: seed % 2 === 0 },
      education: { level: education, field: ['Computer Science', 'Medicine', 'Commerce', 'Arts', 'Engineering'][seed % 5], institution: ['IIT Delhi', 'IIM Ahmedabad', 'AIIMS', 'NIT', 'Mumbai University'][seed % 5] },
      occupation: { title: occupation, company, annualIncome: `${5 + (seed % 20)} LPA`, workingStatus: 'Employed' },
      height: heights[seed % heights.length],
      aboutMe: `Hi, I'm ${firstName}. I'm a ${occupation} based in ${city}. Looking forward to finding a life partner who shares my outlook on life.`,
      photos: [{ id: `photo_${userId}`, url: `https://randomuser.me/api/portraits/${genderPath}/${photoId}.jpg`, isPrimary: true, isVerified: seed % 3 === 0 }],
      familyDetails: { familyType: seed % 2 === 0 ? 'joint' : 'nuclear', fatherOccupation: ['Business', 'Government Service', 'Retired', 'Doctor'][seed % 4], motherOccupation: ['Homemaker', 'Teacher', 'Doctor', 'Business'][seed % 4], siblings: seed % 4, familyValues: 'Traditional with modern outlook' },
      preferences: { ageRange: { min: age - 3, max: age + 5 }, religions: [religion], locations: [city] },
      photoPrivacy: 'everyone', status: 'active', profileCompleteness: 70 + (seed % 30),
    };
  }
}
