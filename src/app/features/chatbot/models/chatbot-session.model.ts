import { ChatMessage } from './chatbot-message.model';

export interface ChatSession {
  sessionId:      string;
  conversationId: string;
  createdAt:      string; // ISO string — safe for JSON round-trip
  messages:       ChatMessage[];
}
