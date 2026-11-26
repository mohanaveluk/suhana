import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MaterialModule } from '../../../../shared/modules/material.module';
import { AuthService } from '../../../../services/auth.service';

/** Chrome for signed-in provider pages ("Aurora for Business"). Projects the page content. */
@Component({
  selector: 'app-provider-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialModule, RouterLink, RouterLinkActive],
  template: `
    <div class="ps">
      <header class="ps__bar">
        <div class="ps__inner">
          <a class="ps__brand" routerLink="/providers/dashboard">
            <span class="ps__logo" aria-hidden="true"><mat-icon>storefront</mat-icon></span>
            <span>Aurora <strong>for Business</strong></span>
          </a>
          <nav class="ps__nav" aria-label="Provider navigation">
            <a routerLink="/providers/dashboard" routerLinkActive="ps__on" [routerLinkActiveOptions]="{ exact: true }">
              <mat-icon aria-hidden="true">dashboard</mat-icon><span>Dashboard</span>
            </a>
            <a routerLink="/providers/claim" routerLinkActive="ps__on">
              <mat-icon aria-hidden="true">how_to_reg</mat-icon><span>Claim a listing</span>
            </a>
            <a routerLink="/discover">
              <mat-icon aria-hidden="true">explore</mat-icon><span>View Discover</span>
            </a>
          </nav>
          <button mat-button type="button" class="ps__account" [matMenuTriggerFor]="menu" [attr.aria-label]="'Account: ' + email()">
            <mat-icon>account_circle</mat-icon><span class="ps__email">{{ email() }}</span>
          </button>
          <mat-menu #menu="matMenu">
            <button mat-menu-item type="button" (click)="auth.logout()"><mat-icon>logout</mat-icon> Sign out</button>
          </mat-menu>
        </div>
      </header>
      <main class="ps__main" [class.ps__main--wide]="wide()">
        <ng-content />
      </main>
    </div>
  `,
  styles: [`
    :host { display: block; min-height: 100%; background: var(--suhana-ivory-warm); }
    .ps__bar {
      position: sticky; top: 0; z-index: 5;
      background: linear-gradient(120deg, var(--suhana-maroon-dark), var(--suhana-maroon) 55%, #a0485a);
      color: #fff; box-shadow: 0 4px 14px rgba(61, 44, 46, .18);
    }
    .ps__inner { max-width: 1200px; margin: 0 auto; padding: 8px 16px; display: flex; align-items: center; gap: 16px; }
    .ps__brand {
      display: inline-flex; align-items: center; gap: 10px; color: #fff; text-decoration: none; font-size: 17px; white-space: nowrap;
      strong { color: var(--suhana-gold-light); font-weight: 600; }
    }
    .ps__logo {
      display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px;
      background: var(--suhana-gold-gradient);
      mat-icon { font-size: 20px; width: 20px; height: 20px; }
    }
    .ps__nav {
      display: flex; gap: 4px; flex: 1; overflow-x: auto;
      a {
        display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 10px;
        color: rgba(255, 255, 255, .88); text-decoration: none; font-size: 14px; white-space: nowrap;
        transition: background .2s ease, color .2s ease;
        mat-icon { font-size: 18px; width: 18px; height: 18px; }
        &:hover, &:focus-visible { background: rgba(255, 255, 255, .14); color: #fff; }
      }
      .ps__on { background: rgba(255, 255, 255, .2); color: #fff; font-weight: 600; }
    }
    .ps__account { color: #fff !important; }
    .ps__email { max-width: 200px; overflow: hidden; text-overflow: ellipsis; }
    .ps__main { max-width: 1100px; margin: 0 auto; padding: 24px 16px 56px; }
    .ps__main--wide { max-width: 1200px; }
    @media (max-width: 720px) {
      .ps__inner { flex-wrap: wrap; }
      .ps__nav { order: 3; flex-basis: 100%; span { display: none; } a { padding: 8px 10px; } }
      .ps__email { display: none; }
    }
  `],
})
export class ProviderShellComponent {
  protected readonly auth = inject(AuthService);
  readonly wide = input(false);
  protected readonly email = computed(() => this.auth.user()?.email ?? '');
}
