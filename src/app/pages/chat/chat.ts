import {
  Component, ChangeDetectionStrategy, inject, signal, computed,
  OnInit, OnDestroy, ViewChild, ElementRef, effect,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MaterialModule } from '../../shared/modules/material.module';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { InterestService } from '../../services/interest.service';
import { ApiService } from '../../services/api.service';
import { CallingService } from '../../services/calling.service';
import { Conversation, InterestRequest, CallType, MessageDeliveryStatus } from '../../models/user.model';

type SidebarTab = 'chats' | 'interests';

const ACCEPTED_IMAGE_VIDEO = 'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm';
const ACCEPTED_DOCS = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip';
const ACCEPTED_AUDIO = 'audio/mpeg,audio/wav,audio/ogg,audio/aac';

@Component({
  selector: 'app-chat',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, DatePipe, MaterialModule, RouterLink],
  templateUrl: './chat.html',
  styleUrl: './chat.scss',
})
export class ChatComponent implements OnInit, OnDestroy {
  protected readonly chatService = inject(ChatService);
  protected readonly authService = inject(AuthService);
  protected readonly interestService = inject(InterestService);
  private readonly api = inject(ApiService);
  private readonly callingService = inject(CallingService);
  private readonly snackBar = inject(MatSnackBar);

  @ViewChild('messagesArea') private messagesAreaRef!: ElementRef<HTMLElement>;
  @ViewChild('imageFileInput') private imageFileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('docFileInput') private docFileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('audioFileInput') private audioFileInput!: ElementRef<HTMLInputElement>;

  // ─── Sidebar state ───
  protected readonly activeTab = signal<SidebarTab>('chats');
  protected readonly searchQuery = signal('');
  protected readonly showSearch = signal(false);
  protected readonly mobileSidebarOpen = signal(true);

  // ─── Chat area state ───
  protected readonly activeConv = signal<Conversation | null>(null);
  /** Bound directly to the service's reactive map — updates on polling AND WS events. */
  protected readonly messages = this.chatService.activeMessages;
  protected readonly messageText = signal('');
  protected readonly showIcebreakers = signal(false);
  protected readonly isUploading = signal(false);
  protected readonly isLoadingMessages = signal(false);
  protected readonly isLoadingConversations = signal(true);

  // ─── Premium modal ───
  protected readonly showPremiumModal = signal(false);
  protected readonly premiumModalReason = signal('');

  // ─── Phone reveal ───
  protected readonly revealedPhone = signal<string | null>(null);

  // ─── Typing debounce ───
  private typingTimer: ReturnType<typeof setTimeout> | null = null;

  // ─── Computed ───
  protected readonly currentUserId = computed(() => this.authService.user()?.id ?? 'me');
  protected readonly isPremium = computed(() => this.authService.isPremium());

