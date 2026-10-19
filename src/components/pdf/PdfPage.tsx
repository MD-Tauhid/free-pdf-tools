"use client";

import * as React from "react";
import type { PDFDocumentProxy, PDFPageProxy } from "@/types/pdf";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PdfPageProps {
  pdfDoc: PDFDocumentProxy;
  pageNumber: number;
  scale: number;
  rotation?: number;
  className?: string;
  onPageLoaded?: (page: PDFPageProxy) => void;
}

export function PdfPage({
  pdfDoc,
  pageNumber,
  scale,
  rotation = 0,
  className,
  onPageLoaded,
}: PdfPageProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [rendering, setRendering] = React.useState<boolean>(true);
  const [pageSize, setPageSize] = React.useState<{ width: number; height: number } | null>(null);

  React.useEffect(() => {
    let isCancelled = false;
    let renderTask: { cancel: () => void; promise: Promise<void> } | null = null;

    async function renderPage() {
      setRendering(true);

      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (isCancelled) return;

        if (onPageLoaded) {
          onPageLoaded(page);
        }

        // Preserve the PDF's own page rotation and apply the viewer adjustment.
        const effectiveRotation = ((page.rotate + rotation) % 360 + 360) % 360;
        const viewport = page.getViewport({ scale, rotation: effectiveRotation });
        setPageSize({ width: viewport.width, height: viewport.height });

        const canvas = canvasRef.current;
        if (!canvas || isCancelled) return;

        const context = canvas.getContext("2d", { alpha: false });
        if (!context) return;

        // Support Retina / HiDPI crisp rendering
        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const transform =
          pixelRatio !== 1 ? [pixelRatio, 0, 0, pixelRatio, 0, 0] : undefined;

        // Render PDF page to canvas
        renderTask = page.render({
          canvas,
          canvasContext: context,
          viewport,
          transform,
        });

        await renderTask.promise;

        if (!isCancelled) {
          setRendering(false);
        }
      } catch (error: unknown) {
        const err = error as { name?: string };
        // Silently ignore expected cancellation on rapid zoom/page changes
        if (err.name !== "RenderingCancelledException" && !isCancelled) {
          console.error(`Error rendering PDF page ${pageNumber}:`, error);
          setRendering(false);
        }
      }
    }

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdfDoc, pageNumber, scale, rotation, onPageLoaded]);

  return (
    <div
      className={cn(
        "relative mx-auto rounded-lg bg-white shadow-md ring-1 ring-black/10 dark:ring-white/10 select-none transition-all",
        className
      )}
      style={{
        width: pageSize ? pageSize.width : "auto",
        height: pageSize ? pageSize.height : "auto",
        minHeight: pageSize ? pageSize.height : 200,
      }}
    >
      <canvas ref={canvasRef} className="block rounded-lg" />

      {rendering && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[1px] rounded-lg">
          <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
        </div>
      )}

      {/* Page indicator pill */}
      <div className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white shadow pointer-events-none">
        Page {pageNumber}
      </div>
    </div>
  );
}
