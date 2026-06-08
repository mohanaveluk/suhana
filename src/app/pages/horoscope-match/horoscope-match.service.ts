import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { HoroscopeMatchResponse } from './horoscope-match.model';

@Injectable({ providedIn: 'root' })
export class HoroscopeMatchService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  /**
   * Fetches the AI-generated horoscope compatibility report for a matched user.
   * Calls GET /v1/matches/userx/:matchUserId
   * @param matchUserId The userId of the profile to compare against
   */
  getHoroscopeMatch(matchUserId: string): Observable<HoroscopeMatchResponse> {
    return this.http.get<HoroscopeMatchResponse>(
      `${this.baseUrl}/v1/matches/userx/${matchUserId}`
    );
  }
}
