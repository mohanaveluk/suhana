export type MessageType  = 'text' | 'html' | 'faq' | 'action';
export type MessageRole  = 'user' | 'bot';
export type FeedbackType = 'helpful' | 'not-helpful';

export interface ChatAction {
  label: string;
  url?: string;
}

export interface ChatMessage {
  id:           string;
  role:         MessageRole;
  text:         string;
  type:         MessageType;
  timestamp:    Date;
  actions?:     ChatAction[];
  suggestions?: string[];
  feedback?:    FeedbackType | null;
}
