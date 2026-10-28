from typing import Any, Dict, List, Optional
from pydantic import BaseModel
from .embedding_service import EmbeddingService, embedding_service
from .ai_provider import AiProvider, ChatMessage, ChatOptions
from .ai_factory import get_ai_provider


class Citation(BaseModel):
    documentId: str
    documentName: str
    page: Optional[int] = None
    chunkIndex: Optional[int] = None
    snippet: str


class RagResult(BaseModel):
    answer: str
    model: str
    citations: List[Citation]
    usage: Optional[Dict[str, Any]] = None
    evidenceFound: bool


class RagService:
    def __init__(
        self,
        emb_service: Optional[EmbeddingService] = None,
        adapter: Optional[AiProvider] = None,
    ):
        self._embedding_service = emb_service
        self._adapter = adapter

    @property
    def embedding_service(self) -> EmbeddingService:
        if self._embedding_service is None:
            self._embedding_service = embedding_service
        return self._embedding_service

    @property
    def adapter(self) -> AiProvider:
        if self._adapter is None:
            self._adapter = get_ai_provider()
        return self._adapter

    async def answer_question(
        self,
        workspace_id: str,
        question: str,
        top_k: int = 5,
        threshold: float = 0.3,
        model: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: Optional[int] = None,
    ) -> RagResult:
        chunks = await self.embedding_service.search(
            workspace_id, question, top_k=top_k, threshold=threshold
        )

        if not chunks:
            return RagResult(
                answer="I couldn't find any relevant information in your uploaded documents to answer this question.",
                model=model or "none",
                citations=[],
                evidenceFound=False,
            )

        context_blocks = []
        for i, c in enumerate(chunks, 1):
            snippet = c["content"][:300].strip()
            context_blocks.append(
                f"[Source {i}: {c['document_name']} (Chunk {c['chunk_index']})]\n{snippet}"
            )
        combined_context = "\n\n".join(context_blocks)

        system_prompt = (
            "You are a helpful business assistant. Answer the user's question using ONLY the provided document sources.\n"
            "If the provided context does not contain enough information to answer truthfully, state that clearly.\n"
            "Do NOT invent or extrapolate facts not present in the sources.\n"
            "Cite sources in brackets when referencing them, e.g. [Source 1].\n\n"
            f"=== DOCUMENT SOURCES ===\n{combined_context}\n=== END SOURCES ==="
        )

        messages = [
            ChatMessage(role="system", content=system_prompt),
            ChatMessage(role="user", content=question),
        ]

        chat_opts = ChatOptions(
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
        )

        chat_result = await self.adapter.chat(messages, chat_opts)

        citations = [
            Citation(
                documentId=c["document_id"],
                documentName=c["document_name"],
                page=c.get("page"),
                chunkIndex=c.get("chunk_index"),
                snippet=c["content"][:200],
            )
            for c in chunks
        ]

        return RagResult(
            answer=chat_result.content,
            model=chat_result.model,
            citations=citations,
            usage=chat_result.usage,
            evidenceFound=True,
        )


rag_service = RagService()
