import { Injectable, signal, inject } from '@angular/core';
import {
  UserProfile, Gender, MatchPreferences,
} from '../models/user.model';
import { ApiService } from './api.service';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly api = inject(ApiService);
  private readonly profiles = signal<UserProfile[]>([]);
  private readonly userProfile = signal<UserProfile | null>(null);
  private initialized = false;

  readonly allProfiles = this.profiles.asReadonly();
  readonly myProfile = this.userProfile.asReadonly();

  async loadProfiles(params?: Record<string, string | number>): Promise<void> {
    try {
      const res = await firstValueFrom(this.api.getProfiles(params));
      const list = res.data ?? res;
      this.profiles.set(Array.isArray(list) ? list : []);
    } catch {
      if (!this.initialized) {
        this.profiles.set(this.generateMockProfiles());
      }
    }
    this.initialized = true;
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
  async getProfileById(id: string): Promise<UserProfile> {
    // 1 — local cache hit
    const cached = this.getProfile(id);
    if (cached) return cached;

    // 2 — API fetch with fallback to mock
    try {
      const result = await firstValueFrom(this.api.getProfileById(id));
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

  async updateProfile(profile: Partial<UserProfile>): Promise<void> {
    try {
      const updated = await firstValueFrom(this.api.updateProfile(profile as Record<string, unknown>));
      this.userProfile.set(updated);
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
