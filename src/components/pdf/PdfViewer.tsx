"use client";

import * as React from "react";
import { usePdfDocument } from "@/hooks/usePdfDocument";
import { PdfUploader } from "@/components/pdf/PdfUploader";
import { PdfToolbar } from "@/components/pdf/PdfToolbar";
import { PdfThumbnail } from "@/components/pdf/PdfThumbnail";
import { PdfPage } from "@/components/pdf/PdfPage";
import { calculateFitWidthScale, calculateFitPageScale } from "@/lib/pdf/coordinates";
import { Button } from "@/components/ui/button";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface PdfViewerProps {
  initialFile?: File | null;
  className?: string;
}

export function PdfViewer({ initialFile, className }: PdfViewerProps) {
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

  const [sidebarOpen, setSidebarOpen] = React.useState<boolean>(true);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  // Load initial file if provided
  React.useEffect(() => {
    if (initialFile) {
      loadFile(initialFile);
    }
  }, [initialFile, loadFile]);

  // Fit to Width calculation
  const handleFitWidth = React.useCallback(() => {
    if (!containerRef.current || !pageDimensions[currentPage]) return;
    const containerWidth = containerRef.current.clientWidth;
    const pageWidth = pageDimensions[currentPage].width;
    const newScale = calculateFitWidthScale(containerWidth, pageWidth, sidebarOpen ? 64 : 48);
    setZoom(newScale);
  }, [currentPage, pageDimensions, sidebarOpen, setZoom]);

  // Fit to Page calculation
  const handleFitPage = React.useCallback(() => {
    if (!containerRef.current || !pageDimensions[currentPage]) return;
    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;
    const dims = pageDimensions[currentPage];
    const newScale = calculateFitPageScale(
      containerWidth,
      containerHeight,
      dims.width,
      dims.height,
      sidebarOpen ? 96 : 64
    );
    setZoom(newScale);
  }, [currentPage, pageDimensions, sidebarOpen, setZoom]);

  // Download handler for current document buffer
  const handleDownload = React.useCallback(() => {
    if (!arrayBuffer) return;
    const blob = new Blob([arrayBuffer], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName || "document.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [arrayBuffer, fileName]);

  // Keyboard navigation shortcuts
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!pdfDoc) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
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

  // If no document is open, show clean uploader
  if (!pdfDoc) {
    return (
      <div className={cn("flex flex-col items-center justify-center p-6 sm:p-12", className)}>
        <PdfUploader
          onFileSelect={loadFile}
          loading={loading}
          error={error}
        />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-[calc(100vh-4rem)] bg-muted/40 overflow-hidden", className)}>
      {/* Top Controls Toolbar */}
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
        onReset={resetDocument}
        onDownload={handleDownload}
      />

      {/* Main Workspace: Thumbnails Sidebar + Center Canvas */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Thumbnails Sidebar */}
        {sidebarOpen && (
          <aside className="w-36 md:w-44 border-r bg-background/80 backdrop-blur-xs flex flex-col shrink-0">
            <div className="flex items-center justify-between border-b px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <span>Pages ({pageCount})</span>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setSidebarOpen(false)}
                title="Hide Thumbnails"
                aria-label="Hide Thumbnails"
              >
                <PanelLeftClose className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {Array.from({ length: pageCount }, (_, index) => {
                const pNum = index + 1;
                return (
                  <PdfThumbnail
                    key={pNum}
                    pdfDoc={pdfDoc}
                    pageNumber={pNum}
                    isActive={currentPage === pNum}
                    onClick={() => goToPage(pNum)}
                    rotation={rotation}
                  />
                );
              })}
            </div>
          </aside>
        )}

        {/* Floating Button to open sidebar if closed */}
        {!sidebarOpen && (
          <div className="absolute top-3 left-3 z-20">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setSidebarOpen(true)}
              className="bg-background shadow-md border"
              title="Show Thumbnails"
              aria-label="Show Thumbnails"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Center Viewport */}
        <main
          ref={containerRef}
          className="flex-1 overflow-auto p-4 sm:p-8 flex items-start justify-center"
        >
          <div className="my-auto transition-transform duration-100">
            <PdfPage
              pdfDoc={pdfDoc}
              pageNumber={currentPage}
              scale={scale}
              rotation={rotation}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
