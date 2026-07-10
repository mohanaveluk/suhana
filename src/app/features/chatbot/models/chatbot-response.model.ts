import { ChatAction, FeedbackType } from './chatbot-message.model';

export interface ChatbotSendRequest {
  message:        string;
  sessionId:      string;
  conversationId: string;
}

export interface ChatbotApiResponse {
  messageId:      string;
  answer:         string;
  source:         string;
  confidence:     number;
  suggestions:    string[];
  tokensUsed:     number;
  responseTimeMs: number;
  // optional extended fields (kept for forward-compat)
  type?:          'text' | 'html' | 'faq' | 'action';
  actions?:       ChatAction[];
}

export interface ChatbotSessionResponse {
  sessionId:      string;
  conversationId: string;
}

export interface ChatbotFeedbackRequest {
  messageId:      string;
  sessionId:      string;
  conversationId: string;
  feedback:       FeedbackType;
}
