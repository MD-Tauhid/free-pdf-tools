import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
  type RGB,
} from "pdf-lib";
import type {
  EditorAnnotation,
  PdfPoint,
} from "@/types/editor";

function parseColor(value: string): RGB {
  const match = /^#([\da-f]{3}|[\da-f]{6})$/i.exec(value);
  if (!match) {
    throw new Error(`Unsupported annotation color: ${value}`);
  }
  const hex =
    match[1].length === 3
      ? [...match[1]].map((digit) => `${digit}${digit}`).join("")
      : match[1];
  const channels = [0, 2, 4].map((offset) =>
    parseInt(hex.slice(offset, offset + 2), 16) / 255
  );
  return rgb(channels[0], channels[1], channels[2]);
}

function getTextFont(
  pdf: PDFDocument,
  bold: boolean,
  italic: boolean
): Promise<PDFFont> {
  if (bold && italic) return pdf.embedFont(StandardFonts.HelveticaBoldOblique);
  if (bold) return pdf.embedFont(StandardFonts.HelveticaBold);
  if (italic) return pdf.embedFont(StandardFonts.HelveticaOblique);
  return pdf.embedFont(StandardFonts.Helvetica);
}

function dataUrlToBytes(dataUrl: string, mimeType: string): Uint8Array {
  const prefix = `data:${mimeType};base64,`;
  if (!dataUrl.startsWith(prefix)) {
    throw new Error(`Image data must be a base64 ${mimeType} data URL.`);
  }
  const binary = atob(dataUrl.slice(prefix.length));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function drawPath(
  page: PDFPage,
  points: PdfPoint[],
  color: RGB,
  strokeWidth: number,
  opacity: number
) {
  for (let index = 1; index < points.length; index += 1) {
    page.drawLine({
      start: points[index - 1],
      end: points[index],
      color,
      thickness: strokeWidth,
      opacity,
    });
  }
  if (points.length === 1) {
    const point = points[0];
    page.drawCircle({
      x: point.x,
      y: point.y,
      size: strokeWidth / 2,
      color,
      opacity,
    });
  }
}

async function drawAnnotation(
  pdf: PDFDocument,
  page: PDFPage,
  annotation: EditorAnnotation
): Promise<void> {
  switch (annotation.type) {
    case "text-box": {
      const font = await getTextFont(pdf, annotation.bold, annotation.italic);
      const { x, y, width, height } = annotation.pdfRect;
      if (annotation.backgroundColor) {
        page.drawRectangle({
          x,
          y,
          width,
          height,
          color: parseColor(annotation.backgroundColor),
          opacity: annotation.opacity,
        });
      }
      const lines = annotation.content.split(/\r?\n/);
      const lineHeight = annotation.fontSize * 1.3;
      lines.forEach((line, index) => {
        const textY = y + height - annotation.fontSize - index * lineHeight;
        page.drawText(line, {
          x: x + 2,
          y: textY,
          size: annotation.fontSize,
          font,
          color: parseColor(annotation.color),
          opacity: annotation.opacity,
          maxWidth: Math.max(1, width - 4),
        });
        if (annotation.underline && line) {
          const lineWidth = Math.min(
            font.widthOfTextAtSize(line, annotation.fontSize),
            width - 4
          );
          page.drawLine({
            start: { x: x + 2, y: textY - 1 },
            end: { x: x + 2 + lineWidth, y: textY - 1 },
            thickness: Math.max(0.5, annotation.fontSize / 16),
            color: parseColor(annotation.color),
            opacity: annotation.opacity,
          });
        }
      });
      return;
    }
    case "highlight":
      page.drawRectangle({
        ...annotation.pdfRect,
        color: parseColor(annotation.color),
        opacity: annotation.opacity,
      });
      return;
    case "draw":
      drawPath(
        page,
        annotation.points,
        parseColor(annotation.strokeColor),
        annotation.strokeWidth,
        annotation.opacity
      );
      return;
    case "signature":
      if (annotation.points) {
        drawPath(
          page,
          annotation.points,
          parseColor(annotation.strokeColor),
          annotation.strokeWidth,
          annotation.opacity
        );
      } else if (annotation.typedText) {
        const font = await pdf.embedFont(StandardFonts.TimesRomanItalic);
        page.drawText(annotation.typedText, {
          x: annotation.pdfRect.x,
          y: annotation.pdfRect.y,
          size: annotation.pdfRect.height,
          font,
          color: parseColor(annotation.strokeColor),
          opacity: annotation.opacity,
        });
      }
      return;
    case "image": {
      const bytes = dataUrlToBytes(annotation.dataUrl, annotation.mimeType);
      const image =
        annotation.mimeType === "image/png"
          ? await pdf.embedPng(bytes)
          : await pdf.embedJpg(bytes);
      page.drawImage(image, {
        ...annotation.pdfRect,
        opacity: annotation.opacity,
      });
      return;
    }
  }
}

/**
 * Applies supported editor overlays to a fresh copy of the source PDF.
 * Existing PDF text objects are deliberately left unchanged.
 */
export async function exportPdfWithAnnotations(
  source: ArrayBuffer,
  annotationsByPage: Record<number, EditorAnnotation[]>
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(new Uint8Array(source.slice(0)));
  const pageCount = pdf.getPageCount();

  for (const [pageKey, annotations] of Object.entries(annotationsByPage)) {
    const pageNumber = Number(pageKey);
    if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > pageCount) {
      throw new Error(`Annotation references invalid PDF page ${pageKey}.`);
    }
    const page = pdf.getPage(pageNumber - 1);
    for (const annotation of annotations) {
      await drawAnnotation(pdf, page, annotation);
    }
  }

  return pdf.save();
}
