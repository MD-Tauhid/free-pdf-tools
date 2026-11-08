"use client";

import * as React from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PagePreviewCardProps {
  pdfDoc: PDFDocumentProxy | null;
  pageNumber: number; // 1-based
  rotation?: number; // degrees
  className?: string;
  style?: React.CSSProperties;
}

export function PagePreviewCard({
  pdfDoc,
  pageNumber,
  rotation = 0,
  className,
  style,
}: PagePreviewCardProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [hasRendered, setHasRendered] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (!pdfDoc) {
      setLoading(false);
      return;
    }

    let isCancelled = false;
    let renderTask: { cancel: () => void; promise: Promise<void> } | null = null;

    async function renderPage() {
      if (!pdfDoc) return;
      setLoading(true);
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (isCancelled) return;

        // Render at base rotation (0); CSS handles dynamic rotation transforms smoothly
        const viewport = page.getViewport({ scale: 1.0 });
        const targetWidth = 140; // High enough resolution to look sharp on retina
        const scale = targetWidth / viewport.width;
        const scaledViewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        if (!canvas || isCancelled) return;

        const context = canvas.getContext("2d", { alpha: false });
        if (!context) return;

        const pixelRatio = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
        canvas.width = Math.floor(scaledViewport.width * pixelRatio);
        canvas.height = Math.floor(scaledViewport.height * pixelRatio);
        canvas.style.width = "100%";
        canvas.style.height = "100%";

        const transform = pixelRatio !== 1 ? [pixelRatio, 0, 0, pixelRatio, 0, 0] : undefined;

        renderTask = page.render({
          canvas,
          canvasContext: context,
          viewport: scaledViewport,
          transform,
        });

        await renderTask.promise;

        if (!isCancelled) {
          setLoading(false);
          setHasRendered(true);
        }
      } catch (err: unknown) {
        const error = err as { name?: string };
        if (error.name !== "RenderingCancelledException" && !isCancelled) {
          setLoading(false);
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
  }, [pdfDoc, pageNumber]);

  return (
    <div
      className={cn(
        "relative flex h-36 w-28 items-center justify-center rounded-lg border bg-muted/40 overflow-hidden shadow-2xs select-none",
        className
      )}
      style={style}
    >
      <div
        className="w-full h-full flex items-center justify-center p-1 transition-transform duration-250 ease-in-out"
        style={{
          transform: `rotate(${rotation}deg)`,
        }}
      >
        {pdfDoc ? (
          <>
            <canvas
              ref={canvasRef}
              className={cn(
                "max-h-full max-w-full object-contain rounded-xs shadow-2xs transition-opacity duration-200",
                loading && !hasRendered ? "opacity-0" : "opacity-100"
              )}
            />
            {loading && !hasRendered && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-muted/60">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <span className="text-[10px] text-muted-foreground font-mono">P.{pageNumber}</span>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-2 text-center">
            <FileText className="h-9 w-9 text-blue-600/70 mb-1" />
            <span className="text-[10px] font-bold text-foreground">
              P. {pageNumber}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