  protected readonly filteredConversations = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const convs = this.chatService.allConversations();
    if (!q) return convs;
    return convs.filter(c => {
      const p = c.partnerProfile;
      return p?.firstName?.toLowerCase().includes(q) ||
        p?.lastName?.toLowerCase().includes(q) ||
        p?.location?.city?.toLowerCase().includes(q) ||
        c.lastMessage?.content?.toLowerCase().includes(q);
    });
  });

  protected readonly pendingInterests = computed(() =>
    this.interestService.pendingReceived(),
  );

  protected readonly pendingInterestsCount = computed(() =>
    this.interestService.pendingReceivedCount(),
  );

  protected readonly canSend = computed(() =>
    (!!this.messageText().trim() || false) && !!this.activeConv(),
  );

  /**
   * Merges the stable profile snapshot (partnerProfile, id) from activeConv
   * with the live real-time status (isTyping, isOnline, lastSeen) from the
   * service's reactive conversations list. This ensures the chat header and
   * typing bubble re-render whenever the service updates those fields.
   */
  protected readonly activeConvLive = computed(() => {
    const snapshot = this.activeConv();
    if (!snapshot) return null;
    const live = this.chatService.activeConversationLive();
    if (!live) return snapshot;
    return {
      ...snapshot,
      isTyping: live.isTyping,
      isOnline: live.isOnline,
      lastSeen: live.lastSeen,
      unreadCount: live.unreadCount,
    };
  });

  protected readonly acceptedFileTypes = {
    image: ACCEPTED_IMAGE_VIDEO,
    doc: ACCEPTED_DOCS,
    audio: ACCEPTED_AUDIO,
  };

  constructor() {
    // Scroll to bottom whenever messages change
    effect(() => {
      const msgs = this.messages();
      if (msgs.length > 0) {
        setTimeout(() => this.scrollToBottom(), 50);
      }
    });
  }

  async ngOnInit(): Promise<void> {
    // Connect WebSocket with JWT
    const token = localStorage.getItem('suhana_token');
    if (token) {
      this.chatService.connectWebSocket(token);
    }

    // Load interests and conversations in parallel
    await Promise.allSettled([
      this.interestService.loadInterests(),
      this.chatService.loadConversations(),
    ]);
    this.isLoadingConversations.set(false);

    // Open first conversation if any
    const convs = this.chatService.allConversations();
    if (convs.length > 0) {
      await this.openConversation(convs[0]);
    }
  }

  ngOnDestroy(): void {
    if (this.typingTimer) clearTimeout(this.typingTimer);
    this.chatService.disconnectWebSocket();
  }

  async openConversation(conv: Conversation): Promise<void> {
    this.activeConv.set(conv);
    this.mobileSidebarOpen.set(false);
    this.isLoadingMessages.set(true);
    this.revealedPhone.set(null);

    await this.chatService.setActiveConversation(conv.id);
    const msgs = await this.chatService.loadMessages(conv.id);
    this.isLoadingMessages.set(false);
    this.showIcebreakers.set(msgs.length === 0);
    this.scrollToBottom();
  }

  async sendMessage(): Promise<void> {
    const text = this.messageText().trim();
    if (!text || !this.activeConv()) return;

    const conv = this.activeConv()!;
    const partnerId = conv.partnerProfile?.userId ?? conv.participants.find(p => p !== this.currentUserId()) ?? '';

    this.messageText.set('');
    this.showIcebreakers.set(false);
    this.stopTypingIndicator(conv.id);

    await this.chatService.sendTextMessage(conv.id, this.currentUserId(), partnerId, text);
  }

  async sendIcebreaker(text: string): Promise<void> {
    this.messageText.set(text);
    await this.sendMessage();
  }

  onMessageInput(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.messageText.set(value);
    this.autoResizeTextarea(event.target as HTMLTextAreaElement);

    const conv = this.activeConv();
    if (!conv) return;

    this.chatService.sendTypingIndicator(conv.id, true);

    if (this.typingTimer) clearTimeout(this.typingTimer);
    this.typingTimer = setTimeout(() => this.stopTypingIndicator(conv.id), 2500);
  }

  onEnterKey(event: Event): void {
    const ke = event as KeyboardEvent;
    if (!ke.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  triggerFileInput(type: 'image' | 'doc' | 'audio'): void {
    const map = {
      image: this.imageFileInput,
      doc: this.docFileInput,
      audio: this.audioFileInput,
    };
    map[type]?.nativeElement.click();
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0 || !this.activeConv()) return;

    const conv = this.activeConv()!;
    const partnerId = conv.partnerProfile?.userId ?? conv.participants.find(p => p !== this.currentUserId()) ?? '';
    this.isUploading.set(true);

    try {
      for (const file of Array.from(files)) {
        if (file.size > 25 * 1024 * 1024) {
          this.snackBar.open(`${file.name} exceeds 25MB limit`, 'OK', { duration: 3000 });
          continue;
        }
        await this.chatService.sendAttachment(conv.id, this.currentUserId(), partnerId, file);
      }
    } finally {
      this.isUploading.set(false);
      input.value = '';
    }
  }

  async initiateCall(type: CallType): Promise<void> {
    if (!this.isPremium()) {
      this.premiumModalReason.set(type === 'video' ? 'video calling' : 'audio calling');
      this.showPremiumModal.set(true);
      return;
    }
    const conv = this.activeConv();
    const partner = conv?.partnerProfile;
    if (!conv || !partner) return;

    const photo = partner.photos?.find(p => p.isPrimary) ?? partner.photos?.[0];
    await this.callingService.initiateCall(conv.id, type, {
      id: partner.userId,
      name: `${partner.firstName} ${partner.lastName ?? ''}`.trim(),
      photoUrl: photo?.url,
    });
  }

  async revealPhone(): Promise<void> {
    if (!this.isPremium()) {
      this.premiumModalReason.set('viewing phone numbers');
      this.showPremiumModal.set(true);
      return;
    }
    const partnerId = this.activeConv()?.partnerProfile?.userId;
    if (!partnerId) return;
    try {
      const { firstValueFrom } = await import('rxjs');
      const res = await firstValueFrom(this.api.revealPhoneNumber(partnerId));
      this.revealedPhone.set(res?.mobile ?? res?.data?.mobile ?? 'Not available');
    } catch(error: any) {
      const message =
        error?.error?.message ||   // NestJS HttpException
        error?.message ||          // Generic JS Error
        'Could not fetch phone number';

      this.snackBar.open(message, 'OK', { duration: 3000 });
    }
  }

  async acceptInterest(interest: InterestRequest): Promise<void> {
    try {
      await this.interestService.acceptInterest(interest.id);
      if (interest.fromUser?.profile) {
        this.chatService.addConversationFromInterest(interest.fromUser);
      }
      this.snackBar.open(`Connected with ${interest.fromUser?.profile?.firstName ?? 'user'}!`, undefined, { duration: 3000 });
      this.activeTab.set('chats');
    } catch {
      this.snackBar.open('Could not accept interest', 'OK', { duration: 3000 });
    }
  }

  async declineInterest(interest: InterestRequest): Promise<void> {
    try {
      await this.interestService.declineInterest(interest.id);
    } catch {
      this.snackBar.open('Could not decline interest', 'OK', { duration: 3000 });
    }
  }

  async deleteMessage(messageId: string): Promise<void> {
    const conv = this.activeConv();
    if (!conv) return;
    await this.chatService.deleteMessage(conv.id, messageId);
  }

  toggleSearch(): void {
    this.showSearch.update(v => !v);
    if (!this.showSearch()) this.searchQuery.set('');
  }

  openMobileSidebar(): void {
    this.mobileSidebarOpen.set(true);
    this.activeConv.set(null);
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  deliveryIcon(status?: MessageDeliveryStatus): string {
    switch (status) {
      case 'sending': return 'schedule';
      case 'sent': return 'done';
      case 'delivered': return 'done_all';
      case 'read': return 'done_all';
      case 'failed': return 'error_outline';
      default: return 'done';
    }
  }

  deliveryClass(status?: MessageDeliveryStatus): string {
    if (status === 'read') return 'status-read';
    if (status === 'failed') return 'status-failed';
    return '';
  }

  isSameDay(a: Date | string, b: Date | string): boolean {
    const da = new Date(a);
    const db = new Date(b);
    return da.getFullYear() === db.getFullYear() &&
      da.getMonth() === db.getMonth() &&
      da.getDate() === db.getDate();
  }

  isToday(d: Date | string): boolean {
    return this.isSameDay(d, new Date());
  }

  isYesterday(d: Date | string): boolean {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return this.isSameDay(d, yesterday);
  }

  dateLabel(d: Date | string): string {
    if (this.isToday(d)) return 'Today';
    if (this.isYesterday(d)) return 'Yesterday';
    return new DatePipe('en-IN').transform(d, 'MMMM d, y') ?? '';
  }

  shouldShowDateSeparator(index: number): boolean {
    const msgs = this.messages();
    if (index === 0) return true;
    return !this.isSameDay(msgs[index - 1].timestamp, msgs[index].timestamp);
  }

  get icebreakers(): string[] {
    return this.chatService.icebreakers;
  }

  private stopTypingIndicator(convId: string): void {
    this.chatService.sendTypingIndicator(convId, false);
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
      this.typingTimer = null;
    }
  }

  private scrollToBottom(): void {
    const el = this.messagesAreaRef?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }

  private autoResizeTextarea(el: HTMLTextAreaElement): void {
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }
}
