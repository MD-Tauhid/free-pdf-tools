import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import type { PdfLoadError, PdfPageDimensions } from "@/types/pdf";

let workerInitialized = false;

/**
 * Ensures the PDF.js web worker is configured only once in the browser.
 */
export function initPdfWorker(): void {
  if (typeof window === "undefined" || workerInitialized) {
    return;
  }

  try {
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    }
    workerInitialized = true;
  } catch (err) {
    console.error("Failed to initialize PDF.js worker:", err);
  }
}

/**
 * Loads a PDF document from an ArrayBuffer using PDF.js.
 */
export async function loadPdfDocument(
  data: ArrayBuffer,
  password?: string
): Promise<PDFDocumentProxy> {
  initPdfWorker();

  try {
    const loadingTask = pdfjsLib.getDocument({
      // PDF.js may transfer its input buffer to the worker; keep the editor's
      // source buffer intact for non-destructive export.
      data: new Uint8Array(data.slice(0)),
      cMapUrl: "/cmaps/",
      cMapPacked: true,
      standardFontDataUrl: "/standard_fonts/",
      password: password || undefined,
    });

    const pdfDoc = await loadingTask.promise;
    return pdfDoc;
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string };

    if (err.name === "PasswordException") {
      const loadError: PdfLoadError = {
        code: "ENCRYPTED",
        message: "This PDF is password-protected. Password-encrypted documents are not currently supported for online editing.",
        details: err.message,
      };
      throw loadError;
    }

    if (err.name === "InvalidPDFException") {
      const loadError: PdfLoadError = {
        code: "CORRUPTED",
        message: "The PDF file appears to be damaged or corrupted and cannot be rendered.",
        details: err.message,
      };
      throw loadError;
    }

    const loadError: PdfLoadError = {
      code: "UNKNOWN",
      message: err.message || "Failed to parse PDF document.",
      details: err.name,
    };
    throw loadError;
  }
}

/**
 * Extracts normalized dimensions for a given page proxy.
 */
export function getPageDimensions(page: PDFPageProxy): PdfPageDimensions {
  const viewport = page.getViewport({ scale: 1.0 });
  return {
    pageNumber: page.pageNumber,
    width: viewport.width,
    height: viewport.height,
    aspectRatio: viewport.width / viewport.height,
  };
}
