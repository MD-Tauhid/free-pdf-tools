"use client";

import * as React from "react";
import type { PDFDocumentProxy } from "@/types/pdf";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface PdfThumbnailProps {
  pdfDoc: PDFDocumentProxy;
  pageNumber: number;
  isActive: boolean;
  onClick: () => void;
  rotation?: number;
  className?: string;
}

export function PdfThumbnail({
  pdfDoc,
  pageNumber,
  isActive,
  onClick,
  rotation = 0,
  className,
}: PdfThumbnailProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    let isCancelled = false;
    let renderTask: { cancel: () => void; promise: Promise<void> } | null = null;

    async function renderThumbnail() {
      setLoading(true);
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (isCancelled) return;

        // Base thumbnail scale
        const unscaledViewport = page.getViewport({ scale: 1.0, rotation });
        const targetWidth = 110;
        const scale = targetWidth / unscaledViewport.width;
        const viewport = page.getViewport({ scale, rotation });

        const canvas = canvasRef.current;
        if (!canvas || isCancelled) return;

        const context = canvas.getContext("2d", { alpha: false });
        if (!context) return;

        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const transform =
          pixelRatio !== 1 ? [pixelRatio, 0, 0, pixelRatio, 0, 0] : undefined;

        renderTask = page.render({
          canvas,
          canvasContext: context,
          viewport,
          transform,
        });

        await renderTask.promise;

        if (!isCancelled) {
          setLoading(false);
        }
      } catch (error: unknown) {
        const err = error as { name?: string };
        if (err.name !== "RenderingCancelledException" && !isCancelled) {
          setLoading(false);
        }
      }
    }

    renderThumbnail();

    return () => {
      isCancelled = true;
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdfDoc, pageNumber, rotation]);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
        isActive
          ? "bg-blue-50/80 dark:bg-blue-950/40 text-blue-600 font-semibold"
          : "hover:bg-muted text-muted-foreground hover:text-foreground",
        className
      )}
      aria-label={`Go to page ${pageNumber}`}
      aria-current={isActive ? "page" : undefined}
    >
      <div
        className={cn(
          "relative rounded-md overflow-hidden bg-white shadow-sm transition-all border",
          isActive
            ? "border-blue-600 ring-2 ring-blue-500/30 shadow-md"
            : "border-border group-hover:border-foreground/30"
        )}
      >
        <canvas ref={canvasRef} className="block" />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          </div>
        )}
      </div>
      <span className="text-xs">{pageNumber}</span>
    </button>
  );
}
