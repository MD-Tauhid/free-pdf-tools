"use client";

import * as React from "react";
import { usePdfDocument } from "@/hooks/usePdfDocument";
import { usePdfEditor } from "@/hooks/usePdfEditor";
import { usePdfEditorStore } from "@/stores/pdf-editor-store";
import { PdfUploader } from "@/components/pdf/PdfUploader";
import { PdfPage } from "@/components/pdf/PdfPage";
import { PdfToolbar } from "@/components/pdf/PdfToolbar";
import { EditorToolbar } from "@/components/editor/EditorToolbar";
import { PageSidebar } from "@/components/editor/PageSidebar";
import { PropertiesSidebar } from "@/components/editor/PropertiesSidebar";
import { TextSelectionLayer } from "@/components/editor/TextSelectionLayer";
import { AnnotationLayer } from "@/components/editor/AnnotationLayer";
import { AnnotationInputLayer } from "@/components/editor/AnnotationInputLayer";
import {
  calculateFitWidthScale,
  calculateFitPageScale,
  viewportPointToPdf,
} from "@/lib/pdf/coordinates";
import { pdfEditingEngine } from "@/lib/pdf/pdf-editing-engine";
import { Button } from "@/components/ui/button";
import { PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PDFPageProxy } from "@/types/pdf";
import type { PageViewport } from "pdfjs-dist";

interface PendingImage {
  dataUrl: string;
  mimeType: "image/png" | "image/jpeg";
  aspectRatio: number;
}

// ---------------------------------------------------------------------------
// EditorWorkspace
// ---------------------------------------------------------------------------

interface EditorWorkspaceProps {
  className?: string;
}

