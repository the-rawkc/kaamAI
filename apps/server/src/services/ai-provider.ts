export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export interface ChatResult {
  content: string;
  model: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

export interface ProviderHealth {
  name: string;
  status: "ok" | "unavailable" | "misconfigured";
  configured: boolean;
  detail?: string;
}

/**
 * Abstract AI provider interface. Concrete providers implement chat completion,
 * embeddings, and health checking.
 */
export abstract class AiProvider {
  abstract name: string;
  abstract health(): Promise<ProviderHealth>;
  abstract chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResult>;
  abstract embed(text: string): Promise<number[]>;
}
