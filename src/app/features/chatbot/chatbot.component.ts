import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  AfterViewChecked,
  ViewChild,
  ElementRef,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MaterialModule } from '../../shared/modules/material.module';
import { ChatbotService } from './chatbot.service';
import { ChatAction, ChatMessage, MessageType } from './models/chatbot-message.model';

// ── Constants ──────────────────────────────────────────────────────────────────

const WELCOME_MESSAGE: ChatMessage = {
  id:        'welcome',
  role:      'bot',
  type:      'html',
  timestamp: new Date(),
  feedback:  null,
  text: [
    'Hello 👋 I\'m <strong>Suhana AI Assistant</strong>.<br><br>',
    'I can help you with:<br>',
    '&bull; Registration &amp; Login<br>',
    '&bull; Finding &amp; Viewing Matches<br>',
    '&bull; Horoscope Matching<br>',
    '&bull; Membership &amp; Premium Plans<br>',
    '&bull; Profile Verification<br>',
    '&bull; Sending Interests &amp; Messaging<br>',
    '&bull; Safety Tips &amp; Privacy<br><br>',
    'How may I assist you today?',
  ].join(''),
};

const SUGGESTED_QUESTIONS = [
  'How do I register?',
  'How do I send interest?',
  'How does AI matchmaking work?',
  'What is horoscope matching?',
  'How do I upgrade membership?',
  'How do I block a profile?',
] as const;

// ── Component ──────────────────────────────────────────────────────────────────

@Component({
  selector:        'app-ai-chatbot',
  standalone:      true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports:         [CommonModule, FormsModule, MaterialModule],
  templateUrl:     './chatbot.component.html',
  styleUrl:        './chatbot.component.scss',
})
export class AiChatbotComponent implements OnInit, AfterViewChecked {
  private readonly chatService = inject(ChatbotService);
  private readonly router      = inject(Router);

  @ViewChild('messageList') private messageListRef!: ElementRef<HTMLDivElement>;
  @ViewChild('chatInput')   private chatInputRef!:   ElementRef<HTMLTextAreaElement>;

  // ── State (Signals) ──────────────────────────────────────────────────────────
  protected readonly isOpen      = signal(false);
  protected readonly messages    = signal<ChatMessage[]>([]);
  protected readonly inputText   = signal('');
  protected readonly isTyping    = signal(false);
  protected readonly unreadCount = signal(0);
  protected readonly isMobile    = signal(typeof window !== 'undefined' && window.innerWidth < 768);

  protected readonly suggestedQuestions = SUGGESTED_QUESTIONS;

  protected readonly canSend = computed(() =>
    this.inputText().trim().length > 0 && !this.isTyping()
  );

  // Show suggestions until the user has sent their first message
  protected readonly showSuggestions = computed(() =>
    this.messages().filter(m => m.role === 'user').length === 0
  );

  private shouldScrollToBottom  = false;
  private sessionInitialized    = false;

