import { ChatMessage } from './chatbot-message.model';

export interface ChatSession {
  sessionId:      string;
  conversationId: string;
  createdAt:      string;  // ISO string — safe for JSON round-trip
  authenticated:  boolean; // auth state the session belongs to — used to scope history
  messages:       ChatMessage[];
}
