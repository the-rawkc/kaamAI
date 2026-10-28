import json
import math
import re
import uuid
from typing import Any, Dict, List, Optional
from ..db.connection import query, execute
from .ai_provider import AiProvider
from .ai_factory import get_ai_provider


def cosine_similarity(a: List[float], b: List[float]) -> float:
    if len(a) != len(b) or len(a) == 0:
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


class EmbeddingService:
    def __init__(self, adapter: Optional[AiProvider] = None):
        self._adapter = adapter
        self._has_pgvector: Optional[bool] = None

    @property
    def adapter(self) -> AiProvider:
        if self._adapter is None:
            self._adapter = get_ai_provider()
        return self._adapter

    def check_pgvector(self) -> bool:
        if self._has_pgvector is not None:
            return self._has_pgvector
        try:
            res = query("SELECT 1 FROM pg_type WHERE typname = 'vector'")
            self._has_pgvector = len(res) > 0
        except Exception:
            self._has_pgvector = False
        return self._has_pgvector

    async def embed(self, text: str) -> List[float]:
        return await self.adapter.embed(text)

    def chunk_text(
        self, text: str, target_tokens: int = 600, overlap_tokens: int = 100
    ) -> List[str]:
        if not text or not text.strip():
            return []

        paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
        chunks: List[str] = []
        current_chunk = ""

        for p in paragraphs:
            candidate = f"{current_chunk}\n\n{p}" if current_chunk else p
            est_tokens = len(candidate) // 4
            if est_tokens <= target_tokens or not current_chunk:
                current_chunk = candidate
            else:
                chunks.append(current_chunk)
                overlap_chars = overlap_tokens * 4
                overlap = (
                    current_chunk[-overlap_chars:]
                    if len(current_chunk) > overlap_chars
                    else current_chunk
                )
                current_chunk = f"{overlap}\n\n{p}"

        if current_chunk:
            chunks.append(current_chunk)
        return chunks

    async def index_document(self, document_id: str) -> int:
        docs = query(
            "SELECT id, workspace_id, original_filename, extracted_text FROM documents WHERE id = %s",
            (document_id,),
        )
        if not docs:
            raise ValueError(f"Document {document_id} not found.")
        doc = docs[0]
        text = doc.get("extracted_text") or ""
        if not text.strip():
            return 0

        chunks = self.chunk_text(text)
        if not chunks:
            return 0

        execute("DELETE FROM document_chunks WHERE document_id = %s", (document_id,))

        has_pgvector = self.check_pgvector()
        for idx, chunk_content in enumerate(chunks):
            embedding = await self.embed(chunk_content)
            chunk_id = str(uuid.uuid4())
            if has_pgvector:
                # Format vector as [0.1, 0.2, ...]
                vec_str = f"[{','.join(str(x) for x in embedding)}]"
                query(
                    """
                    INSERT INTO document_chunks (id, document_id, workspace_id, chunk_index, content, embedding, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s::vector, now())
                    """,
                    (
                        chunk_id,
                        document_id,
                        str(doc["workspace_id"]),
                        idx,
                        chunk_content,
                        vec_str,
                    ),
                )
            else:
                query(
                    """
                    INSERT INTO document_chunks (id, document_id, workspace_id, chunk_index, content, embedding, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s::jsonb, now())
                    """,
                    (
                        chunk_id,
                        document_id,
                        str(doc["workspace_id"]),
                        idx,
                        chunk_content,
                        json.dumps(embedding),
                    ),
                )

        execute(
            "UPDATE documents SET status = 'indexed', updated_at = now() WHERE id = %s",
            (document_id,),
        )
        return len(chunks)

    async def search(
        self,
        workspace_id: str,
        query_text: str,
        top_k: int = 5,
        threshold: float = 0.3,
    ) -> List[Dict[str, Any]]:
        query_vec = await self.embed(query_text)
        has_pgvector = self.check_pgvector()

        if has_pgvector:
            vec_str = f"[{','.join(str(x) for x in query_vec)}]"
            sql = """
                SELECT c.id as chunk_id, c.document_id, c.workspace_id, c.content, c.chunk_index,
                       c.page, d.original_filename as document_name,
                       1 - (c.embedding <=> %s::vector) as similarity
                FROM document_chunks c
                JOIN documents d ON d.id = c.document_id
                WHERE c.workspace_id = %s
                  AND (1 - (c.embedding <=> %s::vector)) >= %s
                ORDER BY similarity DESC
                LIMIT %s
            """
            rows = query(sql, (vec_str, workspace_id, vec_str, threshold, top_k))
            return [
                {
                    "chunk_id": str(r["chunk_id"]),
                    "document_id": str(r["document_id"]),
                    "workspace_id": str(r["workspace_id"]),
                    "content": r["content"],
                    "chunk_index": r["chunk_index"],
                    "page": r.get("page"),
                    "similarity": round(float(r["similarity"]), 4),
                    "document_name": r["document_name"],
                }
                for r in rows
            ]
        else:
            sql = """
                SELECT c.id as chunk_id, c.document_id, c.workspace_id, c.content, c.chunk_index,
                       c.page, c.embedding, d.original_filename as document_name
                FROM document_chunks c
                JOIN documents d ON d.id = c.document_id
                WHERE c.workspace_id = %s
            """
            rows = query(sql, (workspace_id,))
            results = []
            for r in rows:
                raw_emb = r.get("embedding")
                emb = (
                    json.loads(raw_emb)
                    if isinstance(raw_emb, str)
                    else (raw_emb or [])
                )
                sim = cosine_similarity(query_vec, emb)
                if sim >= threshold:
                    results.append(
                        {
                            "chunk_id": str(r["chunk_id"]),
                            "document_id": str(r["document_id"]),
                            "workspace_id": str(r["workspace_id"]),
                            "content": r["content"],
                            "chunk_index": r["chunk_index"],
                            "page": r.get("page"),
                            "similarity": round(sim, 4),
                            "document_name": r["document_name"],
                        }
                    )
            results.sort(key=lambda x: x["similarity"], reverse=True)
            return results[:top_k]


embedding_service = EmbeddingService()
