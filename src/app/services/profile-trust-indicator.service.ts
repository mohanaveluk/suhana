import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { ProfileTrustIndicator } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class ProfileTrustIndicatorService {
  private readonly api = inject(ApiService);

  async get(profileId: string): Promise<ProfileTrustIndicator | null> {
    try {
      return await firstValueFrom(this.api.getProfileTrustIndicator(profileId));
    } catch {
      return null;
    }
  }
}
