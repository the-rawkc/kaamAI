import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export const STORAGE_DIR = resolve(
  process.env.UPLOAD_DIR ?? join(__dirname, "../../../../data", "uploads"),
);

export const MAX_FILE_SIZE = Number(process.env.MAX_UPLOAD_MB ?? 15) * 1024 * 1024;

export const PER_WORKSPACE_QUOTA = Number(process.env.MAX_WORKSPACE_TOTAL_MB ?? 500) * 1024 * 1024;

export const SUPPORTED_MIME_TYPES = new Set(["application/pdf", "text/plain", "text/csv"]);

export const SUPPORTED_EXTENSIONS = new Set([".pdf", ".txt", ".csv"]);

export function generateStorageKey(): string {
  return randomBytes(16).toString("hex");
}

export function ensureStorageDir(): void {
  mkdirSync(STORAGE_DIR, { recursive: true, mode: 0o700 });
}

export function storagePathFor(storageKey: string): string {
  if (!/^[a-f0-9]{32}$/.test(storageKey)) {
    throw new Error("Invalid storage key.");
  }
  return join(STORAGE_DIR, storageKey);
}

export function isSupportedMimeType(mimeType: string): boolean {
  return SUPPORTED_MIME_TYPES.has(mimeType.toLowerCase());
}

export function isSupportedExtension(filename: string): boolean {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf("."));
  return SUPPORTED_EXTENSIONS.has(ext);
}
