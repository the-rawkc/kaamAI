from typing import Any, Dict, List, Optional
import httpx
from .ai_provider import AiProvider, ChatMessage, ChatOptions, ChatResult, ProviderHealth
from ..config import (
    GEMINI_API_KEY,
    GEMINI_CHAT_MODEL,
    GEMINI_EMBEDDING_MODEL,
    GEMINI_TIMEOUT_MS,
)


class GeminiAdapter(AiProvider):
    def __init__(
        self,
        api_key: Optional[str] = None,
        chat_model: Optional[str] = None,
        embedding_model: Optional[str] = None,
        timeout_ms: Optional[int] = None,
    ):
        self.api_key = api_key if api_key is not None else GEMINI_API_KEY
        self.chat_model = chat_model or GEMINI_CHAT_MODEL
        self.embedding_model = embedding_model or GEMINI_EMBEDDING_MODEL
        self.timeout_sec = (timeout_ms or GEMINI_TIMEOUT_MS) / 1000.0

    @property
    def name(self) -> str:
        return "gemini"

    async def health(self) -> ProviderHealth:
        if not self.api_key:
            return ProviderHealth(
                name=self.name,
                status="misconfigured",
                configured=False,
                detail="GEMINI_API_KEY is not set in environment.",
            )
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models?key={self.api_key}"
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(url)
                if res.status_code != 200:
                    return ProviderHealth(
                        name=self.name,
                        status="misconfigured",
                        configured=True,
                        detail=f"Gemini API rejected key with status {res.status_code}: {res.text}",
                    )
                return ProviderHealth(
                    name=self.name,
                    status="ok",
                    configured=True,
                    detail=f"Gemini API key is valid. Model: {self.chat_model}",
                )
        except Exception as err:
            return ProviderHealth(
                name=self.name,
                status="unavailable",
                configured=True,
                detail=f"Cannot reach Gemini API: {err}",
            )

    async def chat(
        self, messages: List[ChatMessage], options: Optional[ChatOptions] = None
    ) -> ChatResult:
        if not self.api_key:
            raise ValueError("No Gemini API key configured. Set GEMINI_API_KEY.")

        model = (options.model if options and options.model else None) or self.chat_model
        timeout = (
            (options.timeout_ms / 1000.0)
            if options and options.timeout_ms
            else self.timeout_sec
        )

        system_parts = []
        contents = []

        for msg in messages:
            if msg.role == "system":
                system_parts.append({"text": msg.content})
            else:
                gemini_role = "model" if msg.role == "assistant" else "user"
                if contents and contents[-1]["role"] == gemini_role:
                    contents[-1]["parts"][0]["text"] += f"\n\n{msg.content}"
                else:
                    contents.append(
                        {"role": gemini_role, "parts": [{"text": msg.content}]}
                    )

        if contents and contents[0]["role"] == "model":
            contents.insert(0, {"role": "user", "parts": [{"text": "Hello"}]})
        if not contents:
            contents.append({"role": "user", "parts": [{"text": "Continue"}]})

        gen_config: Dict[str, Any] = {
            "temperature": options.temperature if options and options.temperature is not None else 0.7
        }
        if options and options.max_tokens:
            gen_config["maxOutputTokens"] = options.max_tokens

        payload: Dict[str, Any] = {
            "contents": contents,
            "generationConfig": gen_config,
        }
        if system_parts:
            payload["systemInstruction"] = {"parts": system_parts}

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={self.api_key}"
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                res = await client.post(url, json=payload)
                if res.status_code != 200:
                    raise RuntimeError(
                        f"Gemini chat failed ({res.status_code}): {res.text}"
                    )
                body = res.json()
                candidates = body.get("candidates", [])
                content_text = ""
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    content_text = "".join(p.get("text", "") for p in parts)
                usage_meta = body.get("usageMetadata", {})
                return ChatResult(
                    content=content_text,
                    model=model,
                    usage={
                        "prompt_tokens": usage_meta.get("promptTokenCount"),
                        "completion_tokens": usage_meta.get("candidatesTokenCount"),
                        "total_tokens": usage_meta.get("totalTokenCount"),
                    },
                )
        except httpx.TimeoutException as err:
            raise RuntimeError(f"Gemini request timed out after {timeout}s.") from err

    async def embed(self, text: str) -> List[float]:
        if not self.api_key:
            raise ValueError("No Gemini API key configured. Set GEMINI_API_KEY.")

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.embedding_model}:embedContent?key={self.api_key}"
        payload = {
            "model": f"models/{self.embedding_model}",
            "content": {"parts": [{"text": text}]},
        }
        try:
            async with httpx.AsyncClient(timeout=self.timeout_sec) as client:
                res = await client.post(url, json=payload)
                if res.status_code != 200:
                    raise RuntimeError(
                        f"Gemini embed failed ({res.status_code}): {res.text}"
                    )
                body = res.json()
                return body.get("embedding", {}).get("values", [])
        except httpx.TimeoutException as err:
            raise RuntimeError(
                f"Gemini embedding timed out after {self.timeout_sec}s."
            ) from err
