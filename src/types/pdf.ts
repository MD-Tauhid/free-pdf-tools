import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";

export type PdfErrorCode =
  | "INVALID_TYPE"
  | "FILE_TOO_LARGE"
  | "CORRUPTED"
  | "ENCRYPTED"
  | "RENDER_FAILED"
  | "UNKNOWN";

export interface PdfLoadError {
  code: PdfErrorCode;
  message: string;
  details?: string;
}

export interface PdfDocumentInfo {
  fileName: string;
  fileSize: number;
  pageCount: number;
  fingerprint?: string;
}

export interface PdfPageDimensions {
  pageNumber: number;
  width: number; // in PDF points (72 points = 1 inch)
  height: number;
  aspectRatio: number;
}

export type FitMode = "custom" | "fit-width" | "fit-page";

export interface PdfViewportState {
  currentPage: number;
  pageCount: number;
  scale: number;
  fitMode: FitMode;
  rotation: number; // 0, 90, 180, 270
}

export type { PDFDocumentProxy, PDFPageProxy };