export function EditorWorkspace({ className }: EditorWorkspaceProps) {
  // --- PDF document state ---
  const {
    fileName,
    arrayBuffer,
    pdfDoc,
    pageCount,
    currentPage,
    scale,
    rotation,
    loading,
    error,
    pageDimensions,
    loadFile,
    goToPage,
    nextPage,
    prevPage,
    zoomIn,
    zoomOut,
    setZoom,
    rotateClockwise,
    resetDocument,
  } = usePdfDocument();

  // --- Editor store (tool, history) ---
  const { activeTool } = usePdfEditor();
  const clearAllAnnotations = usePdfEditorStore((s) => s.clearAllAnnotations);
  const addAnnotation = usePdfEditorStore((s) => s.addAnnotation);
  const setActiveTool = usePdfEditorStore((s) => s.setActiveTool);
  const selectAnnotation = usePdfEditorStore((s) => s.selectAnnotation);
  const selectTextItem = usePdfEditorStore((s) => s.selectTextItem);
  const annotationsByPage = usePdfEditorStore((s) => s.annotationsByPage);
  const textReplacementsByPage = usePdfEditorStore(
    (s) => s.textReplacementsByPage
  );

  // --- UI state ---
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [pageProxy, setPageProxy] = React.useState<PDFPageProxy | null>(null);
  const [pendingImage, setPendingImage] = React.useState<PendingImage | null>(null);
  const [imageError, setImageError] = React.useState<string | null>(null);
  const [exportError, setExportError] = React.useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = React.useState<string | null>(null);
  const [exporting, setExporting] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const imageInputRef = React.useRef<HTMLInputElement | null>(null);

  const pageViewport: PageViewport | null = React.useMemo(() => {
    if (!pageProxy || pageProxy.pageNumber !== currentPage) return null;
    const effectiveRotation =
      ((pageProxy.rotate + rotation) % 360 + 360) % 360;
    return pageProxy.getViewport({ scale, rotation: effectiveRotation });
  }, [currentPage, pageProxy, rotation, scale]);

  // When a new document is loaded, clear all editor overlays
  React.useEffect(() => {
    clearAllAnnotations();
  }, [pdfDoc, clearAllAnnotations]);

  React.useEffect(() => {
    selectAnnotation(null);
    selectTextItem(null);
  }, [currentPage, selectAnnotation, selectTextItem]);

  // Keep the page proxy so all overlays use PDF.js' exact rotated viewport transform.
  const handlePageLoaded = React.useCallback((page: PDFPageProxy) => {
    setPageProxy(page);
  }, []);

  // Fit-to-width
  const handleFitWidth = React.useCallback(() => {
    if (!containerRef.current || !pageDimensions[currentPage]) return;
    const cw = containerRef.current.clientWidth;
    const dimensions = pageDimensions[currentPage];
    const rotated = rotation % 180 !== 0;
    const pw = rotated ? dimensions.height : dimensions.width;
    setZoom(calculateFitWidthScale(cw, pw, sidebarOpen ? 64 : 48));
  }, [currentPage, pageDimensions, rotation, sidebarOpen, setZoom]);

  // Fit-to-page
  const handleFitPage = React.useCallback(() => {
    if (!containerRef.current || !pageDimensions[currentPage]) return;
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;
    const d = pageDimensions[currentPage];
    const rotated = rotation % 180 !== 0;
    setZoom(
      calculateFitPageScale(
        cw,
        ch,
        rotated ? d.height : d.width,
        rotated ? d.width : d.height,
        sidebarOpen ? 96 : 64
      )
    );
  }, [currentPage, pageDimensions, rotation, sidebarOpen, setZoom]);

  // Export from the pristine source document so repeated downloads never stack edits.
  const handleExport = React.useCallback(() => {
    if (!arrayBuffer || exporting) return;
    setExporting(true);
    setExportError(null);
    setExportSuccess(null);
    const replacements = Object.values(textReplacementsByPage).flat();
    void pdfEditingEngine.exportService
      .export(arrayBuffer, replacements, annotationsByPage)
      .then((bytes) => {
        const blob = new Blob([Uint8Array.from(bytes)], {
          type: "application/pdf",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const downloadName = fileName
          ? `${fileName.replace(/\.pdf$/i, "")}-edited.pdf`
          : "document-edited.pdf";
        a.download = downloadName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        setExportSuccess(`Export started: ${downloadName}`);
        window.setTimeout(() => setExportSuccess(null), 5000);
      })
      .catch((error: unknown) => {
        console.error("Failed to export edited PDF:", error);
        setExportError(
          error instanceof Error
            ? error.message
            : "The edited PDF could not be exported."
        );
      })
      .finally(() => setExporting(false));
  }, [
    annotationsByPage,
    arrayBuffer,
    exporting,
    fileName,
    textReplacementsByPage,
  ]);

  const handlePickImage = React.useCallback(() => {
    setImageError(null);
    setExportSuccess(null);
    imageInputRef.current?.click();
  }, []);

  const handleImageChange = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
        setImageError("Choose a PNG, JPEG, or WebP image.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setImageError("Choose an image smaller than 10 MB.");
        return;
      }
      let bitmap: ImageBitmap | null = null;
      try {
        bitmap = await createImageBitmap(file);
        if (bitmap.width * bitmap.height > 40_000_000) {
          throw new Error("The selected image dimensions are too large to place safely.");
        }
        const aspectRatio = bitmap.width / bitmap.height;
        let dataUrl: string;
        let mimeType: PendingImage["mimeType"];
        if (file.type === "image/webp") {
          const canvas = document.createElement("canvas");
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          const context = canvas.getContext("2d");
          if (!context) {
            throw new Error("This browser could not prepare the selected image.");
          }
          context.drawImage(bitmap, 0, 0);
          dataUrl = canvas.toDataURL("image/png");
          mimeType = "image/png";
        } else {
          const bytes = new Uint8Array(await file.arrayBuffer());
          let binary = "";
          bytes.forEach((byte) => {
            binary += String.fromCharCode(byte);
          });
          dataUrl = `data:${file.type};base64,${btoa(binary)}`;
          mimeType = file.type === "image/jpeg" ? "image/jpeg" : "image/png";
        }
        setPendingImage({ dataUrl, mimeType, aspectRatio });
        setActiveTool("image");
        setImageError(null);
      } catch (error: unknown) {
        console.error("Failed to load editor image:", error);
        setImageError(
          error instanceof Error ? error.message : "The selected image could not be loaded."
        );
      } finally {
        bitmap?.close();
      }
    },
    [setActiveTool]
  );

  // Handle canvas click → add text-box annotation when text-box tool is active
  const handleCanvasClick = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (
        (activeTool !== "text-box" && activeTool !== "image") ||
        !pdfDoc ||
        !pageViewport ||
        !pageProxy ||
        pageProxy.pageNumber !== currentPage
      ) {
        return;
      }

      const target = e.currentTarget;
      const rect = target.getBoundingClientRect();
      const { x: pdfX, y: pdfY } = viewportPointToPdf(
        {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        },
        pageViewport
      );
      const [minX, minY, maxX, maxY] = pageProxy.view;
      const id = crypto.randomUUID();

      if (activeTool === "text-box") {
        const width = Math.min(200, maxX - minX);
        const height = 30;
        addAnnotation({
          id,
          type: "text-box",
          pageNumber: currentPage,
          pdfRect: {
            x: Math.max(minX, Math.min(pdfX, maxX - width)),
            y: Math.max(minY, Math.min(pdfY - height, maxY - height)),
            width,
            height,
          },
          content: "New text",
          fontSize: 12,
          fontFamily: "Helvetica",
          color: "#000000",
          bold: false,
          italic: false,
          underline: false,
          backgroundColor: null,
          opacity: 1,
        });
        selectAnnotation(id);
      } else if (pendingImage) {
        const pageWidth = maxX - minX;
        const pageHeight = maxY - minY;
        const width = Math.min(120, pageWidth);
        const height = Math.min(width / pendingImage.aspectRatio, pageHeight);
        const imageWidth = height * pendingImage.aspectRatio;
        addAnnotation({
          id,
          type: "image",
          pageNumber: currentPage,
          pdfRect: {
            x: Math.max(minX, Math.min(pdfX - imageWidth / 2, maxX - imageWidth)),
            y: Math.max(minY, Math.min(pdfY - height / 2, maxY - height)),
            width: imageWidth,
            height,
          },
          dataUrl: pendingImage.dataUrl,
          mimeType: pendingImage.mimeType,
          opacity: 1,
        });
        setPendingImage(null);
        setActiveTool("select");
        selectAnnotation(id);
      }
    },
    [
      activeTool,
      addAnnotation,
      currentPage,
      pageProxy,
      pageViewport,
      pdfDoc,
      pendingImage,
      selectAnnotation,
      setActiveTool,
    ]
  );

  // Keyboard shortcuts (page navigation + zoom)
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!pdfDoc) return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        prevPage();
      } else if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        nextPage();
      } else if (e.key === "+" || (e.ctrlKey && e.key === "=")) {
        e.preventDefault();
        zoomIn();
      } else if (e.key === "-" || (e.ctrlKey && e.key === "-")) {
        e.preventDefault();
        zoomOut();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pdfDoc, prevPage, nextPage, zoomIn, zoomOut]);

  // Reset handler: clear doc + annotations
  const handleReset = React.useCallback(() => {
    clearAllAnnotations();
    setPendingImage(null);
    setPageProxy(null);
    resetDocument();
  }, [clearAllAnnotations, resetDocument]);

  // -------------------------------------------------------------------------
  // Render: Uploader when no doc is open
  // -------------------------------------------------------------------------
  if (!pdfDoc) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center p-6 sm:p-12",
          className
        )}
      >
        <PdfUploader onFileSelect={loadFile} loading={loading} error={error} />
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Full editor workspace
  // -------------------------------------------------------------------------
  return (
    <div
      className={cn(
        "flex flex-col h-[calc(100vh-4rem)] bg-muted/40 overflow-hidden",
        className
      )}
    >
      {/* Editor toolbar (tool picker, undo/redo, export) */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        aria-label="Choose an image to place in the PDF"
        onChange={handleImageChange}
      />
      <EditorToolbar
        onExport={arrayBuffer ? handleExport : undefined}
        onPickImage={handlePickImage}
        exporting={exporting}
      />
      {error && (
        <div role="alert" className="border-b bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error.message}
        </div>
      )}

      {/* PDF navigation toolbar (zoom, page nav, rotate, reset) */}
      <PdfToolbar
        fileName={fileName}
        currentPage={currentPage}
        pageCount={pageCount}
        scale={scale}
        onPrevPage={prevPage}
        onNextPage={nextPage}
        onGoToPage={goToPage}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onFitWidth={handleFitWidth}
        onFitPage={handleFitPage}
        onRotate={rotateClockwise}
        onReset={handleReset}
        onDownload={handleExport}
      />
      {(imageError ||
        exportError ||
        exportSuccess ||
        (activeTool === "image" && pendingImage)) && (
        <div
          role={imageError || exportError ? "alert" : "status"}
          className={cn(
            "border-b px-4 py-2 text-sm",
            imageError || exportError
              ? "bg-destructive/10 text-destructive"
              : "bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200"
          )}
        >
          {imageError ??
            exportError ??
            (activeTool === "image" && pendingImage
              ? "Image ready — click a page to place it."
              : exportSuccess)}
        </div>
      )}

      {/* Main workspace: sidebar + canvas + properties */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left page thumbnail sidebar */}
        {sidebarOpen && (
          <PageSidebar
            pdfDoc={pdfDoc}
            pageCount={pageCount}
            currentPage={currentPage}
            rotation={rotation}
            onGoToPage={goToPage}
            onClose={() => setSidebarOpen(false)}
          />
        )}

        {/* Floating button to re-open sidebar */}
        {!sidebarOpen && (
          <div className="absolute top-3 left-3 z-20">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setSidebarOpen(true)}
              className="bg-background shadow-md border"
              title="Show Pages"
              aria-label="Show Pages"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Center canvas area */}
        <main
          ref={containerRef}
          className="flex-1 overflow-auto p-4 sm:p-8 flex items-start justify-center"
          // Cursor cue for active tool
          style={{ cursor: activeTool === "text-box" ? "text" : "default" }}
        >
          <div
            className="relative my-auto transition-transform duration-100"
            onClick={handleCanvasClick}
          >
            {/* Base PDF page render */}
            <PdfPage
              pdfDoc={pdfDoc}
              pageNumber={currentPage}
              scale={scale}
              rotation={rotation}
              onPageLoaded={handlePageLoaded}
            />

            {/* Text selection layer (overlay — select tool only) */}
            {pageViewport && (
              <>
                <TextSelectionLayer
                  pdfDoc={pdfDoc}
                  textExtractor={pdfEditingEngine.textExtractor}
                  pageNumber={currentPage}
                  viewport={pageViewport}
                  rotation={pageViewport.rotation}
                />
                <AnnotationLayer
                  pageNumber={currentPage}
                  viewport={pageViewport}
                />
                <AnnotationInputLayer
                  key={`${currentPage}-${activeTool}`}
                  pageNumber={currentPage}
                  viewport={pageViewport}
                />
              </>
            )}
          </div>
        </main>

        {/* Right properties sidebar */}
        <PropertiesSidebar />
      </div>
    </div>
  );
}
