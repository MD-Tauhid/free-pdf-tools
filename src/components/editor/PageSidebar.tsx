"use client";

import * as React from "react";
import type { PDFDocumentProxy } from "@/types/pdf";
import { PdfThumbnail } from "@/components/pdf/PdfThumbnail";
import { Button } from "@/components/ui/button";
import { PanelLeftClose } from "lucide-react";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PageSidebarProps {
  pdfDoc: PDFDocumentProxy;
  pageCount: number;
  currentPage: number;
  rotation: number;
  onGoToPage: (page: number) => void;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PageSidebar({
  pdfDoc,
  pageCount,
  currentPage,
  rotation,
  onGoToPage,
  onClose,
}: PageSidebarProps) {
  // Auto-scroll active thumbnail into view
  const activeRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [currentPage]);

  return (
    <aside
      className="w-36 md:w-44 border-r bg-background/80 backdrop-blur-xs flex flex-col shrink-0"
      aria-label="Page thumbnails"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2 shrink-0">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Pages ({pageCount})
        </span>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onClose}
          title="Hide page panel"
          aria-label="Hide page panel"
        >
          <PanelLeftClose className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Thumbnail list */}
      <div
        className="flex-1 overflow-y-auto p-2 space-y-2"
        role="listbox"
        aria-label="PDF pages"
        aria-orientation="vertical"
      >
        {Array.from({ length: pageCount }, (_, i) => {
          const pNum = i + 1;
          const isActive = currentPage === pNum;
          return (
            <div
              key={pNum}
              ref={isActive ? activeRef : undefined}
              role="option"
              aria-selected={isActive}
            >
              <PdfThumbnail
                pdfDoc={pdfDoc}
                pageNumber={pNum}
                isActive={isActive}
                onClick={() => onGoToPage(pNum)}
                rotation={rotation}
              />
            </div>
          );
        })}
      </div>
    </aside>
  );
}
