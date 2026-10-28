import { AiProvider } from "./ai-provider.js";
import { getAiProvider } from "./ai-factory.js";
import { query } from "../db/connection.js";

export interface ChunkInput {
  documentId: string;
  workspaceId: string;
  chunkIndex: number;
  content: string;
  embedding: number[];
  page?: number;
}

export interface ChunkRecord {
  id: string;
  document_id: string;
  workspace_id: string;
  chunk_index: number;
  content: string;
  embedding: number[];
  page: number | null;
  created_at: Date;
}

export interface SearchResult {
  chunk_id: string;
  document_id: string;
  workspace_id: string;
  content: string;
  chunk_index: number;
  page: number | null;
  similarity: number;
  document_name: string;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

export class EmbeddingService {
  private adapter: AiProvider;
  private hasPgVector: boolean | null = null;

  constructor(adapter?: AiProvider) {
    this.adapter = adapter ?? getAiProvider();
  }

  private async checkPgVector(): Promise<boolean> {
    if (this.hasPgVector !== null) return this.hasPgVector;
    try {
      const res = await query(`SELECT 1 FROM pg_type WHERE typname = 'vector'`);
      this.hasPgVector = (res as { rows: unknown[] }).rows.length > 0;
    } catch {
      this.hasPgVector = false;
    }
    return this.hasPgVector;
  }

  /**
   * Generate an embedding for a single text string using Ollama.
   */
  async embed(text: string): Promise<number[]> {
    return this.adapter.embed(text);
  }

  /**
   * Chunk text by paragraphs/headings with target size and overlap.
   * Preserves page/source location hints where present.
   */
  chunkText(
    text: string,
    {
      targetTokens = 600,
      overlapTokens = 100,
    }: { targetTokens?: number; overlapTokens?: number } = {},
  ): string[] {
    if (!text || text.trim().length === 0) {
      return [];
    }

    // Split by paragraphs first (double newlines)
    const paragraphs = text
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);

    const chunks: string[] = [];
    let currentChunk = "";

    for (const paragraph of paragraphs) {
      const candidate = currentChunk ? `${currentChunk}\n\n${paragraph}` : paragraph;

      // Rough token estimate: ~4 chars per token
      if (this.estimateTokens(candidate) > targetTokens && currentChunk.length > 0) {
        chunks.push(currentChunk);
        // Start new chunk with overlap from the end of previous
        const overlap = this.takeLastNChars(currentChunk, overlapTokens * 4);
        currentChunk = overlap ? `${overlap}\n\n${paragraph}` : paragraph;
      } else {
        currentChunk = candidate;
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private takeLastNChars(text: string, n: number): string {
    if (n <= 0) return "";
    return text.slice(Math.max(0, text.length - n));
  }

  /**
   * Index a document: clear existing chunks, generate embeddings for each chunk,
   * and insert them into the document_chunks table.
   */
  async indexDocument(documentId: string): Promise<void> {
    const { findDocumentById } = await import("../models/document.js");

    const document = await findDocumentById(documentId);
    if (!document) {
      throw new Error(`Document ${documentId} not found.`);
    }

    if (!document.extracted_text) {
      throw new Error(`Document ${documentId} has no extracted text to index.`);
    }

    // Delete existing chunks for this document (idempotent reindex)
    await query(`DELETE FROM document_chunks WHERE document_id = $1`, [documentId]);

    const chunks = this.chunkText(document.extracted_text);

    for (let i = 0; i < chunks.length; i++) {
      const content = chunks[i];
      const embedding = await this.embed(content);

      await query(
        `INSERT INTO document_chunks (document_id, workspace_id, chunk_index, content, embedding, page)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [documentId, document.workspace_id, i, content, JSON.stringify(embedding), null],
      );
    }
  }

  /**
   * Re-index a document (alias for indexDocument for API clarity).
   */
  async reindexDocument(documentId: string): Promise<void> {
    await this.indexDocument(documentId);
  }

  /**
   * Delete all chunks for a document.
   */
  async deleteDocumentChunks(documentId: string): Promise<void> {
    await query(`DELETE FROM document_chunks WHERE document_id = $1`, [documentId]);
  }

  /**
   * Semantic search: embed the query, compute cosine similarity against all
   * chunks in the same workspace, return top-k results.
   */
  async search(
    workspaceId: string,
    queryText: string,
    { topK = 5, threshold = 0.3 }: { topK?: number; threshold?: number } = {},
  ): Promise<SearchResult[]> {
    const queryEmbedding = await this.embed(queryText);
    const usePgVector = await this.checkPgVector();

    if (usePgVector) {
      const result = await query(
        `SELECT
           c.id AS chunk_id,
           c.document_id,
           c.workspace_id,
           c.chunk_index,
           c.content,
           c.page,
           c.embedding,
           d.original_filename AS document_name,
           (c.embedding <=> $2::vector) AS distance
         FROM document_chunks c
         JOIN documents d ON d.id = c.document_id
         WHERE c.workspace_id = $1
         ORDER BY distance ASC
         LIMIT $3`,
        [workspaceId, JSON.stringify(queryEmbedding), topK],
      );

      const rows = (result as { rows: SearchResultRaw[] }).rows;

      return rows
        .map((row) => {
          const similarity = 1 - (row.distance ?? 1);
          return {
            chunk_id: row.chunk_id,
            document_id: row.document_id,
            workspace_id: row.workspace_id,
            content: row.content,
            chunk_index: row.chunk_index,
            page: row.page,
            similarity,
            document_name: row.document_name,
          };
        })
        .filter((r) => r.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity);
    }

    // Fallback path when pgvector is not natively installed in PostgreSQL
    const result = await query(
      `SELECT
         c.id AS chunk_id,
         c.document_id,
         c.workspace_id,
         c.chunk_index,
         c.content,
         c.page,
         c.embedding,
         d.original_filename AS document_name
       FROM document_chunks c
       JOIN documents d ON d.id = c.document_id
       WHERE c.workspace_id = $1`,
      [workspaceId],
    );

    const rows = (
      result as {
        rows: Array<{
          chunk_id: string;
          document_id: string;
          workspace_id: string;
          chunk_index: number;
          content: string;
          page: number | null;
          embedding: string | number[];
          document_name: string;
        }>;
      }
    ).rows;

    return rows
      .map((row) => {
        let chunkEmbedding: number[] = [];
        if (Array.isArray(row.embedding)) {
          chunkEmbedding = row.embedding;
        } else if (typeof row.embedding === "string") {
          try {
            chunkEmbedding = JSON.parse(row.embedding);
          } catch {
            chunkEmbedding = [];
          }
        }
        const similarity = cosineSimilarity(queryEmbedding, chunkEmbedding);
        return {
          chunk_id: row.chunk_id,
          document_id: row.document_id,
          workspace_id: row.workspace_id,
          content: row.content,
          chunk_index: row.chunk_index,
          page: row.page,
          similarity,
          document_name: row.document_name,
        };
      })
      .filter((r) => r.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }
}

interface SearchResultRaw {
  chunk_id: string;
  document_id: string;
  workspace_id: string;
  chunk_index: number;
  content: string;
  page: number | null;
  embedding: string;
  document_name: string;
  distance: number;
}

export const embeddingService = new EmbeddingService();
