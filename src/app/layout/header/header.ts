import {
  Component, ChangeDetectionStrategy, ElementRef, ViewChild, AfterViewInit, OnDestroy,
  inject, signal, computed, effect,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { MaterialModule } from '../../shared/modules/material.module';
import { AuthService } from '../../services';
import { ProfileService } from '../../services/profile.service';
import { EmailHistoryService } from '../../pages/notifications/notification.service';

@Component({
  selector: 'app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, MaterialModule],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class HeaderComponent implements AfterViewInit, OnDestroy {
  protected readonly auth               = inject(AuthService);
  protected readonly emailHistoryService = inject(EmailHistoryService);
  private   readonly profileSvc         = inject(ProfileService);
  private   readonly router             = inject(Router);
  protected readonly mobileMenuOpen     = signal(false);
  protected readonly avatarError        = signal(false);

  // ── Liquid-glass nav highlight ──────────────────────────────────────────────
  // A single frosted pill glides between links instead of each one styling its
  // own static hover/active background — position/size are measured off the
  // actual DOM element so it always lines up regardless of label length.
  @ViewChild('desktopNav') private readonly navRef?: ElementRef<HTMLElement>;

  protected readonly glowLeft    = signal(0);
  protected readonly glowWidth   = signal(0);
  protected readonly glowVisible = signal(false);

  private navigationSub?: Subscription;

  protected readonly displayName = computed(() => {
    const u = this.auth.user();
    if (!u) return '';
    const full = [u.firstName, u.lastName].filter(Boolean).join(' ');
    return full || u.email;
  });

  /** Primary profile photo URL for the current user, or null if none/failed. */
  protected readonly profilePhoto = computed<string | null>(() => {
    const photos = this.profileSvc.myProfile()?.photos ?? [];
    if (!photos.length) return null;
    return (photos.find(p => p.isPrimary) ?? photos[0]).url ?? null;
  });

  constructor() {
    // Load the current user's profile (for the avatar) once authenticated.
    effect(() => {
      if (this.auth.authenticated() && !this.profileSvc.myProfile()) {
        void this.profileSvc.loadMyProfile();
      }
    });
  }

  ngAfterViewInit(): void {
    // Deferred a tick so routerLinkActive has already applied .active-link.
    queueMicrotask(() => this.syncGlowToActiveLink());
    this.navigationSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => queueMicrotask(() => this.syncGlowToActiveLink()));
  }

  ngOnDestroy(): void {
    this.navigationSub?.unsubscribe();
  }

  /** Glides the glow to whichever link the pointer/keyboard focus is on. */
  protected onNavLinkHover(event: Event): void {
    this.moveGlowTo(event.currentTarget as HTMLElement);
  }

  /** Pointer/focus left the nav entirely — settle the glow back under the active route. */
  protected onNavLeave(): void {
    this.syncGlowToActiveLink();
  }

  private syncGlowToActiveLink(): void {
    const active = this.navRef?.nativeElement.querySelector<HTMLElement>('a.active-link');
    if (active) {
      this.moveGlowTo(active);
    } else {
      this.glowVisible.set(false);
    }
  }

  private moveGlowTo(link: HTMLElement): void {
    this.glowLeft.set(link.offsetLeft);
    this.glowWidth.set(link.offsetWidth);
    this.glowVisible.set(true);
  }

  protected onAvatarError(): void {
    this.avatarError.set(true);
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update(v => !v);
  }

  logout(): void {
    this.auth.logout();
    this.mobileMenuOpen.set(false);
  }

  openNotifications(): void {
    this.router.navigate(['/notifications']);
  }
}
