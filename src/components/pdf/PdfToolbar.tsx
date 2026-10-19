"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  FolderOpen,
  Maximize2,
  Minimize,
  FileText,
} from "lucide-react";

interface PdfToolbarProps {
  fileName?: string | null;
  currentPage: number;
  pageCount: number;
  scale: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  onGoToPage: (page: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitWidth?: () => void;
  onFitPage?: () => void;
  onRotate: () => void;
  onReset: () => void;
  onDownload: () => void;
  className?: string;
}

function PageNumberInput({
  currentPage,
  pageCount,
  onGoToPage,
}: {
  currentPage: number;
  pageCount: number;
  onGoToPage: (page: number) => void;
}) {
  const [value, setValue] = React.useState<string>(String(currentPage));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= pageCount) {
      onGoToPage(parsed);
    } else {
      setValue(String(currentPage));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-1.5 text-xs">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSubmit}
        aria-label="Current Page Number"
        className="w-10 rounded-md border border-input bg-background py-1 text-center font-medium text-xs focus:border-blue-600 focus:outline-none"
      />
      <span className="text-muted-foreground">/ {pageCount || 1}</span>
    </form>
  );
}

export function PdfToolbar({
  fileName,
  currentPage,
  pageCount,
  scale,
  onPrevPage,
  onNextPage,
  onGoToPage,
  onZoomIn,
  onZoomOut,
  onFitWidth,
  onFitPage,
  onRotate,
  onReset,
  onDownload,
}: PdfToolbarProps) {
  const zoomPercent = Math.round(scale * 100);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-background/95 px-4 py-2.5 shadow-xs backdrop-blur-md">
      {/* Left: Document Info & New File */}
      <div className="flex items-center gap-2 min-w-0">
        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          className="gap-1.5 text-xs font-medium"
          title="Open a different PDF"
        >
          <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="hidden sm:inline">Open File</span>
        </Button>

        {fileName && (
          <div className="hidden md:flex items-center gap-1.5 pl-2 text-xs text-muted-foreground truncate max-w-xs border-l">
            <FileText className="h-3.5 w-3.5 shrink-0 text-blue-600" />
            <span className="truncate font-medium text-foreground">{fileName}</span>
          </div>
        )}
      </div>

      {/* Center: Pagination Navigation */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onPrevPage}
          disabled={currentPage <= 1}
          aria-label="Previous Page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <PageNumberInput
          key={currentPage}
          currentPage={currentPage}
          pageCount={pageCount}
          onGoToPage={onGoToPage}
        />

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onNextPage}
          disabled={currentPage >= pageCount}
          aria-label="Next Page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Right: Zoom, Rotate & Download Controls */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        <div className="flex items-center gap-0.5 border rounded-lg p-0.5 bg-muted/30">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onZoomOut}
            disabled={scale <= 0.3}
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>

          <span className="w-12 text-center text-xs font-semibold tabular-nums">
            {zoomPercent}%
          </span>

          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onZoomIn}
            disabled={scale >= 3.0}
            title="Zoom In"
            aria-label="Zoom In"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
        </div>

        {onFitWidth && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onFitWidth}
            title="Fit to Width"
            className="hidden sm:inline-flex"
            aria-label="Fit to Width"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        )}

        {onFitPage && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onFitPage}
            title="Fit to Page"
            className="hidden sm:inline-flex"
            aria-label="Fit to Page"
          >
            <Minimize className="h-3.5 w-3.5" />
          </Button>
        )}

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onRotate}
          title="Rotate 90° Clockwise"
          aria-label="Rotate Page"
        >
          <RotateCw className="h-3.5 w-3.5" />
        </Button>

        <Button
          variant="default"
          size="sm"
          onClick={onDownload}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium gap-1.5 text-xs shadow-xs ml-1"
          title="Download Current PDF"
        >
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Download</span>
        </Button>
      </div>
    </div>
  );
}
