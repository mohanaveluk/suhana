import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from '../../shared/modules/material.module';
import { ChatService } from '../../services';
import { ProfileService } from '../../services';
import { ChatMessage, UserProfile } from '../../models/user.model';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-chat',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, DatePipe, MaterialModule,
  ],
  templateUrl: './chat.html',
  styleUrl: './chat.scss',
})
export class ChatComponent implements OnInit {
  private readonly profileService = inject(ProfileService);

  protected readonly chatService = inject(ChatService);

  protected readonly conversations = signal<{ id: string; profile: UserProfile; lastMessage?: string; time?: Date }[]>([]);
  protected readonly activeChat = signal<{ profile: UserProfile; messages: ChatMessage[] } | null>(null);
  protected readonly messageText = signal('');
  protected readonly showIcebreakers = signal(false);

  async ngOnInit(): Promise<void> {
    // Load data from API
    await this.profileService.loadProfiles();
    await this.chatService.loadConversations();

    // Setup demo conversations
    const profiles = this.profileService.allProfiles();
    const demoConvos = profiles.slice(0, 5).map((profile: UserProfile, i: number) => {
      const conv = this.chatService.startConversation('me', profile.userId);
      if (i < 3) {
        this.chatService.sendMessage(conv.id, profile.userId, 'me', `Hi! I noticed we have a lot in common. Would love to connect!`);
        this.chatService.sendMessage(conv.id, 'me', profile.userId, `Hello ${profile.firstName}! Yes, I'd love to chat.`);
      }
      return {
        id: conv.id,
        profile,
        lastMessage: i < 3 ? `Hello ${profile.firstName}! Yes, I'd love to chat.` : undefined,
        time: new Date(),
      };
    });
    this.conversations.set(demoConvos);

    if (demoConvos.length > 0) {
      this.openChat(demoConvos[0]);
    }
  }

  openChat(conv: { id: string; profile: UserProfile }): void {
    this.chatService.setActiveConversation(conv.id);
    const messages = this.chatService.getMessages(conv.id);
    this.activeChat.set({ profile: conv.profile, messages });
    this.showIcebreakers.set(messages.length === 0);
  }

  sendMessage(): void {
    const text = this.messageText().trim();
    if (!text || !this.activeChat()) return;

    const convId = this.chatService.activeConversation();
    if (!convId) return;

    this.chatService.sendMessage(convId, 'me', this.activeChat()!.profile.userId, text);
    const messages = this.chatService.getMessages(convId);
    this.activeChat.update(c => c ? { ...c, messages } : c);
    this.messageText.set('');
    this.showIcebreakers.set(false);
  }

  sendIcebreaker(text: string): void {
    this.messageText.set(text);
    this.sendMessage();
  }

  onMessageInput(event: Event): void {
    this.messageText.set((event.target as HTMLInputElement).value);
  }

  get icebreakers(): string[] {
    return this.chatService.icebreakers;
  }
}
