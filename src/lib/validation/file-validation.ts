import { FILE_LIMITS } from "@/lib/security/file-limits";
import type { PdfLoadError } from "@/types/pdf";

export interface FileValidationResult {
  valid: boolean;
  error?: PdfLoadError;
}

/**
 * Validates file metadata (extension, declared MIME type, and size limits).
 */
export function validatePdfFile(file: File): FileValidationResult {
  // Check file extension
  const hasPdfExtension = file.name.toLowerCase().endsWith(".pdf");
  if (!hasPdfExtension) {
    return {
      valid: false,
      error: {
        code: "INVALID_TYPE",
        message: "Invalid file type. Please select a valid PDF file ending with .pdf",
      },
    };
  }

  // Check file size
  if (file.size > FILE_LIMITS.MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: {
        code: "FILE_TOO_LARGE",
        message: `File exceeds maximum limit of ${FILE_LIMITS.MAX_FILE_SIZE_MB}MB. Please select a smaller document.`,
      },
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      error: {
        code: "CORRUPTED",
        message: "The selected file is empty (0 bytes).",
      },
    };
  }

  // Check MIME type if present
  if (file.type && file.type !== "application/pdf") {
    return {
      valid: false,
      error: {
        code: "INVALID_TYPE",
        message: `Unsupported file format (${file.type}). Expected a PDF document.`,
      },
    };
  }

  return { valid: true };
}

/**
 * Validates the raw binary buffer by checking the PDF header magic bytes: %PDF-
 */
export function validatePdfMagicBytes(buffer: ArrayBuffer): FileValidationResult {
  if (buffer.byteLength < 5) {
    return {
      valid: false,
      error: {
        code: "CORRUPTED",
        message: "File is too small to be a valid PDF document.",
      },
    };
  }

  const bytes = new Uint8Array(buffer.slice(0, 5));
  const isPdf = FILE_LIMITS.PDF_MAGIC_BYTES.every((magic, i) => bytes[i] === magic);

  if (!isPdf) {
    return {
      valid: false,
      error: {
        code: "CORRUPTED",
        message: "The file header is not a valid PDF (%PDF- signature missing).",
      },
    };
  }

  return { valid: true };
}
