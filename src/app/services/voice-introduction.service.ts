import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class VoiceIntroductionService {
  private readonly api = inject(ApiService);

  async upload(file: File): Promise<any> {
    const res = await firstValueFrom(this.api.uploadVoiceIntroduction(file));
    return res?.data?.audioUrl;
  }
}
