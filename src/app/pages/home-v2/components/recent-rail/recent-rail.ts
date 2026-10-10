import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MaterialModule } from '../../../../shared/modules/material.module';
import { ProfileVisit } from '../../../../models/profile-visit.model';
import { ProfileVisitService } from '../../../../services';
import { timeAgo } from '../../../../shared/utils/relative-time.util';
import { prefersReducedMotion, useFallbackImage } from '../../utils/motion.util';

/**
 * "Your Recent Connections" rail. The host decides whether to mount it (signed-in members only)
 * and triggers the fetch via ProfileVisitService, exactly as the existing Recently Visited component does.
 */
@Component({
  selector: 'app-recent-rail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialModule, RouterLink],
  templateUrl: './recent-rail.html',
  styleUrl: './recent-rail.scss',
})
export class RecentRailComponent {
  private readonly visits = inject(ProfileVisitService);
  private readonly router = inject(Router);
  private readonly track = viewChild<ElementRef<HTMLElement>>('track');

  protected readonly profiles = this.visits.profiles;
  protected readonly loading  = this.visits.loading;
  protected readonly error    = this.visits.error;
  protected readonly isEmpty  = computed(() => !this.loading() && !this.error() && this.profiles().length === 0);
  protected readonly skeletons = [0, 1, 2, 3];

  protected readonly timeAgo = timeAgo;
  protected readonly onImgError = useFallbackImage;

  readonly reload = (): Promise<unknown> => this.visits.getRecentProfiles(1, 20);

  protected open(v: ProfileVisit): void {
    // Same destination as the existing Recently Visited component: /profile-view takes the profile id.
    void this.router.navigate(['/profile-view', v.profileId]);
  }

  protected scroll(dir: 1 | -1): void {
    const el = this.track()?.nativeElement;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }

  protected place(v: ProfileVisit): string {
    return [v.city, v.state].filter(Boolean).join(', ');
  }
}
