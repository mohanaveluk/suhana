import { Injectable, OnDestroy, inject, effect } from '@angular/core';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';

const INTERVAL_MS = 2.5 * 60 * 1000; // 2.5 minutes

@Injectable({ providedIn: 'root' })
export class HeartbeatService implements OnDestroy {
  private readonly api  = inject(ApiService);
  private readonly auth = inject(AuthService);

  private intervalId: ReturnType<typeof setInterval> | null = null;

  // Stored reference so removeEventListener can match it exactly
  private readonly onVisibilityChange = (): void => {
    if (document.visibilityState === 'hidden') {
      this.stopInterval();
    } else if (this.auth.user()) {
      // Tab came back into focus — ping immediately and restart timer
      this.startInterval();
    }
  };

  constructor() {
    // Start/stop automatically whenever the auth state changes
    effect(() => {
      if (this.auth.user()) {
        this.startInterval();
      } else {
        this.stopInterval();
      }
    });

    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  ngOnDestroy(): void {
    this.stopInterval();
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }

  private startInterval(): void {
    if (this.intervalId !== null) return; // already running
    this.ping();                          // immediate ping on start/resume
    this.intervalId = setInterval(() => this.ping(), INTERVAL_MS);
  }

  private stopInterval(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private ping(): void {
    if (!this.auth.user()) return;
    // Fire-and-forget — backend errors (network, 401) are silently ignored
    //this.api.heartbeat().subscribe({ error: () => {} });
  }
}
