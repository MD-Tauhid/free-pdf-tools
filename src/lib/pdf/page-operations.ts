import {
  PDFDocument,
  StandardFonts,
  degrees,
  rgb,
  type RGB,
} from "pdf-lib";

export interface MergeFileInput {
  data: ArrayBuffer | Uint8Array;
  name?: string;
  pageIndices?: number[]; // 0-based page indices to include. If omitted, all pages are included.
}

export interface WatermarkOptions {
  text?: string;
  imageDataUrl?: string;
  fontSize?: number;
  fontColor?: string; // hex color string, e.g. "#94a3b8"
  opacity?: number; // 0.0 to 1.0
  rotationDegrees?: number; // e.g. 45
  pageFilter?: "all" | "odd" | "even" | number[]; // 1-based page numbers
}

export interface SplitResult {
  filename: string;
  data: Uint8Array;
  pageCount: number;
}

export interface CompressResult {
  data: Uint8Array;
  originalSize: number;
  compressedSize: number;
  savingsPercent: number;
}

/**
 * Parses user-friendly page range strings into a sorted, unique list of 1-based page numbers.
 * Examples: "1-3, 5, 8-10" -> [1, 2, 3, 5, 8, 9, 10]
 */
export function parsePageRange(rangeStr: string, totalPages: number): number[] {
  if (!rangeStr.trim()) {
    return [];
  }

  const pages = new Set<number>();
  const parts = rangeStr.split(",").map((s) => s.trim()).filter(Boolean);

  for (const part of parts) {
    if (part.includes("-")) {
      const [startStr, endStr] = part.split("-").map((s) => s.trim());
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);

      if (isNaN(start) || isNaN(end) || start < 1 || end < start) {
        continue;
      }

      for (let p = start; p <= Math.min(end, totalPages); p += 1) {
        pages.add(p);
      }
    } else {
      const page = parseInt(part, 10);
      if (!isNaN(page) && page >= 1 && page <= totalPages) {
        pages.add(page);
      }
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
}

/**
 * Merges multiple PDF files into a single unified document in sequential order.
 */
export async function mergePdfDocuments(
  files: MergeFileInput[]
): Promise<Uint8Array> {
  if (files.length === 0) {
    throw new Error("At least one PDF file is required to perform a merge.");
  }

  const mergedDoc = await PDFDocument.create();

  for (const file of files) {
    const srcDoc = await PDFDocument.load(file.data, { ignoreEncryption: true });
    const pageCount = srcDoc.getPageCount();

    const indicesToCopy = file.pageIndices
      ? file.pageIndices.filter((idx) => idx >= 0 && idx < pageCount)
      : Array.from({ length: pageCount }, (_, i) => i);

    if (indicesToCopy.length > 0) {
      const copiedPages = await mergedDoc.copyPages(srcDoc, indicesToCopy);
      for (const page of copiedPages) {
        mergedDoc.addPage(page);
      }
    }
  }

  if (mergedDoc.getPageCount() === 0) {
    throw new Error("No pages could be extracted from the provided files.");
  }

  return await mergedDoc.save({ useObjectStreams: true });
}

/**
 * Splits a PDF document.
 * In 'single' mode: creates one combined PDF containing only the chosen pages.
 * In 'individual' mode: returns an array of separate single-page PDF documents.
 */
export async function splitPdfDocument(
  pdfData: ArrayBuffer | Uint8Array,
  selectedPages1Based: number[],
  mode: "single" | "individual" = "single",
  baseFilename = "document"
): Promise<SplitResult[]> {
  const srcDoc = await PDFDocument.load(pdfData, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();

  const validPages = selectedPages1Based.filter(
    (p) => Number.isInteger(p) && p >= 1 && p <= totalPages
  );

  if (validPages.length === 0) {
    throw new Error("No valid pages were selected for extraction.");
  }

  const cleanBase = baseFilename.replace(/\.pdf$/i, "");

  if (mode === "single") {
    const destDoc = await PDFDocument.create();
    const zeroBasedIndices = validPages.map((p) => p - 1);
    const copiedPages = await destDoc.copyPages(srcDoc, zeroBasedIndices);
    for (const page of copiedPages) {
      destDoc.addPage(page);
    }
    const data = await destDoc.save({ useObjectStreams: true });
    return [
      {
        filename: `${cleanBase}_extracted.pdf`,
        data,
        pageCount: destDoc.getPageCount(),
      },
    ];
  }

  // Individual mode: each chosen page becomes its own document
  const results: SplitResult[] = [];
  for (const pageNum of validPages) {
    const destDoc = await PDFDocument.create();
    const [copiedPage] = await destDoc.copyPages(srcDoc, [pageNum - 1]);
    destDoc.addPage(copiedPage);
    const data = await destDoc.save({ useObjectStreams: true });
    results.push({
      filename: `${cleanBase}_page_${pageNum}.pdf`,
      data,
      pageCount: 1,
    });
  }

  return results;
}

/**
 * Permanently rotates pages in a PDF document.
 * `pageRotations`: can be a single number (applied to all pages, e.g. 90, 180, 270)
 * or a mapping of 1-based page numbers to rotation offsets (e.g. { 1: 90, 3: 180 }).
 */
export async function rotatePdfPages(
  pdfData: ArrayBuffer | Uint8Array,
  pageRotations: number | Record<number, number>
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfData, { ignoreEncryption: true });
  const totalPages = doc.getPageCount();

  for (let pageNum = 1; pageNum <= totalPages; pageNum += 1) {
    const delta =
      typeof pageRotations === "number"
        ? pageRotations
        : pageRotations[pageNum] ?? 0;

    if (delta !== 0) {
      const page = doc.getPage(pageNum - 1);
      const currentRotation = page.getRotation().angle;
      const newAngle = ((currentRotation + delta) % 360 + 360) % 360;
      page.setRotation(degrees(newAngle));
    }
  }

  return await doc.save({ useObjectStreams: true });
}

/**
 * Reorders and/or deletes pages in a PDF document according to the provided sequence.
 * `pageOrder1Based`: an array of 1-based page numbers representing the new page sequence.
 * Example: to keep only pages 1 and 3 in reverse order: [3, 1].
 */
export async function reorderAndDeletePages(
  pdfData: ArrayBuffer | Uint8Array,
  pageOrder1Based: number[]
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(pdfData, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();

  const validPages = pageOrder1Based.filter(
    (p) => Number.isInteger(p) && p >= 1 && p <= totalPages
  );

  if (validPages.length === 0) {
    throw new Error("Resulting document must contain at least one valid page.");
  }

  const destDoc = await PDFDocument.create();
  const zeroBasedIndices = validPages.map((p) => p - 1);
  const copiedPages = await destDoc.copyPages(srcDoc, zeroBasedIndices);

  for (const page of copiedPages) {
    destDoc.addPage(page);
  }

  return await destDoc.save({ useObjectStreams: true });
}

/**
 * Compresses a PDF document by enabling object streams and rebuilding the PDF structure.
 * Returns the compressed data along with size comparison metrics.
 */
export async function compressPdfDocument(
  pdfData: ArrayBuffer | Uint8Array
): Promise<CompressResult> {
  const originalSize = pdfData.byteLength;
  const doc = await PDFDocument.load(pdfData, { ignoreEncryption: true });

  // Save with compressed object streams
  const data = await doc.save({
    useObjectStreams: true,
    addDefaultPage: false,
  });

  const compressedSize = data.byteLength;
  const savings = originalSize - compressedSize;
  const savingsPercent = originalSize > 0
    ? Math.max(0, Math.round((savings / originalSize) * 100))
    : 0;

  return {
    data,
    originalSize,
    compressedSize,
    savingsPercent,
  };
}

function parseHexColor(hex: string): RGB {
  const clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16) / 255;
    const g = parseInt(clean[1] + clean[1], 16) / 255;
    const b = parseInt(clean[2] + clean[2], 16) / 255;
    return rgb(r, g, b);
  }
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16) / 255;
    const g = parseInt(clean.slice(2, 4), 16) / 255;
    const b = parseInt(clean.slice(4, 6), 16) / 255;
    return rgb(r, g, b);
  }
  return rgb(0.5, 0.5, 0.5);
}

