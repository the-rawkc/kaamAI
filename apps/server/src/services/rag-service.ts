import { EmbeddingService } from "./embedding-service.js";
import { AiProvider, ChatMessage } from "./ai-provider.js";
import { getAiProvider } from "./ai-factory.js";
import { findDocumentById } from "../models/document.js";

export interface Citation {
  documentId: string;
  documentName: string;
  page?: number;
  chunkIndex?: number;
  snippet: string;
}

export interface RagResult {
  answer: string;
  model: string;
  citations: Citation[];
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  evidenceFound: boolean;
}

/**
 * RAG (Retrieval-Augmented Generation) service.
 * Retrieves relevant document chunks via semantic search, assembles a
 * grounded prompt with citations, and generates an answer via Ollama.
 *
 * When no relevant evidence is found above the similarity threshold,
 * returns an honest insufficient-evidence response rather than fabricating.
 */
export class RagService {
  private embeddingService: EmbeddingService;
  private adapter: AiProvider;

  constructor(embeddingService?: EmbeddingService, adapter?: AiProvider) {
    this.embeddingService = embeddingService ?? new EmbeddingService();
    this.adapter = adapter ?? getAiProvider();
  }

  /**
   * Answer a question using RAG over the user's workspace documents.
   *
   * Steps:
   * 1. Semantic search for top-k relevant chunks in the workspace
   * 2. If no results above threshold, return insufficient-evidence answer
   * 3. Build a system prompt that instructs the model to answer only from
   *    the provided context and to cite sources
   * 4. Generate the answer via Ollama
   * 5. Map retrieved chunks to citation objects
   */
  async answerQuestion(
    workspaceId: string,
    question: string,
    options: {
      topK?: number;
      threshold?: number;
      model?: string;
      temperature?: number;
      maxTokens?: number;
    } = {},
  ): Promise<RagResult> {
    const { topK = 5, threshold = 0.3 } = options;

    // Step 1: Retrieve relevant chunks
    const searchResults = await this.embeddingService.search(workspaceId, question, {
      topK,
      threshold,
    });

    // Step 2: Insufficient-evidence path
    if (searchResults.length === 0) {
      return {
        answer:
          "I couldn't find any relevant information in your uploaded documents to answer that question. Try uploading documents related to your question, or rephrase your question.",
        model: options.model ?? "",
        citations: [],
        evidenceFound: false,
      };
    }

    // Step 3: Build grounded prompt with citations
    const contextParts: string[] = [];
    const citations: Citation[] = [];

    for (let i = 0; i < searchResults.length; i++) {
      const result = searchResults[i];
      const citationId = `[${i + 1}]`;
      contextParts.push(
        `${citationId} ${result.content} (Source: ${result.document_name}${result.page != null ? `, page ${result.page}` : ""})`,
      );

      citations.push({
        documentId: result.document_id,
        documentName: result.document_name,
        page: result.page ?? undefined,
        chunkIndex: result.chunk_index,
        snippet: result.content.slice(0, 200),
      });
    }

    const context = contextParts.join("\n\n");

    const systemPrompt: ChatMessage = {
      role: "system",
      content: `You are KaamAI, a helpful local-first AI assistant for freelancers and small businesses.

Answer the user's question using ONLY the provided document context below. Each context passage is tagged with a citation number like [1], [2], etc.

Rules:
- If the answer is supported by the context, provide it and cite the relevant sources using their citation numbers (e.g., "According to [1]...").
- If the context does not contain enough information to answer fully, say what you can answer from the context and acknowledge what is missing.
- Do not invent facts, documents, or citations that are not in the provided context.
- Do not claim to have seen documents that are not in the context.
- Be concise and honest.

Context:
${context}`,
    };

    const userMessage: ChatMessage = {
      role: "user",
      content: question,
    };

    // Step 4: Generate answer via Ollama
    const result = await this.adapter.chat([systemPrompt, userMessage], {
      model: options.model,
      temperature: options.temperature ?? 0.3,
      maxTokens: options.maxTokens,
    });

    return {
      answer: result.content,
      model: result.model,
      citations,
      usage: result.usage,
      evidenceFound: true,
    };
  }

  /**
   * Get citation details for a document, including full content if available.
   */
  async getCitationDetail(documentId: string): Promise<{
    documentId: string;
    documentName: string;
    content: string | null;
    pageCount: number | null;
  } | null> {
    const document = await findDocumentById(documentId);
    if (!document) {
      return null;
    }
    return {
      documentId: document.id,
      documentName: document.original_filename,
      content: document.extracted_text,
      pageCount: document.page_count,
    };
  }
}

export const ragService = new RagService();
