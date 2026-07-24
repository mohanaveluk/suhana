import { Injectable, signal, inject, computed } from '@angular/core';
import { ChatMessage, Conversation, User, UserProfile } from '../models/user.model';
import { ApiService } from './api.service';
import { WebSocketService, WS_EVENTS } from './websocket.service';
import { firstValueFrom, Subscription } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly api = inject(ApiService);
  private readonly ws = inject(WebSocketService);

  private readonly conversations = signal<Conversation[]>([]);
  private readonly messagesMap = signal<Map<string, ChatMessage[]>>(new Map());
  private readonly activeConversationId = signal<string | null>(null);
  private wsSubs: Subscription[] = [];
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private typingPollInterval: ReturnType<typeof setInterval> | null = null;
  private readonly typingClearTimers = new Map<string, ReturnType<typeof setTimeout>>();

  readonly allConversations = this.conversations.asReadonly();
  readonly activeConversation = this.activeConversationId.asReadonly();

  /** Reactive messages for the active conversation — updates on WS events and polling. */
  readonly activeMessages = computed(() =>
    this.messagesMap().get(this.activeConversationId() ?? '') ?? [],
  );

  /** Live conversation object for the active conversation — isTyping/isOnline update reactively. */
  readonly activeConversationLive = computed(() => {
    const id = this.activeConversationId();
    return id ? (this.conversations().find(c => c.id === id) ?? null) : null;
  });

  readonly totalUnread = computed(() =>
    this.conversations().reduce((sum, c) => sum + (c.unreadCount ?? 0), 0),
  );

  readonly icebreakers: string[] = [
    "What's your favorite movie to watch on weekends?",
    'If you could travel anywhere in the world, where would you go?',
    "What's the best meal you've ever had?",
    'Do you prefer mountains or beaches for vacation?',
    "What's a hobby you've always wanted to pick up?",
    'What does your ideal Sunday look like?',
    'Are you a morning person or a night owl?',
    "What's the last book you read that you loved?",
    'What kind of music do you enjoy the most?',
    'Tell me something unique about yourself!',
  ];

  connectWebSocket(token: string): void {
    this.ws.connect(token);
    this.subscribeToWsEvents();
  }

  private subscribeToWsEvents(): void {
    this.wsSubs.forEach(s => s.unsubscribe());
    this.wsSubs = [];

    // Incoming message — WS is working, stop all polling fallbacks
    this.wsSubs.push(
      this.ws.ofType<ChatMessage>(WS_EVENTS.MESSAGE_NEW).subscribe(msg => {
        this.stopPolling();
        this.stopTypingPoll();
        this.addMessageToMap(msg.senderId === this.getCurrentPartnerId() || msg.receiverId === this.getCurrentPartnerId()
          ? this.activeConversationId() ?? this.findConvIdForUser(msg.senderId)
          : this.findConvIdForUser(msg.senderId), msg);
        this.updateConvLastMessage(msg.senderId, msg);
      }),
    );

    // Message read receipt
    this.wsSubs.push(
      this.ws.ofType<{ conversationId: string; readBy: string }>(WS_EVENTS.MESSAGE_READ).subscribe(({ conversationId }) => {
        this.messagesMap.update(map => {
          const newMap = new Map(map);
          const msgs = (newMap.get(conversationId) ?? []).map(m => ({ ...m, isRead: true, deliveryStatus: 'read' as const }));
          newMap.set(conversationId, msgs);
          return newMap;
        });
      }),
    );

    // Typing indicator — updates ALL conversations, not just the active one,
    // so background-conversation typing is visible in the sidebar.
    this.wsSubs.push(
      this.ws.ofType<{ conversationId: string; userId: string; isTyping: boolean }>(WS_EVENTS.TYPING_START).subscribe(({ conversationId, isTyping }) => {
        this.conversations.update(list =>
          list.map(c => c.id === conversationId ? { ...c, isTyping } : c),
        );
        if (isTyping) {
          this.scheduleTypingClear(conversationId);
        } else {
          this.cancelTypingClear(conversationId);
        }
      }),
    );

    this.wsSubs.push(
      this.ws.ofType<{ conversationId: string }>(WS_EVENTS.TYPING_STOP).subscribe(({ conversationId }) => {
        this.cancelTypingClear(conversationId);
        this.conversations.update(list =>
          list.map(c => c.id === conversationId ? { ...c, isTyping: false } : c),
        );
      }),
    );

    // Online/offline status
    this.wsSubs.push(
      this.ws.ofType<{ userId: string }>(WS_EVENTS.USER_ONLINE).subscribe(({ userId }) => {
        this.conversations.update(list =>
          list.map(c => c.partnerProfile?.userId === userId ? { ...c, isOnline: true } : c),
        );
      }),
    );

    this.wsSubs.push(
      this.ws.ofType<{ userId: string; lastSeen: string }>(WS_EVENTS.USER_OFFLINE).subscribe(({ userId, lastSeen }) => {
        this.conversations.update(list =>
          list.map(c => c.partnerProfile?.userId === userId
            ? { ...c, isOnline: false, lastSeen: new Date(lastSeen) }
            : c),
        );
      }),
    );
  }

  async loadConversations(): Promise<void> {
    try {
      const res = await firstValueFrom(this.api.getConversations());
      const list: Conversation[] = res?.data ?? res;
      if (Array.isArray(list) && list.length > 0) {
        this.conversations.set(list);
        return;
      }
    } catch { /* fall through to connected profiles */ }

    // Fallback: build conversations from connected matches
    try {
      const res = await firstValueFrom(this.api.getConnectedProfiles());
      const connected: { profile: UserProfile; matchId: string }[] = res?.data ?? res;
      if (!Array.isArray(connected)) return;

      const convos: Conversation[] = connected.map(item => ({
        id: item.matchId ?? `conv_${item.profile.userId}`,
        participants: ['me', item.profile.userId],
        partnerProfile: item.profile,
        unreadCount: 0,
        isUnlocked: true,
      }));
      this.conversations.set(convos);
    } catch { /* keep empty */ }
  }

  async loadMessages(conversationId: string): Promise<ChatMessage[]> {
    try {
      const res = await firstValueFrom(this.api.getMessages(conversationId));
      const list = res?.data ?? res;
      const msgs: ChatMessage[] = Array.isArray(list)
        ? list.map((m: unknown) => this.normalizeMessage(m))
        : [];
      this.messagesMap.update(map => {
        const newMap = new Map(map);
        newMap.set(conversationId, msgs);
        return newMap;
      });
      return msgs;
    } catch {
      return this.messagesMap().get(conversationId) ?? [];
    }
  }

  getMessages(conversationId: string): ChatMessage[] {
    return this.messagesMap().get(conversationId) ?? [];
  }

  getConversation(conversationId: string): Conversation | undefined {
    return this.conversations().find(c => c.id === conversationId);
  }

  async setActiveConversation(conversationId: string | null): Promise<void> {
    this.stopPolling();
    this.activeConversationId.set(conversationId);
    if (!conversationId) return;

    // Mark as read locally
    this.conversations.update(list =>
      list.map(c => c.id === conversationId ? { ...c, unreadCount: 0 } : c),
    );
    this.api.markAsRead(conversationId).subscribe({ error: () => {} });

    // Fall back to HTTP polling when WebSocket is not connected
    if (!this.ws.isConnected) {
      this.startPolling(conversationId);
      this.startTypingPoll();
    }
  }

  startPolling(conversationId: string): void {
    this.stopPolling();
    this.pollInterval = setInterval(() => {
      void this.pollNewMessages(conversationId);
    }, 4000);
  }

  stopPolling(): void {
    if (this.pollInterval !== null) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  startTypingPoll(): void {
    this.stopTypingPoll();
    this.typingPollInterval = setInterval(() => {
      void this.checkAllTypingStatuses();
    }, 3000);
  }

  stopTypingPoll(): void {
    if (this.typingPollInterval !== null) {
      clearInterval(this.typingPollInterval);
      this.typingPollInterval = null;
    }
  }

  /** Polls typing status for every conversation so background convs update too. */
  private async checkAllTypingStatuses(): Promise<void> {
    const convs = this.conversations();
    await Promise.allSettled(convs.map(async conv => {
      try {
        const res = await firstValueFrom(this.api.getTypingStatus(conv.id));
        const isTyping: boolean = res?.isTyping ?? res?.data?.isTyping ?? false;
        this.conversations.update(list =>
          list.map(c => c.id === conv.id ? { ...c, isTyping } : c),
        );
      } catch { /* typing endpoint may not exist — silently skip */ }
    }));
  }

  /** Auto-clears isTyping after 5 s in case TYPING_STOP is never received. */
  private scheduleTypingClear(conversationId: string): void {
    this.cancelTypingClear(conversationId);
    this.typingClearTimers.set(conversationId, setTimeout(() => {
      this.conversations.update(list =>
        list.map(c => c.id === conversationId ? { ...c, isTyping: false } : c),
      );
      this.typingClearTimers.delete(conversationId);
    }, 5000));
  }

  private cancelTypingClear(conversationId: string): void {
    const t = this.typingClearTimers.get(conversationId);
    if (t !== undefined) {
      clearTimeout(t);
      this.typingClearTimers.delete(conversationId);
    }
  }

  private async pollNewMessages(conversationId: string): Promise<void> {
    if (this.activeConversationId() !== conversationId) {
      this.stopPolling();
      return;
    }
    try {
      const res = await firstValueFrom(this.api.getMessages(conversationId));
      const raw = res?.data ?? res;
      const serverMsgs: ChatMessage[] = Array.isArray(raw)
        ? raw.map((m: unknown) => this.normalizeMessage(m))
        : [];
      if (!serverMsgs.length) return;

      this.messagesMap.update(map => {
        const newMap = new Map(map);
        const existing = newMap.get(conversationId) ?? [];
        const serverIds = new Set(serverMsgs.map(m => m.id));

        // Carry over locally-cached attachment data (blob URLs) that server may omit
        const localById = new Map(existing.map(m => [m.id, m]));
        const mergedMsgs = serverMsgs.map(serverMsg => {
          const local = localById.get(serverMsg.id);
          if (local?.attachments?.length && !serverMsg.attachments?.length) {
            return { ...serverMsg, attachments: local.attachments };
          }
          return serverMsg;
        });

        // Preserve local optimistic messages not yet confirmed by server
        const optimistic = existing.filter(m => m.deliveryStatus === 'sending' && !serverIds.has(m.id));
        newMap.set(conversationId, [...mergedMsgs, ...optimistic]);
        return newMap;
      });
    } catch { /* silently ignore polling failures */ }
  }

  async startOrGetConversation(partnerProfile: UserProfile): Promise<Conversation> {
    const existing = this.conversations().find(c =>
      c.participants.includes(partnerProfile.userId) ||
      c.partnerProfile?.userId === partnerProfile.userId,
    );
    if (existing) return existing;

    try {
      const res = await firstValueFrom(this.api.startConversation(partnerProfile.userId));
      const created: Conversation = {
        ...(res?.data ?? res),
        partnerProfile,
        unreadCount: 0,
        isUnlocked: true,
      };
      this.conversations.update(list => [created, ...list]);
      return created;
    } catch {
      const local: Conversation = {
        id: `conv_${Date.now()}`,
        participants: ['me', partnerProfile.userId],
        partnerProfile,
        unreadCount: 0,
        isUnlocked: true,
      };
      this.conversations.update(list => [local, ...list]);
      return local;
    }
  }

  async sendTextMessage(conversationId: string, senderId: string, receiverId: string, content: string, type: 'text' | 'icebreaker' = 'text'): Promise<void> {
    const tempId = `msg_${Date.now()}`;
    const message: ChatMessage = {
      id: tempId, senderId, receiverId, content,
      timestamp: new Date(), isRead: false, type,
      deliveryStatus: 'sending',
    };

    this.addMessageToMap(conversationId, message);
    this.updateConvLastMessage(conversationId, message);

    try {
      const res = await firstValueFrom(this.api.sendMessage(conversationId, content, type));
      const saved: ChatMessage = res?.data ?? res;
      // Replace temp message with server response
      this.messagesMap.update(map => {
        const newMap = new Map(map);
        const msgs = (newMap.get(conversationId) ?? []).map(m =>
          m.id === tempId ? { ...message, ...(saved ?? {}), deliveryStatus: 'sent' as const } : m,
        );
        newMap.set(conversationId, msgs);
        return newMap;
      });
    } catch {
      this.messagesMap.update(map => {
        const newMap = new Map(map);
        const msgs = (newMap.get(conversationId) ?? []).map(m =>
          m.id === tempId ? { ...m, deliveryStatus: 'failed' as const } : m,
        );
        newMap.set(conversationId, msgs);
        return newMap;
      });
    }
  }

  async sendAttachment(conversationId: string, senderId: string, receiverId: string, file: File): Promise<void> {
    const tempId = `msg_${Date.now()}`;
    const objectUrl = URL.createObjectURL(file);
    const attType = this.getAttachmentType(file.type, file.name);
    const message: ChatMessage = {
      id: tempId, senderId, receiverId, content: file.name,
      timestamp: new Date(), isRead: false, type: 'attachment',
      deliveryStatus: 'sending',
      attachments: [{
        id: `att_${Date.now()}`, type: attType, url: objectUrl,
        name: file.name, size: file.size, mimeType: file.type,
      }],
    };

    this.addMessageToMap(conversationId, message);
    this.updateConvLastMessage(conversationId, message);

    try {
      const res = await firstValueFrom(this.api.sendAttachment(conversationId, file));
      const saved: ChatMessage = this.normalizeMessage(res?.data ?? res);
      this.messagesMap.update(map => {
        const newMap = new Map(map);
        const msgs = (newMap.get(conversationId) ?? []).map(m => {
          if (m.id !== tempId) return m;
          // Prefer server's permanent URL over local blob URL; fall back if server omits it
          const attachments = saved?.attachments?.length ? saved.attachments : m.attachments;
          return { ...m, ...(saved ?? {}), attachments, deliveryStatus: 'sent' as const };
        });
        newMap.set(conversationId, msgs);
        return newMap;
      });
    } catch {
      this.messagesMap.update(map => {
        const newMap = new Map(map);
        const msgs = (newMap.get(conversationId) ?? []).map(m =>
          m.id === tempId ? { ...m, deliveryStatus: 'failed' as const } : m,
        );
        newMap.set(conversationId, msgs);
        return newMap;
      });
    }
  }

  async deleteMessage(conversationId: string, messageId: string): Promise<void> {
    this.messagesMap.update(map => {
      const newMap = new Map(map);
      const msgs = (newMap.get(conversationId) ?? []).map(m =>
        m.id === messageId ? { ...m, deletedAt: new Date(), content: 'This message was deleted' } : m,
      );
      newMap.set(conversationId, msgs);
      return newMap;
    });
    this.api.deleteMessage(conversationId, messageId).subscribe({ error: () => {} });
  }

  sendTypingIndicator(conversationId: string, isTyping: boolean): void {
    //this.ws.send(WS_EVENTS.TYPING_START, { conversationId, isTyping });
    this.api.sendTypingIndicator(conversationId, isTyping).subscribe({ error: () => {} });
  }

  async addConversationFromInterest(partner: User): Promise<void> {
    const exists = this.conversations().some(c => c.partnerProfile?.userId === partner.id);
    if (exists) return;
    const conv: Conversation = {
      id: `conv_interest_${partner.id}`,
      participants: ['me', partner.id],
      partnerProfile: partner.profile,
      unreadCount: 0,
      isUnlocked: true,
    };
    const resConv = await this.startOrGetConversation(partner.profile!);
    //this.conversations.update(list => [conv, ...list]);
  }

  getRandomIcebreaker(): string {
    return this.icebreakers[Math.floor(Math.random() * this.icebreakers.length)];
  }

  disconnectWebSocket(): void {
    this.stopPolling();
    this.stopTypingPoll();
    this.typingClearTimers.forEach(t => clearTimeout(t));
    this.typingClearTimers.clear();
    this.wsSubs.forEach(s => s.unsubscribe());
    this.wsSubs = [];
    this.ws.disconnect();
  }

  private addMessageToMap(conversationId: string | null, message: ChatMessage): void {
    if (!conversationId) return;
    this.messagesMap.update(map => {
      const newMap = new Map(map);
      const existing = newMap.get(conversationId) ?? [];
      newMap.set(conversationId, [...existing, message]);
      return newMap;
    });
  }

  private updateConvLastMessage(convIdOrUserId: string, message: ChatMessage): void {
    this.conversations.update(list =>
      list.map(c => {
        const isMatch = c.id === convIdOrUserId ||
          c.partnerProfile?.userId === convIdOrUserId ||
          c.partnerProfile?.userId === message.senderId;
        if (!isMatch) return c;
        const isActive = c.id === this.activeConversationId();
        return {
          ...c,
          lastMessage: message,
          unreadCount: isActive ? 0 : (c.unreadCount ?? 0) + 1,
        };
      }),
    );
  }

  private findConvIdForUser(userId: string): string | null {
    return this.conversations().find(c =>
      c.partnerProfile?.userId === userId || c.participants.includes(userId),
    )?.id ?? null;
  }

  private getCurrentPartnerId(): string | null {
    const convId = this.activeConversationId();
    if (!convId) return null;
    return this.getConversation(convId)?.partnerProfile?.userId ?? null;
  }

  private getAttachmentType(mimeType: string, url = ''): 'image' | 'video' | 'audio' | 'document' {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    // Fallback: infer from file extension when mimeType is missing
    const ext = url.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
    if (['jpg','jpeg','png','gif','webp','svg','bmp'].includes(ext)) return 'image';
    if (['mp4','webm','mov','avi','mkv'].includes(ext)) return 'video';
    if (['mp3','wav','ogg','aac','flac'].includes(ext)) return 'audio';
    return 'document';
  }

  /**
   * Normalizes a raw server message into a ChatMessage with a populated
   * attachments[] array. Servers often return attachment data as flat fields
   * (fileUrl, attachmentUrl, mimeType, fileName, fileSize) rather than a
   * nested array — this reconstructs the shape the template expects.
   */
  private normalizeMessage(raw: unknown): ChatMessage {
    const msg = raw as ChatMessage & Record<string, unknown>;

    // Already has a populated attachments array — nothing to do
    if (msg.attachments && (msg.attachments as unknown[]).length > 0) {
      return msg;
    }

    // Only try to reconstruct for attachment-type messages
    if (msg.type !== 'attachment') return msg;

    // Check every common flat-field pattern backends use
    const url = (
      msg['fileUrl'] ?? msg['attachmentUrl'] ?? msg['file_url'] ??
      msg['attachment_url'] ?? msg['mediaUrl'] ?? msg['media_url'] ??
      msg['url'] ?? ''
    ) as string;

    if (!url) return msg; // no URL found — nothing to render

    const mimeType = (
      msg['mimeType'] ?? msg['mime_type'] ?? msg['contentType'] ??
      msg['content_type'] ?? ''
    ) as string;

    const name = (
      msg['fileName'] ?? msg['file_name'] ?? msg['originalName'] ??
      msg['original_name'] ?? msg.content ?? 'attachment'
    ) as string;

    const size = (msg['fileSize'] ?? msg['file_size'] ?? msg['size'] ?? 0) as number;

    return {
      ...msg,
      attachments: [{
        id: `att_${msg.id as string}`,
        type: this.getAttachmentType(mimeType, url),
        url,
        name,
        size,
        mimeType,
      }],
    };
  }
}
