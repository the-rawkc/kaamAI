import { AiProvider, ChatMessage, ChatOptions, ChatResult, ProviderHealth } from "./ai-provider.js";

export interface OllamaConfig {
  baseUrl: string;
  chatModel: string;
  embeddingModel: string;
  timeoutMs: number;
}

export class OllamaAdapter extends AiProvider {
  readonly name = "ollama";
  private config: OllamaConfig;

  constructor(config: Partial<OllamaConfig> = {}) {
    super();
    this.config = {
      baseUrl: config.baseUrl ?? process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
      chatModel: config.chatModel ?? (process.env.OLLAMA_CHAT_MODEL || "llama3.2"),
      embeddingModel:
        config.embeddingModel ?? process.env.OLLAMA_EMBEDDING_MODEL ?? "embeddinggemma",
      timeoutMs: config.timeoutMs ?? Number(process.env.OLLAMA_TIMEOUT_MS ?? 60000),
    };
  }

  async health(): Promise<ProviderHealth> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        return {
          name: this.name,
          status: "unavailable",
          configured: true,
          detail: `Ollama responded with status ${response.status}`,
        };
      }

      const body = (await response.json()) as { models?: Array<{ name: string }> };
      const modelNames = (body.models ?? []).map((m) => m.name);
      const hasChatModel = this.config.chatModel
        ? modelNames.some((n) => n.startsWith(this.config.chatModel!))
        : false;

      if (!this.config.chatModel) {
        return {
          name: this.name,
          status: "misconfigured",
          configured: false,
          detail: "OLLAMA_CHAT_MODEL is not set in environment.",
        };
      }

      if (!hasChatModel) {
        return {
          name: this.name,
          status: "misconfigured",
          configured: true,
          detail: `Configured model "${this.config.chatModel}" not found. Available: ${modelNames.join(", ") || "none"}`,
        };
      }

      return {
        name: this.name,
        status: "ok",
        configured: true,
        detail: `Model "${this.config.chatModel}" is available.`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error.";
      return {
        name: this.name,
        status: "unavailable",
        configured: !!this.config.chatModel,
        detail: `Cannot reach Ollama at ${this.config.baseUrl}: ${message}`,
      };
    }
  }

  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<ChatResult> {
    const model = options.model ?? this.config.chatModel;
    if (!model) {
      throw new Error("No Ollama chat model configured. Set OLLAMA_CHAT_MODEL in .env.");
    }

    const timeoutMs = options.timeoutMs ?? this.config.timeoutMs;

    const payload = {
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: false,
      options: {
        temperature: options.temperature ?? 0.7,
        num_predict: options.maxTokens,
      },
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${this.config.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        throw new Error(
          `Ollama chat failed (${response.status}): ${errorBody || response.statusText}`,
        );
      }

      const body = (await response.json()) as {
        message?: { content: string };
        model?: string;
        prompt_eval_count?: number;
        eval_count?: number;
        total_duration?: number;
      };

      return {
        content: body.message?.content ?? "",
        model: body.model ?? model,
        usage: {
          prompt_tokens: body.prompt_eval_count,
          completion_tokens: body.eval_count,
          total_tokens: (body.prompt_eval_count ?? 0) + (body.eval_count ?? 0),
        },
      };
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new Error(`Ollama request timed out after ${timeoutMs} ms.`, { cause: error });
        }
        throw error;
      }
      throw new Error("Unknown Ollama chat error.", { cause: error });
    }
  }

  async embed(text: string): Promise<number[]> {
    const model = this.config.embeddingModel;
    if (!model) {
      throw new Error("No Ollama embedding model configured. Set OLLAMA_EMBEDDING_MODEL in .env.");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(`${this.config.baseUrl}/api/embeddings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, prompt: text }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        throw new Error(
          `Ollama embeddings failed (${response.status}): ${errorBody || response.statusText}`,
        );
      }

      const body = (await response.json()) as { embedding?: number[] };
      return body.embedding ?? [];
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Ollama embeddings request timed out after ${this.config.timeoutMs} ms.`, {
          cause: error,
        });
      }
      throw error;
    }
  }
}
