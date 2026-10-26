import { loadPdfDocument } from "@/lib/pdf/load-pdf";

export interface RenderedPageImage {
  pageNumber: number;
  dataUrl: string;
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

  const pdf = await loadPdfDocument(pdfData);
  const totalPages = pdf.numPages;

  const targetPages = pages
    ? pages.filter((p) => p >= 1 && p <= totalPages)
    : Array.from({ length: totalPages }, (_, i) => i + 1);

  const results: RenderedPageImage[] = [];

  for (let i = 0; i < targetPages.length; i += 1) {
    const pageNum = targetPages[i];
    onProgress?.(i + 1, targetPages.length);

    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    const context = canvas.getContext("2d", { alpha: format === "image/png" });
    if (!context) {
      throw new Error("Failed to acquire 2D canvas rendering context.");
    }

    // Fill with white background for JPEG exports or consistent rendering
    if (format === "image/jpeg") {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
    }

    const renderTask = page.render({
      canvas,
      canvasContext: context,
      viewport,
    });
    await renderTask.promise;

    const dataUrl = canvas.toDataURL(format, quality);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error("Failed to serialize canvas to Blob."));
        },
        format,
        quality
      );
    });

    results.push({
      pageNumber: pageNum,
      dataUrl,
      blob,
      width: canvas.width,
      height: canvas.height,
    });
  }

  return results;
}
