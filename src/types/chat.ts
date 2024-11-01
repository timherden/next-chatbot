// src/types/chat.ts
export interface Message {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}
  
  export interface ChatState {
    messages: Message[];
    isLoading: boolean;
  }