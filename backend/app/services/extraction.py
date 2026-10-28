import io
from typing import Dict
from pypdf import PdfReader


def extract_text(file_buffer: bytes, mime_type: str) -> Dict[str, any]:
    if mime_type in ("text/plain", "text/csv", "application/csv"):
        try:
            text = file_buffer.decode("utf-8")
            return {
                "text": text,
                "page_count": 1,
            }
        except UnicodeDecodeError as err:
            raise ValueError(f"File is not valid UTF-8 text: {err}")

    if mime_type == "application/pdf":
        try:
            reader = PdfReader(io.BytesIO(file_buffer))
            pages_text = []
            for page in reader.pages:
                extracted = page.extract_text() or ""
                pages_text.append(extracted)
            full_text = "\n\n".join(pages_text).strip()
            return {
                "text": full_text,
                "page_count": len(reader.pages),
            }
        except Exception as err:
            raise ValueError(f"Failed to extract text from PDF: {err}")

    raise ValueError(f"Unsupported MIME type for text extraction: {mime_type}")
