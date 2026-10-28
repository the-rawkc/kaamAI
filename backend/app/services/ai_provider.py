from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class ChatMessage(BaseModel):
    role: str  # "system", "user", or "assistant"
    content: str


class ChatOptions(BaseModel):
    model: Optional[str] = None
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = None
    timeout_ms: Optional[int] = None


class ChatResult(BaseModel):
    content: str
    model: str
    usage: Optional[Dict[str, Any]] = None


class ProviderHealth(BaseModel):
    name: str
    status: str  # "ok", "unavailable", "misconfigured"
    configured: bool
    detail: Optional[str] = None


class AiProvider(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @abstractmethod
    async def health(self) -> ProviderHealth:
        pass

    @abstractmethod
    async def chat(
        self, messages: List[ChatMessage], options: Optional[ChatOptions] = None
    ) -> ChatResult:
        pass

    @abstractmethod
    async def embed(self, text: str) -> List[float]:
        pass
