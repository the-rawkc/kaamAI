import { AiProvider, ChatMessage, ChatOptions, ChatResult, ProviderHealth } from "./ai-provider.js";

export interface GeminiConfig {
  apiKey: string;
  chatModel: string;
  embeddingModel: string;
  timeoutMs: number;
}

export class GeminiAdapter extends AiProvider {
  readonly name = "gemini";
  private config: GeminiConfig;

  constructor(config: Partial<GeminiConfig> = {}) {
    super();
    this.config = {
      apiKey: config.apiKey ?? process.env.GEMINI_API_KEY ?? "",
      chatModel: config.chatModel ?? process.env.GEMINI_CHAT_MODEL ?? "gemini-2.5-flash",
      embeddingModel:
        config.embeddingModel ?? process.env.GEMINI_EMBEDDING_MODEL ?? "text-embedding-004",
      timeoutMs: config.timeoutMs ?? Number(process.env.GEMINI_TIMEOUT_MS ?? 60000),
    };
  }

  async health(): Promise<ProviderHealth> {
    if (!this.config.apiKey) {
      return {
        name: this.name,
        status: "misconfigured",
        configured: false,
        detail: "GEMINI_API_KEY is not set in environment.",
      };
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${this.config.apiKey}`,
        { signal: controller.signal },
      );
      clearTimeout(timeout);

      if (!response.ok) {
        return {
          name: this.name,
          status: "misconfigured",
          configured: true,
          detail: `Gemini API rejected key with status ${response.status}: ${response.statusText}`,
        };
      }

      return {
        name: this.name,
        status: "ok",
        configured: true,
        detail: `Gemini API key is valid. Model: ${this.config.chatModel}`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error.";
      return {
        name: this.name,
        status: "unavailable",
        configured: true,
        detail: `Cannot reach Gemini API: ${message}`,
      };
    }
  }

  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<ChatResult> {
    const apiKey = this.config.apiKey;
    if (!apiKey) {
      throw new Error("No Gemini API key configured. Set GEMINI_API_KEY in .env.");
    }

    const model = options.model ?? this.config.chatModel;
    const timeoutMs = options.timeoutMs ?? this.config.timeoutMs;

    // Separate system messages from conversational turns
    const systemParts: Array<{ text: string }> = [];
    const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];

    for (const msg of messages) {
      if (msg.role === "system") {
        systemParts.push({ text: msg.content });
      } else {
        const geminiRole = msg.role === "assistant" ? "model" : "user";
        const last = contents[contents.length - 1];
        if (last && last.role === geminiRole) {
          last.parts[0].text += `\n\n${msg.content}`;
        } else {
          contents.push({
            role: geminiRole,
            parts: [{ text: msg.content }],
          });
        }
      }
    }

    // Gemini requires the conversation to begin with a user turn if turns exist
    if (contents.length > 0 && contents[0].role === "model") {
      contents.unshift({ role: "user", parts: [{ text: "Hello" }] });
    }

    // If only system messages were provided, provide an empty user turn to avoid 400
    if (contents.length === 0) {
      contents.push({ role: "user", parts: [{ text: "Continue" }] });
    }

    const payload: {
      contents: typeof contents;
      systemInstruction?: { parts: typeof systemParts };
      generationConfig: { temperature: number; maxOutputTokens?: number };
    } = {
      contents,
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        ...(options.maxTokens ? { maxOutputTokens: options.maxTokens } : {}),
      },
    };

    if (systemParts.length > 0) {
      payload.systemInstruction = { parts: systemParts };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        },
      );
      clearTimeout(timeout);

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        throw new Error(
          `Gemini chat failed (${response.status}): ${errorBody || response.statusText}`,
        );
      }

      const body = (await response.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{ text?: string }>;
          };
        }>;
        usageMetadata?: {
          promptTokenCount?: number;
          candidatesTokenCount?: number;
          totalTokenCount?: number;
        };
      };

      const candidateText =
        body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";

      return {
        content: candidateText,
        model,
        usage: {
          prompt_tokens: body.usageMetadata?.promptTokenCount,
          completion_tokens: body.usageMetadata?.candidatesTokenCount,
          total_tokens: body.usageMetadata?.totalTokenCount,
        },
      };
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Gemini request timed out after ${timeoutMs} ms.`, { cause: error });
      }
      throw error;
    }
  }

  async embed(text: string): Promise<number[]> {
    const apiKey = this.config.apiKey;
    if (!apiKey) {
      throw new Error("No Gemini API key configured. Set GEMINI_API_KEY in .env.");
    }

    const model = this.config.embeddingModel;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: `models/${model}`,
            content: {
              parts: [{ text }],
            },
          }),
          signal: controller.signal,
        },
      );
      clearTimeout(timeout);

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        throw new Error(
          `Gemini embed failed (${response.status}): ${errorBody || response.statusText}`,
        );
      }

      const body = (await response.json()) as {
        embedding?: {
          values?: number[];
        };
      };

      return body.embedding?.values ?? [];
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Gemini embedding timed out after ${this.config.timeoutMs} ms.`, {
          cause: error,
        });
      }
      throw error;
    }
  }
}
