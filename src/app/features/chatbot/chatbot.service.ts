import { Injectable, inject, signal, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ChatbotSendRequest,
  ChatbotApiResponse,
  ChatbotSessionResponse,
  ChatbotFeedbackRequest,
} from './models/chatbot-response.model';
import { ChatSession } from './models/chatbot-session.model';
import { ChatMessage } from './models/chatbot-message.model';
import { AuthService } from '../../services/auth.service';

const STORAGE_KEY = 'suhana_chat_session';

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  private readonly http    = inject(HttpClient);
  private readonly auth    = inject(AuthService);
  private readonly baseUrl = `${environment.apiUrl}/v1/chatbot`;

  private _sessionId      = '';
  private _conversationId = '';

  readonly session = signal<ChatSession | null>(null);

  constructor() {
    this.restoreSession();
    // Chat history is scoped to auth state — drop it whenever the user logs in/out.
    let prevAuth = this.auth.isAuthenticated();
    effect(() => {
      const authed = this.auth.isAuthenticated();
      if (authed !== prevAuth) {
        prevAuth = authed;
        this.clearSession();
      }
    });
  }

  get sessionId():      string { return this._sessionId; }
  get conversationId(): string { return this._conversationId; }

  // ── Persistence ──────────────────────────────────────────────────────────────
  private restoreSession(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw) as ChatSession;
      // Discard a session that belongs to a different auth state (guest vs. logged-in).
      if (!!s.authenticated !== this.auth.isAuthenticated()) {
        this.clearSession();
        return;
      }
      this._sessionId      = s.sessionId;
      this._conversationId = s.conversationId;
      // Rehydrate Date objects from ISO strings
      s.messages = s.messages.map(m => ({ ...m, timestamp: new Date(m.timestamp) }));
      this.session.set(s);
    } catch { /* ignore corrupt storage */ }
  }

  saveSession(messages: ChatMessage[]): void {
    const s: ChatSession = {
      sessionId:      this._sessionId,
      conversationId: this._conversationId,
      createdAt:      new Date().toISOString(),
      authenticated:  this.auth.isAuthenticated(),
      messages,
    };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* quota exceeded */ }
    this.session.set(s);
  }

  clearSession(): void {
    localStorage.removeItem(STORAGE_KEY);
    this._sessionId      = '';
    this._conversationId = '';
    this.session.set(null);
  }

  // ── API Calls ────────────────────────────────────────────────────────────────
  createSession(): Observable<ChatbotSessionResponse> {
    return this.http.post<ChatbotSessionResponse>(`${this.baseUrl}/session`, {}).pipe(
      tap(res => {
        this._sessionId      = res.sessionId;
        this._conversationId = res.conversationId;
      }),
      catchError(() => {
        // Offline/dev fallback — generate local IDs so chat still works
        this._sessionId      = crypto.randomUUID();
        this._conversationId = crypto.randomUUID();
        return of({ sessionId: this._sessionId, conversationId: this._conversationId });
      }),
    );
  }

  sendMessage(message: string): Observable<ChatbotApiResponse> {
    const body: ChatbotSendRequest = {
      message,
      sessionId:      this._sessionId,
      conversationId: this._conversationId,
    };
    const endpoint = this.auth.isAuthenticated()
      ? `${this.baseUrl}/message`
      : `${this.baseUrl}/public/message`;
    return this.http.post<ChatbotApiResponse>(endpoint, body).pipe(
      catchError(() => of({
        messageId:      '',
        answer:         "I'm having trouble connecting right now. Please try again in a moment.",
        source:         'fallback',
        confidence:     0,
        suggestions:    [],
        tokensUsed:     0,
        responseTimeMs: 0,
      } satisfies ChatbotApiResponse)),
    );
  }

  submitFeedback(req: ChatbotFeedbackRequest): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/feedback`, req).pipe(
      catchError(() => of(null)),
    );
  }
}
