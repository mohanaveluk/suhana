import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { UserProfile } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('suhana_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    });
  }

  // Auth
  register(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    gender: string;
    mobile: string;
    created_at: string;
    updated_at: string | null;
    role_guid: string;
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/v1/auth/register`, data);
  }

  login(data: { email: string; password: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/v1/auth/login`, data);
  }

  sendVerificationEmail(email: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/v1/auth/resend-verification`, { email });
  }

  passwordResetRequest(email: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/v1/auth/forgot-password`, { email });
  }

  verifyResetCode(email: string, code: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/v1/auth/verify-reset-code`, { email, code });
  }

  updatePassword(data: { email: string; resetToken: string; password: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/v1/auth/update-password`, data);
  }

  loginAsRole(role: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/v1/auth/demo/${role}`, {});
  }

  verifyEmail(userGuid: string, verificationCode: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/v1/auth/verify-email`, { userGuid: userGuid, code: verificationCode });
  }

  resendVerificationMail(userGuid: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/v1/auth/resend-verification`, { userGuid });
  }
  
  // Profiles
  getProfiles(params?: Record<string, string | number>): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/profiles`, { params: params as any });
  }

  getMyProfile(): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/profiles/me`, { headers: this.getHeaders() });
  }

  getProfileById(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/profiles/${id}`);
  }

  updateNewProfile(data: UserProfile): Observable<any> {
    return this.http.patch(`${this.baseUrl}/v1/profiles/new`, data, { headers: this.getHeaders() });
  }

  updateProfile(data: Record<string, unknown>): Observable<any> {
    return this.http.patch(`${this.baseUrl}/v1/profiles/me`, data, { headers: this.getHeaders() });
  }

  uploadPhoto(file: File): Observable<any> {
    const token = localStorage.getItem('suhana_token');
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post(`${this.baseUrl}/v1/profiles/profile/image`, formData, { headers });
  }

  addPhoto(url: string, isPrimary = false): Observable<any> {
    return this.http.post(`${this.baseUrl}/v1/profiles/me/photos`, { url, isPrimary }, { headers: this.getHeaders() });
  }

  deletePhoto(photoId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/v1/profiles/me/photos/${photoId}`, { headers: this.getHeaders() });
  }

  // Matches
  generateMatches(count = 4): Observable<any> {
    return this.http.post(`${this.baseUrl}/v1/matches/generate`, { count }, { headers: this.getHeaders() });
  }

  getMatches(): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/matches`, { headers: this.getHeaders() });
  }

  getMatchById(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/matches/${id}`, { headers: this.getHeaders() });
  }

  updateMatchStatus(id: string, status: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/v1/matches/${id}/status`, { status }, { headers: this.getHeaders() });
  }

  // Shortlist
  getShortlisted(): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/shortlist`, { headers: this.getHeaders() });
  }

  getInterested(): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/shortlist/interested`, { headers: this.getHeaders() });
  }

  getConnected(): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/shortlist/connected`, { headers: this.getHeaders() });
  }

  shortlist(matchId: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/shortlist/${matchId}/shortlist`, {}, { headers: this.getHeaders() });
  }

  expressInterest(matchId: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/v1/shortlist/${matchId}/interest`, {}, { headers: this.getHeaders() });
  }

  connectMatch(matchId: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/v1/shortlist/${matchId}/connect`, {}, { headers: this.getHeaders() });
  }

  skipMatch(matchId: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/v1/shortlist/${matchId}/skip`, {}, { headers: this.getHeaders() });
  }

  reconsiderMatch(matchId: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/v1/shortlist/${matchId}/reconsider`, {}, { headers: this.getHeaders() });
  }

  // Chat
  getConversations(): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/chat/conversations`, { headers: this.getHeaders() });
  }

  getMessages(conversationId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/chat/conversations/${conversationId}/messages`, { headers: this.getHeaders() });
  }

  startConversation(receiverId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/v1/chat/conversations`, { receiverId }, { headers: this.getHeaders() });
  }

  sendMessage(conversationId: string, content: string, type = 'text'): Observable<any> {
    return this.http.post(`${this.baseUrl}/v1/chat/conversations/${conversationId}/messages`, { content, type }, { headers: this.getHeaders() });
  }

  markAsRead(conversationId: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/v1/chat/conversations/${conversationId}/read`, {}, { headers: this.getHeaders() });
  }

  getIcebreakers(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/v1/chat/icebreakers`, { headers: this.getHeaders() });
  }

  // Premium
  getPlans(): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/premium/plans`);
  }

  subscribePlan(planId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/v1/premium/subscribe/${planId}`, {}, { headers: this.getHeaders() });
  }

  // Admin
  getAdminStats(): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/admin/stats`, { headers: this.getHeaders() });
  }

  getAdminUsers(): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/admin/users`, { headers: this.getHeaders() });
  }

  updateUserStatus(userId: string, status: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/v1/admin/users/${userId}/status`, { status }, { headers: this.getHeaders() });
  }

  getMatchAnalytics(): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/admin/analytics/matches`, { headers: this.getHeaders() });
  }

  getRegistrationTrends(): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/admin/analytics/registrations`, { headers: this.getHeaders() });
  }

  getMatchWeights(): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/admin/match-weights`, { headers: this.getHeaders() });
  }

  updateMatchWeights(weights: Record<string, number>): Observable<any> {
    return this.http.patch(`${this.baseUrl}/v1/admin/match-weights`, weights, { headers: this.getHeaders() });
  }

  // Users
  getAllUsers(): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/users`, { headers: this.getHeaders() });
  }

  getUserById(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/users/${id}`, { headers: this.getHeaders() });
  }

  deleteUser(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/v1/users/${id}`, { headers: this.getHeaders() });
  }
}
