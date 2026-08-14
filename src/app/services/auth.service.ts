import { Injectable, signal, computed, inject } from '@angular/core';
import { User, UserRole, MembershipTier } from '../models/user.model';
import { ApiService } from './api.service';
import { firstValueFrom, Observable } from 'rxjs';
import { Router } from '@angular/router';
import { decryptValue } from '../shared/utils/crypto.util';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly currentUser = signal<User | null>(null);
  public readonly isAuthenticated = signal(false);

  /** Authoritative role from GET /role. Null until the call resolves. */
  private readonly fetchedRole = signal<UserRole | null>(null);
  private readonly roleResolved = signal(false);
  /** Shared in-flight request so concurrent callers issue one API call. */
  private roleRequest: Promise<UserRole> | null = null;

  readonly user = this.currentUser.asReadonly();
  readonly authenticated = this.isAuthenticated.asReadonly();

  /**
   * Real-time role from the API, falling back to the cached session role until
   * that resolves so the first paint is not wrong.
   *
   * Must stay synchronous: templates read this directly, and a computed wrapping
   * an async call yields a Promise, which is always truthy — every signed-in user
   * would pass the check. Call loadRole() to refresh it.
   */
  readonly userRole = computed<UserRole>(() =>
    this.fetchedRole() ?? this.currentUser()?.role ?? 'guest');

  /** False until the role has been fetched at least once this session. */
  readonly roleLoaded = this.roleResolved.asReadonly();

  readonly isAdmin = computed(() => this.userRole() === 'admin');
  readonly isTester = computed(() => this.userRole() === 'tester');
  readonly isPremium = computed(() => {
    const tier = this.currentUser()?.membership;
    return tier === 'gold' || tier === 'platinum';
  });

  constructor() {
    const stored = localStorage.getItem('suhana_user');
    if (stored) {
      try {
        const user = JSON.parse(stored) as User;
        this.currentUser.set(user);
        this.isAuthenticated.set(true);
        // Confirm the cached role against the API on boot.
        void this.loadRole();
      } catch { /* ignore */ }
    }
  }

  async login(email: string, password: string): Promise<void> {
    const res = await firstValueFrom(this.api.login({ email, password }));
    if (res?.data?.user) {
      this.setSession(res.data);
    }
  }

  /** Passwordless login — request a one-time code be emailed to the user. */
  async sendLoginOtc(email: string): Promise<any> {
    const res = await firstValueFrom(this.api.sendLoginOtc(email));
    return res.data ?? res;
  }

  /** Passwordless login — validate email + one-time code and establish the session. */
  async loginWithOtc(email: string, code: string): Promise<void> {
    const res = await firstValueFrom(this.api.validateLoginOtc(email, code));
    if (res?.data?.user) {
      this.setSession(res.data);
    }
  }

  async sendVerificationEmail(email: string): Promise<void> {
    await firstValueFrom(this.api.sendVerificationEmail(email));
  }

  async register(data: { email: string; password: string; gender: string; mobile: string; firstName?: string; lastName?: string }): Promise<{ userId: string; tempGuid: string }> {
    const payload = {
      firstName: data.firstName ?? 'unknown',
      lastName: data.lastName ?? 'unknown',
      email: data.email,
      password: data.password,
      gender: data.gender,
      mobile: data.mobile,
      created_at: new Date().toISOString(),
      updated_at: null,
      role_guid: '',
    };
    const res = await firstValueFrom(this.api.register(payload));
    if (res?.data?.access_token) {
      //this.setSession(res.data);
    }
    const userId =  res?.data?.userId ?? res?.data?.user?.id ?? res?.user?.id ?? '';
    const tempGuid =  res?.data?.temp_guid ?? res?.data?.user?.temp_guid ?? res?.user?.temp_guid ?? '';
    return { userId, tempGuid };
  }

  async loginAsRole(role: UserRole): Promise<void> {
    try {
      const res = await firstValueFrom(this.api.loginAsRole(role));
      this.setSession(res);
    } catch {
      const demoUser: User = {
        id: `demo_${role}`, email: `${role}@suhana.com`, role,
        gender: 'bride', membership: role === 'admin' ? 'platinum' : 'free',
        createdAt: new Date(), lastActive: new Date(), isVerified: true,
      };
      this.currentUser.set(demoUser);
      this.isAuthenticated.set(true);
      // Demo sessions bypass the API, so publish the role directly.
      this.fetchedRole.set(role);
      this.roleResolved.set(true);
    }
  }

  logout(): void {
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    this.fetchedRole.set(null);
    this.roleResolved.set(false);
    this.roleRequest = null;
    localStorage.removeItem('suhana_token');
    localStorage.removeItem('suhana_user');
    localStorage.removeItem('refresh_token');
    this.router.navigate(['/']);
  }

  updateMembership(tier: MembershipTier): void {
    this.patchUser({ membership: tier });
  }

  patchUser(partial: Partial<User>): void {
    const user = this.currentUser();
    if (!user) return;
    const updated = { ...user, ...partial };
    this.currentUser.set(updated);
    localStorage.setItem('suhana_user', JSON.stringify(updated));
  }

  async requestPasswordReset(email: string): Promise<void> {
    await firstValueFrom(this.api.passwordResetRequest(email));
  }

  async verifyPasswordResetCode(email: string, code: string): Promise<any> {
    return firstValueFrom(this.api.verifyResetCode(email, code));
  }

  async updatePassword(data: { email: string; resetToken: string; password: string }): Promise<void> {
    await firstValueFrom(this.api.updatePassword(data));
  }

  async updatePasswordLegacy(data: { currentPassword: string; newPassword: string }): Promise<void> {
    await firstValueFrom(this.api.updatePasswordLegacy(data));
  }

  verifyEmail(userGuid: string, verificationCode: string): Observable<any> {
    return this.api.verifyEmail(userGuid, verificationCode);
  }

  resendVerificationMail(userGuid: string): Observable<any> {
    return this.api.resendVerificationMail(userGuid);
  }

  async getRole(): Promise<string | null> {
    try {
      const res = await firstValueFrom(this.api.getRole());

      let role = res || res?.role;
      role.name = decryptValue(role.name);
      return role?.name ?? null;
    }
    catch {
      return null;
    }
  }

  // check to see the role name is admin
  async isUserAdmin(): Promise<boolean> {
    const role = await this.getRole();
    return role === 'admin';
  }

  /**
   * Fetches the role from the API and publishes it to `userRole`.
   *
   * Concurrent callers share one request. A failed or unrecognised response
   * leaves the cached role in place rather than demoting the user — a flaky
   * endpoint must not silently lock an admin out of their own screens.
   */
  async loadRole(force = false): Promise<UserRole> {
    if (!this.isAuthenticated()) {
      this.fetchedRole.set(null);
      this.roleResolved.set(true);
      return 'guest';
    }

    if (!force && this.roleRequest) return this.roleRequest;

    this.roleRequest = this.getRole()
      .then(name => {
        const role = this.toUserRole(name);
        if (!role) return this.userRole();

        this.fetchedRole.set(role);
        // Keep the cached session in step so the next reload starts correct.
        if (this.currentUser() && this.currentUser()!.role !== role) {
          this.patchUser({ role });
        }
        return role;
      })
      .catch(() => this.userRole())
      .finally(() => {
        this.roleResolved.set(true);
        this.roleRequest = null;
      });

    return this.roleRequest;
  }

  private toUserRole(name: string | null | undefined): UserRole | null {
    switch ((name ?? '').trim().toLowerCase()) {
      case 'admin':      return 'admin';
      case 'tester':     return 'tester';
      case 'registered': return 'registered';
      case 'guest':      return 'guest';
      default:           return null;
    }
  }

  private setSession(res: { access_token: string; refresh_token: string; user: Record<string, unknown> }): void {
    localStorage.setItem('suhana_token', res.access_token);
    localStorage.setItem('refresh_token', res.refresh_token);
    const u = res.user;
    const user: User = {
      id: u['id'] as string, 
      email: u['email'] as string,
      firstName: u['firstName'] as string,
      lastName: u['lastName'] as string,
      role: u['role'] as UserRole, 
      gender: u['gender'] as 'bride' | 'groom',
      membership: u['membership'] as MembershipTier,
      mobile: u['mobile'] as string | undefined,
      lastActive: new Date(),
      isVerified: u['is_verified'] as boolean,
      is_email_verified: u['is_email_verified'] as boolean,
      createdAt: u['created_at'] ? new Date(u['created_at'] as string) : new Date(),
    };
    localStorage.setItem('suhana_user', JSON.stringify(user));
    this.currentUser.set(user);
    this.isAuthenticated.set(true);
    // A fresh session must not inherit the previous user's role.
    this.fetchedRole.set(null);
    this.roleResolved.set(false);
    this.roleRequest = null;
    void this.loadRole(true);
  }
}
