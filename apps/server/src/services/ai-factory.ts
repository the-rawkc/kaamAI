import { AiProvider, ProviderHealth } from "./ai-provider.js";
import { OllamaAdapter } from "./ollama-adapter.js";
import { GeminiAdapter } from "./gemini-adapter.js";

let cachedProvider: AiProvider | null = null;

/**
 * Returns the active AI provider based on environment configuration:
 * 1. AI_PROVIDER === 'gemini' => GeminiAdapter (uses free GEMINI_API_KEY)
 * 2. AI_PROVIDER === 'ollama' => OllamaAdapter (local inference via Ollama)
 * 3. Default fallback:
 *    - If GEMINI_API_KEY is defined and AI_PROVIDER is not explicitly 'ollama' => GeminiAdapter
 *    - Otherwise => OllamaAdapter
 */
export function getAiProvider(): AiProvider {
  if (cachedProvider) {
    return cachedProvider;
  }

  const explicitProvider = process.env.AI_PROVIDER?.trim().toLowerCase();

  if (explicitProvider === "gemini") {
    cachedProvider = new GeminiAdapter();
    return cachedProvider;
  }

  if (explicitProvider === "ollama") {
    cachedProvider = new OllamaAdapter();
    return cachedProvider;
  }

  // Automatic detection
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== "") {
    cachedProvider = new GeminiAdapter();
    return cachedProvider;
  }

  cachedProvider = new OllamaAdapter();
  return cachedProvider;
}

export function setAiProvider(provider: AiProvider | null): void {
  cachedProvider = provider;
}

export async function getAllProvidersHealth(): Promise<ProviderHealth[]> {
  const providers: ProviderHealth[] = [];

  const ollama = new OllamaAdapter();
  providers.push(await ollama.health());

  if (process.env.GEMINI_API_KEY || process.env.AI_PROVIDER === "gemini") {
    const gemini = new GeminiAdapter();
    providers.push(await gemini.health());
  }

  return providers;
}
