import { Injectable, signal, computed, inject } from '@angular/core';
import { User, UserRole, MembershipTier } from '../models/user.model';
import { ApiService } from './api.service';
import { firstValueFrom, Observable } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly currentUser = signal<User | null>(null);
  private readonly isAuthenticated = signal(false);

  readonly user = this.currentUser.asReadonly();
  readonly authenticated = this.isAuthenticated.asReadonly();
  readonly userRole = computed<UserRole>(() => this.currentUser()?.role ?? 'guest');
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
      } catch { /* ignore */ }
    }
  }

  async login(email: string, password: string): Promise<void> {
    const res = await firstValueFrom(this.api.login({ email, password }));
    if (res?.data?.user) {
      this.setSession(res.data);
    }
  }

  async sendVerificationEmail(email: string): Promise<void> {
    await firstValueFrom(this.api.sendVerificationEmail(email));
  }

  async register(data: { email: string; password: string; gender: string; mobile: string; firstName?: string; lastName?: string }): Promise<string> {
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
      this.setSession(res.data);
    }
    return res?.data?.userId ?? res?.data?.user?.id ?? res?.user?.id ?? '';
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
    }
  }

  logout(): void {
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
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
      lastActive: new Date(),
      isVerified: u['is_verified'] as boolean,
      createdAt: u['created_at'] ? new Date(u['created_at'] as string) : new Date(),
    };
    localStorage.setItem('suhana_user', JSON.stringify(user));
    this.currentUser.set(user);
    this.isAuthenticated.set(true);
  }
}
