import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MaterialModule } from '../../shared/modules/material.module';
import { ApiService } from '../../services/api.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-service-unavailable',
  imports: [MaterialModule],
  templateUrl: './service-unavailable.html',
  styleUrl: './service-unavailable.scss',
})
export class ServiceUnavailableComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);

  protected readonly year = new Date().getFullYear();
  protected readonly countdown = signal(30);
  protected readonly isChecking = signal(false);

  private intervalId: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.startCountdown();
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  private startCountdown(): void {
    this.clearTimer();
    this.countdown.set(30);
    this.intervalId = setInterval(() => {
      const current = this.countdown();
      if (current <= 1) {
        this.clearTimer();
        this.retryNow();
      } else {
        this.countdown.set(current - 1);
      }
    }, 1000);
  }

  private clearTimer(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  protected async retryNow(): Promise<void> {
    this.isChecking.set(true);
    this.clearTimer();
    try {
      await firstValueFrom(this.api.healthCheck());
      this.router.navigate(['/']);
    } catch {
      this.isChecking.set(false);
      this.startCountdown();
    }
  }

  protected goHome(): void { this.router.navigate(['/']); }
}