  // ── Lifecycle ────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    const saved = this.chatService.session();
    if (saved?.messages?.length) {
      this.messages.set(saved.messages);
    } else {
      this.messages.set([{ ...WELCOME_MESSAGE, timestamp: new Date() }]);
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  @HostListener('window:resize')
  protected onResize(): void {
    this.isMobile.set(window.innerWidth < 768);
  }

  // ── Panel Controls ───────────────────────────────────────────────────────────
  protected togglePanel(): void {
    if (this.isOpen()) {
      this.isOpen.set(false);
    } else {
      this.isOpen.set(true);
      this.unreadCount.set(0);
      this.shouldScrollToBottom = true;
      setTimeout(() => this.chatInputRef?.nativeElement?.focus(), 120);
    }
  }

  protected close(): void {
    this.isOpen.set(false);
  }

  // ── Session ───────────────────────────────────────────────────────────────────
  private async ensureSession(): Promise<void> {
    if (this.sessionInitialized || this.chatService.sessionId) return;
    this.sessionInitialized = true;
    await new Promise<void>(resolve =>
      this.chatService.createSession().subscribe({ next: () => resolve(), error: () => resolve() })
    );
  }

  // ── Messaging ─────────────────────────────────────────────────────────────────
  protected async sendMessage(text?: string): Promise<void> {
    const content = (text ?? this.inputText()).trim();
    if (!content || this.isTyping()) return;

    this.inputText.set('');
    this.resetTextareaHeight();
    await this.ensureSession();

    const userMsg: ChatMessage = {
      id:        crypto.randomUUID(),
      role:      'user',
      text:      content,
      type:      'text',
      timestamp: new Date(),
    };

    this.messages.update(m => [...m, userMsg]);
    this.shouldScrollToBottom = true;
    this.isTyping.set(true);

    this.chatService.sendMessage(content).subscribe({
      next: res => {
        const botMsg: ChatMessage = {
          id:          res.messageId || crypto.randomUUID(),
          role:        'bot',
          text:        res.answer,
          type:        (res.type as MessageType) ?? 'text',
          timestamp:   new Date(),
          actions:     res.actions,
          suggestions: res.suggestions?.length ? res.suggestions : undefined,
          feedback:    null,
          profiles:    res.profiles?.length ? res.profiles : undefined,
        };
        this.messages.update(m => [...m, botMsg]);
        this.isTyping.set(false);
        this.shouldScrollToBottom = true;
        this.chatService.saveSession(this.messages());
        if (!this.isOpen()) this.unreadCount.update(c => c + 1);
      },
      error: () => {
        this.isTyping.set(false);
        this.appendErrorMessage();
      },
    });
  }

  protected onInputChange(event: Event): void {
    const ta = event.target as HTMLTextAreaElement;
    this.inputText.set(ta.value);
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 100)}px`;
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void this.sendMessage();
    }
  }

  // ── Actions ────────────────────────────────────────────────────────────────────
  protected handleAction(action: ChatAction): void {
    if (action.url) {
      void this.router.navigateByUrl(action.url);
      this.close();
    }
  }

  protected viewProfile(profileId: string): void {
  //  void this.router.navigateByUrl(`/profile-view/${profileId}`, { state: { fromChatbot: true } });
    const url = this.router.serializeUrl(
      this.router.createUrlTree([`/profile-view/${profileId}`])
    );

    window.open(url, '_blank');
    //this.close();
  }

  protected submitFeedback(msg: ChatMessage, type: 'helpful' | 'not-helpful'): void {
    if (msg.feedback) return;
    this.messages.update(msgs =>
      msgs.map(m => m.id === msg.id ? { ...m, feedback: type } : m)
    );
    this.chatService.submitFeedback({
      messageId:      msg.id,
      sessionId:      this.chatService.sessionId,
      conversationId: this.chatService.conversationId,
      feedback:       type,
    }).subscribe();
    this.chatService.saveSession(this.messages());
  }

  protected async startNewChat(): Promise<void> {
    this.chatService.clearSession();
    this.sessionInitialized = false;
    this.isTyping.set(false);
    this.unreadCount.set(0);
    this.messages.set([{ ...WELCOME_MESSAGE, timestamp: new Date() }]);
    this.shouldScrollToBottom = true;
  }

  protected copyMessage(text: string): void {
    const plain = text.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&bull;/g, '•');
    navigator.clipboard?.writeText(plain).catch(() => {
      const el = document.createElement('textarea');
      el.value = plain;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    });
  }

  protected downloadConversation(): void {
    const lines = this.messages()
      .filter(m => m.id !== 'welcome')
      .map(m => {
        const who  = m.role === 'user' ? 'You' : 'Suhana AI';
        const text = m.text.replace(/<[^>]*>/g, '');
        return `[${new Date(m.timestamp).toLocaleString()}] ${who}:\n${text}`;
      })
      .join('\n\n');
    const blob = new Blob([lines], { type: 'text/plain' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = `suhana-chat-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  protected trackById(_: number, msg: ChatMessage): string { return msg.id; }

  // ── Private Helpers ───────────────────────────────────────────────────────────
  private scrollToBottom(): void {
    const el = this.messageListRef?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }

  private resetTextareaHeight(): void {
    const ta = this.chatInputRef?.nativeElement;
    if (ta) ta.style.height = 'auto';
  }

  private appendErrorMessage(): void {
    const msg: ChatMessage = {
      id:        crypto.randomUUID(),
      role:      'bot',
      text:      "I'm having trouble connecting right now. Please try again in a moment.",
      type:      'text',
      timestamp: new Date(),
      feedback:  null,
    };
    this.messages.update(m => [...m, msg]);
    this.shouldScrollToBottom = true;
  }
}
