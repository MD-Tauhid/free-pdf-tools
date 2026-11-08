import { loadPdfDocument } from "@/lib/pdf/load-pdf";

export interface RenderedPageImage {
  pageNumber: number;
  blob: Blob;
  width: number;
  height: number;
}

export interface PdfToImageOptions {
  format?: "image/png" | "image/jpeg";
  scale?: number; // Zoom/DPI scale: 1.0 = 72 DPI, 2.0 = 144 DPI (retina/print), default 1.5
  quality?: number; // 0.0 to 1.0 (applies to JPEG)
  pages?: number[]; // 1-based page numbers. If omitted, renders all pages.
  onProgress?: (current: number, total: number) => void;
}

/**
 * Renders PDF pages to high-resolution PNG or JPEG images in the browser.
 */
export async function renderPdfToImages(
  pdfData: ArrayBuffer,
  options: PdfToImageOptions = {}
): Promise<RenderedPageImage[]> {
  const {
    format = "image/png",
    scale = 1.5,
    quality = 0.92,
    pages,
    onProgress,
  } = options;

  if (format !== "image/png" && format !== "image/jpeg") {
    throw new Error("Image format must be PNG or JPEG.");
  }
  if (!Number.isFinite(scale) || scale <= 0 || scale > 4) {
    throw new Error("Image scale must be greater than 0 and no more than 4.");
  }
  if (!Number.isFinite(quality) || quality < 0 || quality > 1) {
    throw new Error("Image quality must be a number from 0 to 1.");
  }

  const pdf = await loadPdfDocument(pdfData);
  const totalPages = pdf.numPages;

  const targetPages = pages
    ? [...new Set(pages)].filter(
        (page) =>
          Number.isInteger(page) && page >= 1 && page <= totalPages
      )
    : Array.from({ length: totalPages }, (_, i) => i + 1);

  if (targetPages.length === 0) {
    await pdf.loadingTask.destroy();
    throw new Error("Select at least one valid page to render.");
  }

  const results: RenderedPageImage[] = [];

  try {
    for (let i = 0; i < targetPages.length; i += 1) {
      const pageNum = targetPages[i];
      onProgress?.(i + 1, targetPages.length);

      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const canvasWidth = Math.floor(viewport.width);
      const canvasHeight = Math.floor(viewport.height);
      if (canvasWidth < 1 || canvasHeight < 1) {
        throw new Error(`Page ${pageNum} has invalid image dimensions at the selected scale.`);
      }
      const canvas = document.createElement("canvas");
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      try {
        const context = canvas.getContext("2d", { alpha: format === "image/png" });
        if (!context) {
          throw new Error("Failed to acquire 2D canvas rendering context.");
        }

        if (format === "image/jpeg") {
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, canvas.width, canvas.height);
        }

        await page.render({
          canvas,
          canvasContext: context,
          viewport,
        }).promise;

        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (result) => {
              if (result) resolve(result);
              else reject(new Error("Failed to serialize canvas to Blob."));
            },
            format,
            quality
          );
        });

        results.push({
          pageNumber: pageNum,
          blob,
          width: canvas.width,
          height: canvas.height,
        });
      } finally {
        canvas.width = 0;
        canvas.height = 0;
        page.cleanup();
      }
    }
  } finally {
    await pdf.loadingTask.destroy();
  }

  return results;
}
