import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { MaterialModule } from '../../shared/modules/material.module';
import { PremiumPlan } from '../../models/user.model';
import { ApiService, AuthService } from '../../services';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-premium',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialModule],
  templateUrl: './premium.html',
  styleUrl: './premium.scss',
})
export class PremiumComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  protected readonly plans = signal<PremiumPlan[]>([
    {
      id: 'free', name: 'Free', tier: 'free', price: 0, duration: 'Forever',
      isPopular: false,
      features: [
        'Create profile', 'Browse limited profiles', 'View 2 matches/day',
        'Basic search filters', 'Email support',
      ],
    },
    {
      id: 'silver', name: 'Silver', tier: 'silver', price: 999, duration: '3 months',
      isPopular: false,
      features: [
        'All Free features', 'View 10 matches/day', 'Advanced search filters',
        'See who viewed your profile', 'Send 5 interests/day', 'Chat unlock on mutual interest',
      ],
    },
    {
      id: 'gold', name: 'Gold', tier: 'gold', price: 2499, duration: '6 months',
      isPopular: true,
      features: [
        'All Silver features', 'Unlimited matches', 'Priority connection requests',
        'Boost profile visibility', 'Top Match Picks weekly', 'Video introductions',
        'Horoscope matching', 'Chat with icebreakers',
      ],
    },
    {
      id: 'platinum', name: 'Platinum', tier: 'platinum', price: 4999, duration: '12 months',
      isPopular: false,
      features: [
        'All Gold features', 'Dedicated relationship advisor', 'Profile verification badge',
        'Premium customer support', 'Exclusive matchmaking events', 'Re-match suggestions',
        'Daily match digest', 'Advanced AI insights',
      ],
    },
  ]);

  protected readonly selectedPlan = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      const apiPlans = await firstValueFrom(this.api.getPlans());
      if (Array.isArray(apiPlans) && apiPlans.length > 0) {
        this.plans.set(apiPlans);
      }
    } catch { /* use default plans */ }
  }

  selectPlan(planId: string): void {
    this.selectedPlan.set(planId);
  }

  async subscribe(planId: string): Promise<void> {
    try {
      await firstValueFrom(this.api.subscribePlan(planId));
      this.auth.updateMembership(planId === 'gold' ? 'gold' : planId === 'platinum' ? 'platinum' : planId === 'silver' ? 'silver' : 'free');
      this.selectedPlan.set(planId);
    } catch { /* handle error */ }
  }
}
