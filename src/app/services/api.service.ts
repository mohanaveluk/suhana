import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { UserProfile, RefreshTokenResponse } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  healthCheck(): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/health`, { responseType: 'text' as const });
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

  updatePasswordLegacy(data: { currentPassword: string; newPassword: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/v1/auth/update-password-legacy`, data);
  }

  loginAsRole(role: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/v1/auth/demo/${role}`, {});
  }

  verifyEmail(userGuid: string, verificationCode: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/v1/auth/verify-email`, { userGuid, code: verificationCode });
  }

  resendVerificationMail(userGuid: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/v1/auth/resend-verification`, { userGuid });
  }

  // Token
  refreshToken(refreshToken: string): Observable<RefreshTokenResponse> {
    return this.http.post<RefreshTokenResponse>(`${this.baseUrl}/v1/token/refresh`, { refreshToken });
  }

  // Profiles
  getProfiles(params?: Record<string, string | number>): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/profiles`, { params: params as any });
  }

  getMyProfile(): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/profiles/me`);
  }

  getProfileByEmail(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/profiles/email/${id}`);
  }
  
  getProfileById(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/profiles/${id}`);
  }

  
  getProfileByCode(code: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/profiles/code/${code}`);
  }

  updateNewProfile(data: Record<string, unknown>): Observable<any> {
    return this.http.patch(`${this.baseUrl}/v1/profiles/new`, data);
  }

  updateProfile(data: Record<string, unknown>): Observable<any> {
    return this.http.patch(`${this.baseUrl}/v1/profiles/me`, data);
  }

  uploadPhoto(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post(`${this.baseUrl}/v1/profiles/profile/image`, formData);
  }

  uploadAdmxPhoto(id: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post(`${this.baseUrl}/v1/profiles/profile/admx/image/${id}`, formData);
  }

  uploadHoroscopeDoc(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post(`${this.baseUrl}/v1/profiles/horoscope/document`, formData);
  }

  uploadHoroscopeDocAdmx(id: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post(`${this.baseUrl}/v1/profiles/horoscope/admx/document/${id}`, formData);
  }

  addPhoto(url: string, isPrimary = false): Observable<any> {
    return this.http.post(`${this.baseUrl}/v1/profiles/me/photos`, { url, isPrimary });
  }

  deletePhoto(photoId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/v1/profiles/me/photos/${photoId}`);
  }

  // Matches
  generateMatches(count = 4, profileId?: string): Observable<any> {
    const body: Record<string, unknown> = { count };
    if (profileId) body['profileId'] = profileId;
    return this.http.post(`${this.baseUrl}/v1/matches/generate`, body);
  }

  getMatches(): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/matches`);
  }

  getMatchByUserId(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/matches/user/${id}`);
  }
  
  getMatchById(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/matches/${id}`);
  }

  updateMatchStatus(id: string, status: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/v1/matches/${id}/status`, { status });
  }

  // Shortlist
  getShortlisted(): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/shortlist`);
  }

  getInterested(): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/shortlist/interested`);
  }

  getConnected(): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/shortlist/connected`);
  }

  shortlist(matchId: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/v1/shortlist/${matchId}/shortlist`, {});
  }

  /** Shortlist by user ID (used from profile/search pages where matchId is unavailable). */
  shortlistUser(userId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/v1/shortlist/user/${userId}`, {});
  }

  removeShortlistUser(userId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/v1/shortlist/user/${userId}`);
  }

  expressInterest(matchId: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/v1/shortlist/${matchId}/interest`, {});
  }

  connectMatch(matchId: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/v1/shortlist/${matchId}/connect`, {});
  }

  skipMatch(matchId: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/v1/shortlist/${matchId}/skip`, {});
  }

  reconsiderMatch(matchId: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/v1/shortlist/${matchId}/reconsider`, {});
  }

  // Chat
  getConversations(): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/chat/conversations`);
  }

  getMessages(conversationId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/chat/conversations/${conversationId}/messages`);
  }

  startConversation(receiverId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/v1/chat/conversations`, { receiverId });
  }

  sendMessage(conversationId: string, content: string, type = 'text'): Observable<any> {
    return this.http.post(`${this.baseUrl}/v1/chat/conversations/${conversationId}/messages`, { content, type });
  }

  markAsRead(conversationId: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/v1/chat/conversations/${conversationId}/read`, {});
  }

  getIcebreakers(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/v1/chat/icebreakers`);
  }

  sendAttachment(conversationId: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post(`${this.baseUrl}/v1/chat/conversations/${conversationId}/attachments`, formData);
  }

  sendTypingIndicator(conversationId: string, isTyping: boolean): Observable<any> {
    return this.http.post(`${this.baseUrl}/v1/chat/conversations/${conversationId}/typing`, { isTyping });
  }

  getTypingStatus(conversationId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/chat/conversations/${conversationId}/typing`);
  }

  deleteMessage(conversationId: string, messageId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/v1/chat/conversations/${conversationId}/messages/${messageId}`);
  }

  // Interests
  getReceivedInterests(): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/interests/received`);
  }

  getSentInterests(): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/interests/sent`);
  }

  sendInterest(toUserId: string, message?: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/v1/interests/send`, { toUserId, message });
  }

  acceptInterest(interestId: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/v1/interests/${interestId}/accept`, {});
  }

  acceptInterestByLink(interestId: string, guid: string): Observable<{
    success: boolean;
    message: string;
    requesterName: string;
    requesterUserId: number;
  }> {
    return this.http.patch<any>(`${this.baseUrl}/v1/interests/${interestId}/accept/${guid}`, {});
  }

  declineInterest(interestId: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/v1/interests/${interestId}/decline`, {});
  }

  // Calls (premium)
  initiateCall(conversationId: string, type: 'audio' | 'video'): Observable<any> {
    return this.http.post(`${this.baseUrl}/v1/calls/initiate`, { conversationId, type });
  }

  getCallHistory(conversationId?: string): Observable<any> {
    const params: Record<string, string> = {};
    if (conversationId) params['conversationId'] = conversationId;
    return this.http.get(`${this.baseUrl}/v1/calls/history`, { params });
  }

  endCall(callId: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/v1/calls/${callId}/end`, {});
  }

  heartbeat(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/v1/user/heartbeat`, {});
  }

  // User online status
  getUserOnlineStatus(userId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/user/${userId}/status`);
  }

  revealPhoneNumber(userId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/users/${userId}/phone`);
  }

  // Connected profiles for chat list
  getConnectedProfiles(): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/shortlist/connected`);
  }

  blockUser(userId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/v1/user/${userId}/block`, {});
  }

  reportUser(userId: string, reason: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/v1/user/${userId}/report`, { reason });
  }

  // Premium
  getPlans(): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/premium/plans`);
  }

  subscribePlan(planId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/v1/premium/subscribe/${planId}`, {});
  }

  // Admin
  getAdminStats(): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/admin/stats`);
  }

  getAdminUsers(): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/admin/users`);
  }

  updateUserStatus(userId: string, status: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/v1/admin/users/${userId}/status`, { status });
  }

  getMatchAnalytics(): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/admin/analytics/matches`);
  }

  getRegistrationTrends(): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/admin/analytics/registrations`);
  }

  getMatchWeights(): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/admin/match-weights`);
  }

  updateMatchWeights(weights: Record<string, number>): Observable<any> {
    return this.http.patch(`${this.baseUrl}/v1/admin/match-weights`, weights);
  }

  // Email history / notification center
  getEmailNotifications(): Observable<any> {
    return this.http.get<any[]>(`${this.baseUrl}/v1/email-history/notifications`);
  }

  getEmailNotificationDetail(guid: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/v1/email-history/${guid}`);
  }

  markEmailOpened(id: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/v1/email-history/${id}/open`, {});
  }

  markEmailRead(id: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/v1/email-history/${id}/read`, {});
  }

  markAllEmailRead(): Observable<any> {
    return this.http.put(`${this.baseUrl}/v1/email-history/read-all`, {});
  }

  // Lookup values (cities, occupations, educationLevels)
  getLookupValues(): Observable<{
    cities: { id: number; name: string }[];
    occupations: { id: number; name: string }[];
    educationLevels: { id: number; name: string }[];
  }> {
    return this.http.get<any>(`${this.baseUrl}/v1/lookup/values`);
  }

  // Notifications
  getNotifications(): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/notifications`);
  }

  markNotificationRead(id: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/v1/notifications/${id}/read`, {});
  }

  markAllNotificationsRead(): Observable<any> {
    return this.http.patch(`${this.baseUrl}/v1/notifications/read-all`, {});
  }

  // Feedback
  submitFeedback(data: { category: string; rating: number; subject: string; message: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/v1/feedback`, data);
  }

  // Settings
  updateNotificationSettings(data: Partial<{
    emailMatches: boolean; emailMessages: boolean; emailInterests: boolean;
    emailMarketing: boolean; smsAlerts: boolean; pushMatches: boolean; pushMessages: boolean;
  }>): Observable<any> {
    return this.http.patch(`${this.baseUrl}/v1/settings/me/notifications`, data);
  }

  updatePrivacySettings(data: Partial<{
    showOnlineStatus: boolean; showReadReceipts: boolean;
    profileIndexed: boolean; allowMessageFrom: 'everyone' | 'matches' | 'none';
  }>): Observable<any> {
    return this.http.patch(`${this.baseUrl}/v1/settings/me/privacy`, data);
  }

  deactivateAccount(): Observable<any> {
    return this.http.patch(`${this.baseUrl}/v1/settings/me/deactivate`, {});
  }

  deleteAccount(): Observable<any> {
    return this.http.patch(`${this.baseUrl}/v1/settings/me/delete`, {});
  }

   // For testing/demo purposes - not part of original API spec

  // Users
  getAllUsers(): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/users`);
  }

  getUserById(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/users/${id}`);
  }

  // Match Fixed — profile-scoped (authenticated)
  createMatchFixed(dto: Record<string, unknown>): Observable<any> {
    return this.http.post(`${this.baseUrl}/v1/profile/match-fixed`, dto);
  }

  getMyMatchFixed(): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/profile/match-fixed/me`);
  }

  getMatchFixedById(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/profile/match-fixed/${id}`);
  }

  updateMatchFixed(id: string, dto: Record<string, unknown>): Observable<any> {
    return this.http.put(`${this.baseUrl}/v1/profile/match-fixed/${id}`, dto);
  }

  deleteMatchFixed(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/v1/profile/match-fixed/${id}`);
  }

  // Match Fixed — public (no auth)
  getPublicSuccessStories(params?: Record<string, string | number>): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/match-fixed/public`, { params: params as any });
  }

  getFeaturedSuccessStories(): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/match-fixed/public/featured`);
  }

  getSuccessStats(): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/match-fixed/public/stats`);
  }

  getSuccessStoryById(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/match-fixed/public/${id}`);
  }

  // Match Fixed — admin
  getMatchFixedAdminDashboard(): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/match-fixed/admin/dashboard`);
  }

  verifyMatchFixedPartner(id: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/v1/match-fixed/${id}/verify-partner`, {});
  }

  uploadMatchFixedPhoto(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    formData.append('context', 'match-fixed');
    //return this.http.post(`${this.baseUrl}/v1/profiles/profile/image`, formData);
    return this.http.post(`${this.baseUrl}/v1/images/upload`, formData);
  }

  deleteUser(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/v1/users/${id}`);
  }

  //admin - profile management
  adminUpdateProfile(userId: string, data: Partial<UserProfile>): Observable<any> {
    return this.http.patch(`${this.baseUrl}/v1/admin/users/${userId}/profile`, data);
  }

  getProfileByIdAdmx(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/profiles/admx/${id}`);
  }

  updateNewProfileAdmx(id: string, data: UserProfile): Observable<any> {
    return this.http.patch(`${this.baseUrl}/v1/profiles/admx/${id}`, data);
  }

  // Contact
  createContact(data: { firstName: string; lastName: string; email: string; mobile?: string; message: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/v1/contact`, data);
  }

  // Safety Tips — public
  getSafetyTips(): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/safety-tips`);
  }

  // Safety Tips — admin
  adminGetSafetyTips(): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/admin/safety-tips`);
  }
  adminCreateSafetyTip(dto: Record<string, unknown>): Observable<any> {
    return this.http.post(`${this.baseUrl}/v1/admin/safety-tips`, dto);
  }
  adminUpdateSafetyTip(id: string, dto: Record<string, unknown>): Observable<any> {
    return this.http.put(`${this.baseUrl}/v1/admin/safety-tips/${id}`, dto);
  }
  adminDeleteSafetyTip(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/v1/admin/safety-tips/${id}`);
  }

}
