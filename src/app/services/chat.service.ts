import { Injectable, signal, inject } from '@angular/core';
import { ChatMessage, Conversation } from '../models/user.model';
import { ApiService } from './api.service';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly api = inject(ApiService);
  private readonly conversations = signal<Conversation[]>([]);
  private readonly messages = signal<Map<string, ChatMessage[]>>(new Map());
  private readonly activeConversationId = signal<string | null>(null);

  readonly allConversations = this.conversations.asReadonly();
  readonly activeConversation = this.activeConversationId.asReadonly();

  readonly icebreakers: string[] = [
    'What\'s your favorite movie to watch on weekends?',
    'If you could travel anywhere in the world, where would you go?',
    'What\'s the best meal you\'ve ever had?',
    'Do you prefer mountains or beaches for vacation?',
    'What\'s a hobby you\'ve always wanted to pick up?',
    'What does your ideal Sunday look like?',
    'Are you a morning person or a night owl?',
    'What\'s the last book you read that you loved?',
  ];

  async loadConversations(): Promise<void> {
    try {
      const convos = await firstValueFrom(this.api.getConversations());
      this.conversations.set(Array.isArray(convos) ? convos : []);
    } catch { /* keep local */ }
  }

  async loadMessages(conversationId: string): Promise<ChatMessage[]> {
    try {
      const msgs = await firstValueFrom(this.api.getMessages(conversationId));
      const list = Array.isArray(msgs) ? msgs : [];
      this.messages.update(map => {
        const newMap = new Map(map);
        newMap.set(conversationId, list);
        return newMap;
      });
      return list;
    } catch {
      return this.messages().get(conversationId) ?? [];
    }
  }

  getConversation(conversationId: string): Conversation | undefined {
    return this.conversations().find(c => c.id === conversationId);
  }

  getMessages(conversationId: string): ChatMessage[] {
    return this.messages().get(conversationId) ?? [];
  }

  startConversation(userId: string, matchUserId: string): Conversation {
    const existing = this.conversations().find(c =>
      c.participants.includes(userId) && c.participants.includes(matchUserId)
    );
    if (existing) return existing;

    // Fire API call asynchronously
    this.api.startConversation(matchUserId).subscribe({ error: () => {} });

    const conversation: Conversation = {
      id: `conv_${Date.now()}`,
      participants: [userId, matchUserId],
      unreadCount: 0,
      isUnlocked: true,
    };
    this.conversations.update(list => [...list, conversation]);
    this.messages.update(map => {
      const newMap = new Map(map);
      newMap.set(conversation.id, []);
      return newMap;
    });
    return conversation;
  }

  sendMessage(conversationId: string, senderId: string, receiverId: string, content: string, type: 'text' | 'icebreaker' = 'text'): void {
    const message: ChatMessage = {
      id: `msg_${Date.now()}`,
      senderId, receiverId, content,
      timestamp: new Date(),
      isRead: false, type,
    };

    this.messages.update(map => {
      const newMap = new Map(map);
      const existing = newMap.get(conversationId) ?? [];
      newMap.set(conversationId, [...existing, message]);
      return newMap;
    });

    this.conversations.update(list =>
      list.map(c => c.id === conversationId ? { ...c, lastMessage: message } : c)
    );

    // Fire API call
    this.api.sendMessage(conversationId, content, type).subscribe({ error: () => {} });
  }

  setActiveConversation(conversationId: string | null): void {
    this.activeConversationId.set(conversationId);
    if (conversationId) {
      this.api.markAsRead(conversationId).subscribe({ error: () => {} });
    }
  }

  getRandomIcebreaker(): string {
    return this.icebreakers[Math.floor(Math.random() * this.icebreakers.length)];
  }
}
