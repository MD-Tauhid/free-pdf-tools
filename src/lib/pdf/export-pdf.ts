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
  TextReplacement,
} from "@/types/editor";
import {
  assessTextReplacement,
  type PdfExportService,
} from "@/lib/pdf/text-editing-engine";

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

async function applyTextReplacement(
  pdf: PDFDocument,
  page: PDFPage,
  replacement: TextReplacement
): Promise<void> {
  const assessment = assessTextReplacement(
    replacement.originalItem,
    replacement.replacementText
  );
  if (!assessment.supported) {
    throw new Error(assessment.warnings[0] ?? "This text span cannot be replaced.");
  }
  if (!replacement.replacementText.trim()) {
    throw new Error("Replacement text cannot be empty.");
  }
  if (/[\r\n]/.test(replacement.replacementText)) {
    throw new Error(
      "Replacement text must fit on one line. Paragraph reflow is not supported."
    );
  }
  if (
    !Number.isFinite(replacement.fontSize) ||
    replacement.fontSize < 1 ||
    replacement.fontSize > 72
  ) {
    throw new Error("Replacement font size must be between 1 and 72 points.");
  }
  if (
    replacement.pageNumber !== replacement.originalItem.pageNumber ||
    replacement.sourceItemId !== replacement.originalItem.id
  ) {
    throw new Error(
      "The selected text span changed. Select the text again before exporting."
    );
  }

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  let textWidth: number;
  try {
    textWidth = font.widthOfTextAtSize(
      replacement.replacementText,
      replacement.fontSize
    );
  } catch {
    throw new Error(
      "Helvetica cannot encode some characters in this replacement. Use Latin-1 text or add the text as a regular annotation."
    );
  }
  const availableWidth = replacement.pdfRect.width - 2;
  if (textWidth > availableWidth) {
    throw new Error(
      `Replacement text is too wide for this span (${textWidth.toFixed(1)} pt needed, ${availableWidth.toFixed(1)} pt available). Shorten the text or reduce its font size.`
    );
  }

  const rect = replacement.pdfRect;
  page.drawRectangle({
    x: rect.x - 1,
    y: rect.y - 1,
    width: rect.width + 2,
    height: rect.height + 2,
    color: parseColor(replacement.backgroundColor),
  });
  page.drawText(replacement.replacementText, {
    x: rect.x,
    y: rect.y + Math.max(0, (rect.height - replacement.fontSize) / 2),
    size: replacement.fontSize,
    font,
    color: parseColor(replacement.color),
    maxWidth: availableWidth,
  });
}

/**
 * Applies annotations and visual text covers to a fresh copy of the source PDF.
 * Covered source glyphs remain in the PDF content stream; this is not redaction.
 */
export async function exportPdfWithAnnotations(
  source: ArrayBuffer,
  annotationsByPage: Record<number, EditorAnnotation[]>,
  replacements: TextReplacement[] = []
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(new Uint8Array(source.slice(0)));
  const pageCount = pdf.getPageCount();

  for (const replacement of replacements) {
    const pageNumber = replacement.pageNumber;
    if (
      !Number.isInteger(pageNumber) ||
      pageNumber < 1 ||
      pageNumber > pageCount
    ) {
      throw new Error(
        `Text replacement references invalid PDF page ${pageNumber}.`
      );
    }
    await applyTextReplacement(pdf, pdf.getPage(pageNumber - 1), replacement);
  }

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

export const pdfLibExportService: PdfExportService = {
  export: (source, replacements, annotationsByPage = {}) =>
    exportPdfWithAnnotations(source, annotationsByPage, replacements),
};
