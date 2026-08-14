import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthService } from '../../../services/auth.service';
import { ADMIN_NAV } from '../admin-nav';

/** Below this the sidebar becomes an overlay drawer. */
const HANDSET_QUERY = '(max-width: 960px)';

/**
 * Reusable admin shell: sticky header + collapsible sidebar + projected content.
 *
 * Deliberately uses content projection rather than a layout route, because the
 * admin destinations do not share a URL prefix (/match-fixed/admin and
 * /testimonials/admin sit outside /admin). Any admin page can adopt the shell by
 * wrapping its template in <app-admin-layout> without its route changing.
 */
@Component({
  selector: 'app-admin-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterModule, MatToolbarModule, MatSidenavModule, MatListModule,
    MatIconModule, MatButtonModule, MatMenuModule, MatTooltipModule, MatDividerModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss',
})
export class AdminLayoutComponent implements OnInit {
  private readonly breakpoints = inject(BreakpointObserver);
  protected readonly auth = inject(AuthService);

  protected readonly nav = ADMIN_NAV;

  protected readonly isHandset = toSignal(
    this.breakpoints.observe(HANDSET_QUERY).pipe(map(r => r.matches)),
    { initialValue: false },
  );

  /** Desktop: narrow icon rail. */
  protected readonly collapsed = signal(false);
  /** Handset: overlay drawer visibility. */
  protected readonly drawerOpen = signal(false);

  /**
   * Confirms the role against the API before the shell renders, so every page
   * using this layout is gated in one place instead of repeating the check.
   */
  async ngOnInit(): Promise<void> {
    await this.auth.loadRole();
  }

  /** One hamburger, two behaviours depending on viewport. */
  protected toggleNav(): void {
    if (this.isHandset()) this.drawerOpen.update(v => !v);
    else this.collapsed.update(v => !v);
  }

  /** Overlay drawers must close themselves after a jump. */
  protected onNavigate(): void {
    if (this.isHandset()) this.drawerOpen.set(false);
  }

  protected logout(): void {
    this.auth.logout();
  }

  protected get adminName(): string {
    const u = this.auth.user();
    return [u?.firstName, u?.lastName].filter(Boolean).join(' ') || 'Administrator';
  }

  protected get initials(): string {
    const u = this.auth.user();
    const first = u?.firstName?.[0] ?? '';
    const last = u?.lastName?.[0] ?? '';
    return (first + last).toUpperCase() || 'A';
  }
}
