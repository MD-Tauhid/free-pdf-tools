"use client";

import * as React from "react";
import type { PageViewport } from "pdfjs-dist";
import type { PDFDocumentProxy } from "@/types/pdf";
import type { ExtractedTextItem, SelectedTextItem, ScreenRect } from "@/types/editor";
import { usePdfEditorStore } from "@/stores/pdf-editor-store";
import { cn } from "@/lib/utils";
import { pdfRectToViewportRect } from "@/lib/pdf/coordinates";
import type { PdfTextExtractor } from "@/lib/pdf/text-editing-engine";

// ---------------------------------------------------------------------------
// Text extraction helper
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Coordinate transformation: PDF → Screen
// ---------------------------------------------------------------------------

/**
 * Convert a PDF user-space rect to a CSS screen rect given the current scale.
 * PDF origin is bottom-left; Screen origin is top-left.
 */
function pdfRectToScreenRect(
  pdfRect: { x: number; y: number; width: number; height: number },
  viewport: PageViewport
): ScreenRect {
  const rect = pdfRectToViewportRect(pdfRect, viewport);
  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
  };
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TextSelectionLayerProps {
  pdfDoc: PDFDocumentProxy;
  textExtractor: PdfTextExtractor;
  pageNumber: number;
  viewport: PageViewport;
  rotation?: number;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * TextSelectionLayer
 *
 * Overlaid on top of PdfPage canvas (position: absolute, inset: 0).
 * Renders clickable transparent rectangles over each extracted text span.
 * Clicking a span sets it as the "selected text item" in the editor store,
 * opening the PropertiesSidebar.
 *
 * Only active when activeTool === "select".
 */
export function TextSelectionLayer({
  pdfDoc,
  textExtractor,
  pageNumber,
  viewport,
  rotation = 0,
  className,
}: TextSelectionLayerProps) {
  const activeTool = usePdfEditorStore((s) => s.activeTool);
  const selectTextItem = usePdfEditorStore((s) => s.selectTextItem);
  const selectedTextItem = usePdfEditorStore((s) => s.selectedTextItem);

  const [textItems, setTextItems] = React.useState<ExtractedTextItem[]>([]);
  const [isExtracting, setIsExtracting] = React.useState(false);
  const [extractionError, setExtractionError] = React.useState<string | null>(null);

  // Cache key: doc fingerprint + page + rotation (scale doesn't affect extraction)
  const cacheKey = React.useMemo(() => {
    const fp =
      (pdfDoc as { fingerprints?: string[] }).fingerprints?.[0] ?? "unknown";
    return `${fp}-p${pageNumber}-r${rotation}`;
  }, [pdfDoc, pageNumber, rotation]);

  // Extract text items once per page+document+rotation combination
  React.useEffect(() => {
    let cancelled = false;

    async function extract() {
      setIsExtracting(true);
      try {
        const items = await textExtractor.extractPage(pdfDoc, pageNumber);
        if (!cancelled) {
          setTextItems(items);
          setExtractionError(null);
        }
      } catch (error: unknown) {
        if (!cancelled) {
          setExtractionError(
            error instanceof Error
              ? error.message
              : "Text from this page could not be inspected."
          );
        }
      } finally {
        if (!cancelled) setIsExtracting(false);
      }
    }

    extract();
    return () => {
      cancelled = true;
    };
    // cacheKey encodes pdfDoc+pageNumber+rotation; scale does not affect text extraction
  }, [cacheKey, pdfDoc, pageNumber, textExtractor]);

  // Only render interactive layer when select tool is active
  if (activeTool !== "select") return null;


  return (
    <div
      className={cn(
        "absolute inset-0 pointer-events-none",
        isExtracting && "opacity-0",
        className
      )}
      aria-hidden={activeTool !== "select"}
      data-testid="text-selection-layer"
    >
      {textItems.map((item) => {
        const screenRect = pdfRectToScreenRect(item.pdfRect, viewport);
        const isSelected =
          selectedTextItem?.item.id === item.id;

        return (
          <button
            key={item.id}
            type="button"
            aria-label={`Select text: ${item.text}`}
            title={item.text}
            onClick={() => {
              const sel: SelectedTextItem = { item, screenRect };
              selectTextItem(isSelected ? null : sel);
            }}
            className={cn(
              "absolute pointer-events-auto cursor-pointer rounded-[2px] transition-colors",
              "border border-transparent",
              "hover:bg-blue-400/20 hover:border-blue-400/60",
              isSelected
                ? "bg-blue-500/25 border-blue-500/80 ring-1 ring-blue-500/60"
                : ""
            )}
            style={{
              left: screenRect.x,
              top: screenRect.y,
              width: Math.max(screenRect.width, 4),
              height: Math.max(screenRect.height, 8),
            }}
          />
        );
      })}
      {extractionError && (
        <div
          role="status"
          className="absolute bottom-2 left-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-900 shadow"
        >
          Text selection unavailable: {extractionError}
        </div>
      )}
    </div>
  );
}
