import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MaterialModule } from '../../../../shared/modules/material.module';
import { timeAgo } from '../../../../shared/utils/relative-time.util';
import { InteractionAction, InteractionItem } from '../../models/member-interaction.model';

const STATUS_LABEL: Record<string, string> = {
  new: 'New',
  viewed: 'Viewed',
  pending: 'Awaiting reply',
  accepted: 'Accepted',
  declined: 'Declined',
  withdrawn: 'Withdrawn',
};

const HOROSCOPE_LABEL: Record<string, string> = {
  excellent: 'Excellent match',
  good: 'Good match',
  moderate: 'Moderate match',
  low: 'Low compatibility',
};

/** One person in My Interests: who, what happened, status, compatibility and the valid actions. */
@Component({
  selector: 'app-interest-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, MaterialModule],
  templateUrl: './interest-card.component.html',
  styleUrl: './interest-card.component.scss',
})
export class InterestCardComponent {
  readonly item = input.required<InteractionItem>();
  readonly busy = input(false);
  /** Emitted for actions the page must confirm or perform (accept, decline, block…). */
  readonly action = output<InteractionAction>();
  /** Emitted when the member opens a new interest (marks it "Viewed"). */
  readonly opened = output<void>();

  protected readonly showMessage = signal(false);
  protected readonly timeAgo = timeAgo;

  protected readonly p = computed(() => this.item().partner);
  protected readonly c = computed(() => this.item().compatibility);
  protected readonly can = computed(() => new Set(this.item().actions));
  protected readonly isNew = computed(() => this.item().status === 'new' || (this.item().unreadCount ?? 0) > 0);
  protected readonly statusLabel = computed(() => (this.item().status ? STATUS_LABEL[this.item().status!] : null));
  protected readonly location = computed(() => [this.p().city, this.p().state, this.p().country].filter(Boolean).join(', '));
  protected readonly initial = computed(() => this.p().name.charAt(0).toUpperCase());

  protected readonly typeLabel = computed(() => {
    const i = this.item();
    switch (i.type) {
      case 'INTEREST': return i.direction === 'received' ? 'Interested in you' : 'You expressed interest';
      case 'PROFILE_VIEW': return (i.visitCount ?? 1) > 1 ? `Viewed your profile ${i.visitCount} times` : 'Viewed your profile';
      case 'MESSAGE': return (i.unreadCount ?? 0) > 0 ? `Sent you ${i.unreadCount} new message${i.unreadCount === 1 ? '' : 's'}` : 'Sent you a message';
    }
  });

  protected readonly typeIcon = computed(() =>
    ({ INTEREST: 'favorite', PROFILE_VIEW: 'visibility', MESSAGE: 'chat_bubble' } as const)[this.item().type]);

  protected readonly horoscopeText = computed(() => {
    const h = this.c().horoscope;
    if (h.status === 'not_available') return 'Birth details missing';
    if (h.status === 'not_analyzed') return 'Not yet analysed';
    const score = h.totalScore != null ? `${h.totalScore}/${h.maxScore ?? 36}` : '';
    const label = h.bucket ? HOROSCOPE_LABEL[h.bucket] : h.category ?? '';
    return [score, label].filter(Boolean).join(' · ') || 'Analysed';
  });

  protected toggleMessage(): void {
    this.showMessage.update(v => !v);
    this.opened.emit();
  }

  protected emit(action: InteractionAction): void {
    if (action === 'accept' || action === 'decline') this.opened.emit();
    this.action.emit(action);
  }
}
