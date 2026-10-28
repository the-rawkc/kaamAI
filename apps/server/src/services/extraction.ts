import { readFile } from "node:fs/promises";
import pdfParse from "pdf-parse";

export interface ExtractionResult {
  text: string;
  pageCount?: number;
  error?: string;
}

/**
 * Extract text from an uploaded file buffer based on MIME type.
 * Supports: .txt, .pdf, .csv (returns raw content for CSV parsing layer).
 * For scanned/image-only PDFs, text extraction will return empty text.
 */
export async function extractText(
  buffer: Buffer,
  mimeType: string,
  originalFilename: string,
): Promise<ExtractionResult> {
  const mime = mimeType.toLowerCase();

  try {
    if (mime === "text/plain") {
      const text = buffer.toString("utf8");
      return { text, pageCount: 1 };
    }

    if (mime === "application/pdf") {
      const data = await pdfParse(buffer);
      return {
        text: data.text,
        pageCount: data.numpages,
      };
    }

    if (mime === "text/csv") {
      // CSV files are handled by the CSV parser; return raw text for reference.
      const text = buffer.toString("utf8");
      return { text, pageCount: 1 };
    }

    return {
      text: "",
      error: `Unsupported MIME type for extraction: ${mimeType}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown extraction error.";
    return {
      text: "",
      error: `Failed to extract text from ${originalFilename}: ${message}`,
    };
  }
}

/**
 * Read a stored file from disk and extract its text content.
 * Used for re-indexing documents that are already stored on disk.
 */
export async function extractStoredFile(
  storagePath: string,
  mimeType: string,
  originalFilename: string,
): Promise<ExtractionResult> {
  const buffer = await readFile(storagePath);
  return extractText(buffer, mimeType, originalFilename);
}