function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; isPng: boolean } {
  const match = /^data:(image\/(png|jpe?g));base64,(.+)$/.exec(dataUrl);
  if (!match) {
    throw new Error("Watermark image must be a valid PNG or JPEG data URL.");
  }
  const isPng = match[2] === "png";
  const binary = atob(match[3]);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return { bytes, isPng };
}

function shouldWatermarkPage(
  pageNum: number,
  filter?: "all" | "odd" | "even" | number[]
): boolean {
  if (!filter || filter === "all") return true;
  if (filter === "odd") return pageNum % 2 !== 0;
  if (filter === "even") return pageNum % 2 === 0;
  if (Array.isArray(filter)) return filter.includes(pageNum);
  return true;
}

/**
 * Applies a text or image watermark diagonally across PDF pages.
 */
export async function addWatermarkToPdf(
  pdfData: ArrayBuffer | Uint8Array,
  options: WatermarkOptions
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfData, { ignoreEncryption: true });
  const totalPages = doc.getPageCount();

  const opacity = Math.min(Math.max(options.opacity ?? 0.3, 0.05), 1.0);
  const rotationDegrees = options.rotationDegrees ?? 45;

  if (options.text) {
    const font = await doc.embedFont(StandardFonts.HelveticaBold);
    const color = parseHexColor(options.fontColor || "#64748b");
    const fontSize = options.fontSize || 48;

    for (let pageNum = 1; pageNum <= totalPages; pageNum += 1) {
      if (!shouldWatermarkPage(pageNum, options.pageFilter)) continue;

      const page = doc.getPage(pageNum - 1);
      const { width, height } = page.getSize();
      const textWidth = font.widthOfTextAtSize(options.text, fontSize);
      const textHeight = font.heightAtSize(fontSize);

      // Center the text on the page with rotation
      const rad = (rotationDegrees * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      // Compute centered position
      const centerX = width / 2;
      const centerY = height / 2;
      const x = centerX - (textWidth / 2) * cos + (textHeight / 2) * sin;
      const y = centerY - (textWidth / 2) * sin - (textHeight / 2) * cos;

      page.drawText(options.text, {
        x,
        y,
        size: fontSize,
        font,
        color,
        opacity,
        rotate: degrees(rotationDegrees),
      });
    }
  } else if (options.imageDataUrl) {
    const { bytes, isPng } = dataUrlToBytes(options.imageDataUrl);
    const image = isPng
      ? await doc.embedPng(bytes)
      : await doc.embedJpg(bytes);

    for (let pageNum = 1; pageNum <= totalPages; pageNum += 1) {
      if (!shouldWatermarkPage(pageNum, options.pageFilter)) continue;

      const page = doc.getPage(pageNum - 1);
      const { width, height } = page.getSize();

      const maxDim = Math.min(width, height) * 0.5;
      const imgDims = image.scaleToFit(maxDim, maxDim);

      const x = (width - imgDims.width) / 2;
      const y = (height - imgDims.height) / 2;

      page.drawImage(image, {
        x,
        y,
        width: imgDims.width,
        height: imgDims.height,
        opacity,
        rotate: degrees(rotationDegrees),
      });
    }
  } else {
    throw new Error("Either watermark text or an image data URL must be provided.");
  }

  return await doc.save({ useObjectStreams: true });
}
