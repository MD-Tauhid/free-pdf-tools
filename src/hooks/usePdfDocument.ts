"use client";

import * as React from "react";
import type { PDFDocumentProxy, PdfLoadError, PdfPageDimensions, FitMode } from "@/types/pdf";
import { validatePdfFile, validatePdfMagicBytes } from "@/lib/validation/file-validation";
import { loadPdfDocument, getPageDimensions } from "@/lib/pdf/load-pdf";

export interface UsePdfDocumentReturn {
  file: File | null;
  fileName: string | null;
  fileSize: number;
  arrayBuffer: ArrayBuffer | null;
  pdfDoc: PDFDocumentProxy | null;
  pageCount: number;
  currentPage: number;
  scale: number;
  fitMode: FitMode;
  rotation: number;
  loading: boolean;
  error: PdfLoadError | null;
  pageDimensions: Record<number, PdfPageDimensions>;

  // Actions
  loadFile: (file: File) => Promise<boolean>;
  loadFromBuffer: (buffer: ArrayBuffer, fileName?: string) => Promise<boolean>;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setZoom: (scale: number) => void;
  setFitMode: (mode: FitMode) => void;
  rotateClockwise: () => void;
  rotateCounterClockwise: () => void;
  resetDocument: () => void;
}

export function usePdfDocument(): UsePdfDocumentReturn {
  const [file, setFile] = React.useState<File | null>(null);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [fileSize, setFileSize] = React.useState<number>(0);
  const [arrayBuffer, setArrayBuffer] = React.useState<ArrayBuffer | null>(null);
  const [pdfDoc, setPdfDoc] = React.useState<PDFDocumentProxy | null>(null);
  const [pageCount, setPageCount] = React.useState<number>(0);
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [scale, setScale] = React.useState<number>(1.0);
  const [fitMode, setFitMode] = React.useState<FitMode>("custom");
  const [rotation, setRotation] = React.useState<number>(0);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<PdfLoadError | null>(null);
  const [pageDimensions, setPageDimensions] = React.useState<Record<number, PdfPageDimensions>>({});
  const pdfDocRef = React.useRef<PDFDocumentProxy | null>(null);

  // Clean up proxy on unmount
  React.useEffect(() => {
    return () => {
      if (pdfDoc) {
        pdfDoc.cleanup().catch(() => {});
      }
      pdfDocRef.current = null;
    };
  }, [pdfDoc]);

  const resetDocument = React.useCallback(() => {
    if (pdfDoc) {
      pdfDoc.cleanup().catch(() => {});
    }
    setFile(null);
    setFileName(null);
    setFileSize(0);
    setArrayBuffer(null);
    setPdfDoc(null);
    setPageCount(0);
    setCurrentPage(1);
    setScale(1.0);
    setFitMode("custom");
    setRotation(0);
    setError(null);
    setLoading(false);
    setPageDimensions({});
  }, [pdfDoc]);

  const loadFromBuffer = React.useCallback(
    async (buffer: ArrayBuffer, name = "document.pdf"): Promise<boolean> => {
      setLoading(true);
      setError(null);

      // Validate magic bytes
      const magicValidation = validatePdfMagicBytes(buffer);
      if (!magicValidation.valid && magicValidation.error) {
        setError(magicValidation.error);
        setLoading(false);
        return false;
      }

      try {
        if (pdfDoc) {
          await pdfDoc.cleanup().catch(() => {});
        }

        const doc = await loadPdfDocument(buffer);
        const count = doc.numPages;

        // Pre-fetch first page dimensions
        const firstPage = await doc.getPage(1);
        const dims = getPageDimensions(firstPage);

        pdfDocRef.current = doc;
        setPdfDoc(doc);
        setArrayBuffer(buffer);
        setFileName(name);
        setFileSize(buffer.byteLength);
        setPageCount(count);
        setCurrentPage(1);
        setScale(1.0);
        setRotation(0);
        setPageDimensions({ 1: dims });
        setLoading(false);
        return true;
      } catch (err: unknown) {
        const loadErr = err as PdfLoadError;
        setError(
          loadErr.code
            ? loadErr
            : {
                code: "UNKNOWN",
                message: "Failed to load PDF document.",
              }
        );
        setLoading(false);
        return false;
      }
    },
    [pdfDoc]
  );

  const loadFile = React.useCallback(
    async (inputFile: File): Promise<boolean> => {
      setError(null);
      setLoading(true);

      // Validate metadata
      const validation = validatePdfFile(inputFile);
      if (!validation.valid && validation.error) {
        setError(validation.error);
        setLoading(false);
        return false;
      }

      try {
        const buffer = await inputFile.arrayBuffer();
        setFile(inputFile);
        return await loadFromBuffer(buffer, inputFile.name);
      } catch (err) {
        setError({
          code: "UNKNOWN",
          message: "Failed to read the selected file from disk.",
          details: err instanceof Error ? err.message : String(err),
        });
        setLoading(false);
        return false;
      }
    },
    [loadFromBuffer]
  );

  const goToPage = React.useCallback(
    (page: number) => {
      if (page >= 1 && page <= pageCount) {
        setCurrentPage(page);
        if (!pageDimensions[page] && pdfDoc) {
          void pdfDoc
            .getPage(page)
            .then((pageProxy) => {
              if (pdfDocRef.current !== pdfDoc) return;
              const dimensions = getPageDimensions(pageProxy);
              setPageDimensions((previous) => ({
                ...previous,
                [page]: dimensions,
              }));
              setError(null);
            })
            .catch((error: unknown) => {
              if (pdfDocRef.current !== pdfDoc) return;
              console.error(`Failed to inspect PDF page ${page}:`, error);
              setError({
                code: "RENDER_FAILED",
                message: `Page ${page} could not be inspected.`,
                details: error instanceof Error ? error.message : String(error),
              });
            });
        }
      }
    },
    [pageCount, pageDimensions, pdfDoc]
  );

  const nextPage = React.useCallback(() => {
    if (currentPage < pageCount) {
      goToPage(currentPage + 1);
    }
  }, [currentPage, goToPage, pageCount]);

  const prevPage = React.useCallback(() => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  }, [currentPage, goToPage]);

  const zoomIn = React.useCallback(() => {
    setFitMode("custom");
    setScale((prev) => Math.min(Number((prev * 1.2).toFixed(2)), 3.0));
  }, []);

  const zoomOut = React.useCallback(() => {
    setFitMode("custom");
    setScale((prev) => Math.max(Number((prev / 1.2).toFixed(2)), 0.3));
  }, []);

  const setZoom = React.useCallback((newScale: number) => {
    setFitMode("custom");
    setScale(Math.min(Math.max(Number(newScale.toFixed(2)), 0.25), 3.0));
  }, []);

  const rotateClockwise = React.useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  const rotateCounterClockwise = React.useCallback(() => {
    setRotation((prev) => (prev + 270) % 360);
  }, []);

  return {
    file,
    fileName,
    fileSize,
    arrayBuffer,
    pdfDoc,
    pageCount,
    currentPage,
    scale,
    fitMode,
    rotation,
    loading,
    error,
    pageDimensions,
    loadFile,
    loadFromBuffer,
    goToPage,
    nextPage,
    prevPage,
    zoomIn,
    zoomOut,
    setZoom,
    setFitMode,
    rotateClockwise,
    rotateCounterClockwise,
    resetDocument,
  };
}
