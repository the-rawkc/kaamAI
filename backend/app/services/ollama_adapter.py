from typing import Any, Dict, List, Optional
import httpx
from .ai_provider import AiProvider, ChatMessage, ChatOptions, ChatResult, ProviderHealth
from ..config import (
    OLLAMA_BASE_URL,
    OLLAMA_CHAT_MODEL,
    OLLAMA_EMBEDDING_MODEL,
    OLLAMA_TIMEOUT_MS,
)


class OllamaAdapter(AiProvider):
    def __init__(
        self,
        base_url: Optional[str] = None,
        chat_model: Optional[str] = None,
        embedding_model: Optional[str] = None,
        timeout_ms: Optional[int] = None,
    ):
        self.base_url = (base_url or OLLAMA_BASE_URL).rstrip("/")
        self.chat_model = chat_model or OLLAMA_CHAT_MODEL
        self.embedding_model = embedding_model or OLLAMA_EMBEDDING_MODEL
        self.timeout_sec = (timeout_ms or OLLAMA_TIMEOUT_MS) / 1000.0

    @property
    def name(self) -> str:
        return "ollama"

    async def health(self) -> ProviderHealth:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                if res.status_code != 200:
                    return ProviderHealth(
                        name=self.name,
                        status="unavailable",
                        configured=True,
                        detail=f"Ollama returned status {res.status_code}",
                    )
                models = res.json().get("models", [])
                model_names = [m.get("name", "") for m in models]
                has_model = any(
                    name.startswith(self.chat_model) for name in model_names
                )
                if not has_model:
                    return ProviderHealth(
                        name=self.name,
                        status="misconfigured",
                        configured=True,
                        detail=f'Model "{self.chat_model}" not found in local Ollama instance.',
                    )
                return ProviderHealth(
                    name=self.name,
                    status="ok",
                    configured=True,
                    detail=f'Model "{self.chat_model}" is available locally.',
                )
        except Exception as err:
            return ProviderHealth(
                name=self.name,
                status="unavailable",
                configured=True,
                detail=f"Cannot reach Ollama at {self.base_url}: {err}",
            )

    async def chat(
        self, messages: List[ChatMessage], options: Optional[ChatOptions] = None
    ) -> ChatResult:
        model = (options.model if options and options.model else None) or self.chat_model
        if not model:
            raise ValueError("No Ollama chat model configured.")

        timeout = (
            (options.timeout_ms / 1000.0)
            if options and options.timeout_ms
            else self.timeout_sec
        )
        temperature = options.temperature if options and options.temperature is not None else 0.7

        payload: Dict[str, Any] = {
            "model": model,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "stream": False,
            "options": {"temperature": temperature},
        }
        if options and options.max_tokens:
            payload["options"]["num_predict"] = options.max_tokens

        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                res = await client.post(f"{self.base_url}/api/chat", json=payload)
                if res.status_code != 200:
                    raise RuntimeError(
                        f"Ollama chat failed ({res.status_code}): {res.text}"
                    )
                body = res.json()
                msg = body.get("message", {})
                return ChatResult(
                    content=msg.get("content", ""),
                    model=body.get("model", model),
                    usage={
                        "prompt_tokens": body.get("prompt_eval_count"),
                        "completion_tokens": body.get("eval_count"),
                        "total_tokens": (body.get("prompt_eval_count") or 0)
                        + (body.get("eval_count") or 0),
                    },
                )
        except httpx.TimeoutException as err:
            raise RuntimeError(f"Ollama request timed out after {timeout}s.") from err

    async def embed(self, text: str) -> List[float]:
        model = self.embedding_model
        if not model:
            raise ValueError("No Ollama embedding model configured.")

        try:
            async with httpx.AsyncClient(timeout=self.timeout_sec) as client:
                res = await client.post(
                    f"{self.base_url}/api/embeddings",
                    json={"model": model, "prompt": text},
                )
                if res.status_code != 200:
                    raise RuntimeError(
                        f"Ollama embeddings failed ({res.status_code}): {res.text}"
                    )
                body = res.json()
                return body.get("embedding", [])
        except httpx.TimeoutException as err:
            raise RuntimeError(
                f"Ollama embedding request timed out after {self.timeout_sec}s."
            ) from err
