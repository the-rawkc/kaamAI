import os
from typing import List, Optional
from .ai_provider import AiProvider, ProviderHealth
from .ollama_adapter import OllamaAdapter
from .gemini_adapter import GeminiAdapter
from ..config import AI_PROVIDER, GEMINI_API_KEY

_cached_provider: Optional[AiProvider] = None


def get_ai_provider() -> AiProvider:
    global _cached_provider
    if _cached_provider is not None:
        return _cached_provider

    provider = os.getenv("AI_PROVIDER", AI_PROVIDER).strip().lower()
    gemini_key = os.getenv("GEMINI_API_KEY", GEMINI_API_KEY).strip()

    if provider == "gemini":
        _cached_provider = GeminiAdapter()
        return _cached_provider

    if provider == "ollama":
        _cached_provider = OllamaAdapter()
        return _cached_provider

    if gemini_key:
        _cached_provider = GeminiAdapter()
        return _cached_provider

    _cached_provider = OllamaAdapter()
    return _cached_provider


def set_ai_provider(provider: Optional[AiProvider]) -> None:
    global _cached_provider
    _cached_provider = provider


async def get_all_providers_health() -> List[ProviderHealth]:
    providers: List[ProviderHealth] = []
    ollama = OllamaAdapter()
    providers.append(await ollama.health())

    gemini_key = os.getenv("GEMINI_API_KEY", GEMINI_API_KEY).strip()
    if gemini_key or os.getenv("AI_PROVIDER") == "gemini":
        gemini = GeminiAdapter()
        providers.append(await gemini.health())

    return providers
