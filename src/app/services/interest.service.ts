import { Injectable, signal, inject, computed } from '@angular/core';
import { ApiService } from './api.service';
import { InterestRequest, UserProfile } from '../models/user.model';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class InterestService {
  private readonly api = inject(ApiService);
  private readonly receivedInterests = signal<InterestRequest[]>([]);
  private readonly sentInterests = signal<InterestRequest[]>([]);

  readonly received = this.receivedInterests.asReadonly();
  readonly sent = this.sentInterests.asReadonly();

  readonly pendingReceived = computed(() =>
    this.receivedInterests().filter(i => i.status === 'pending'),
  );

  readonly pendingReceivedCount = computed(() => this.pendingReceived().length);

  async loadInterests(): Promise<void> {
    try {
      const [received, sent] = await Promise.allSettled([
        firstValueFrom(this.api.getReceivedInterests()),
        firstValueFrom(this.api.getSentInterests()),
      ]);
      if (received.status === 'fulfilled') {
        const list = received.value?.data ?? received.value;
        this.receivedInterests.set(Array.isArray(list) ? list : []);
      }
      if (sent.status === 'fulfilled') {
        const list = sent.value?.data ?? sent.value;
        this.sentInterests.set(Array.isArray(list) ? list : []);
      }
    } catch { /* keep empty */ }
  }

  async sendInterest(toUserId: string, message?: string): Promise<InterestRequest> {
    const res = await firstValueFrom(this.api.sendInterest(toUserId, message));
    const interest: InterestRequest = res?.data ?? {
      id: `int_${Date.now()}`,
      fromUserId: 'me',
      toUserId,
      message,
      status: 'pending',
      sentAt: new Date(),
    };
    this.sentInterests.update(list => {
      const exists = list.some(i => i.toUserId === toUserId);
      return exists ? list.map(i => i.toUserId === toUserId ? interest : i) : [...list, interest];
    });
    return interest;
  }

  async acceptInterest(interestId: string): Promise<void> {
    await firstValueFrom(this.api.acceptInterest(interestId));
    this.receivedInterests.update(list =>
      list.map(i => i.id === interestId ? { ...i, status: 'accepted' as const, respondedAt: new Date() } : i),
    );
  }

  async acceptInterestByLink(interestId: string, guid: string): Promise<{
    success: boolean;
    message: string;
    requesterName: string;
    requesterUserId: number;
  }> {
    const res = await firstValueFrom(this.api.acceptInterestByLink(interestId, guid));
    this.receivedInterests.update(list =>
      list.map(i => i.id === interestId ? { ...i, status: 'accepted' as const, respondedAt: new Date() } : i),
    );
    return res;
  }

  async declineInterest(interestId: string): Promise<void> {
    await firstValueFrom(this.api.declineInterest(interestId));
    this.receivedInterests.update(list =>
      list.map(i => i.id === interestId ? { ...i, status: 'declined' as const, respondedAt: new Date() } : i),
    );
  }

  addReceivedInterest(interest: InterestRequest): void {
    this.receivedInterests.update(list => {
      const exists = list.some(i => i.id === interest.id);
      return exists ? list : [interest, ...list];
    });
  }

  hasSentInterest(toUserId: string): boolean {
    return this.sentInterests().some(i => i.toUserId === toUserId && i.status === 'pending');
  }

  getSentStatus(toUserId: string): InterestRequest | undefined {
    return this.sentInterests().find(i => i.toUserId === toUserId);
  }

  /**
   * Generates a warm, context-aware default message for an interest request.
   *
   * @param toProfile   The recipient's profile — used for name, occupation, city.
   * @param matchPct    Overall compatibility score (0–100) from the match report, if available.
   * @param commonInterests  Shared interest tags from the match report, if available.
   */
  buildDefaultMessage(
    toProfile: UserProfile,
    matchPct?: number,
    commonInterests?: string[],
  ): string {
    const name = toProfile.firstName;

    // Rich variant — used when coming from the match report page
    if (matchPct !== undefined && matchPct > 0) {
      const sharedPart = commonInterests?.length
        ? ` We also seem to share a love for ${commonInterests.slice(0, 2).join(' and ')}, which is wonderful.`
        : '';
      return (
        `Hi ${name}! Our ${matchPct}% compatibility really caught my attention.${sharedPart} ` +
        `I'd love to connect and get to know you better. Looking forward to hearing from you!`
      );
    }

    // Standard variant — used when coming from the profile view page
    const occupation = toProfile.occupation?.title ?? '';
    const city = toProfile.location?.city ?? '';
    const contextPart = occupation && city
      ? ` As a ${occupation} based in ${city}, I think we could be a great match.`
      : '';

    return (
      `Hi ${name}! I came across your profile and was genuinely impressed.${contextPart} ` +
      `I'd love to connect and get to know you better. Looking forward to hearing from you!`
    );
  }
}
