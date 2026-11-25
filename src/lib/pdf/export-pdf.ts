import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
  type RGB,
} from "pdf-lib";
import {
  type EditorAnnotation,
  type PdfPoint,
  type TextReplacement,
  type PdfFontFamily,
  PDF_FONT_FAMILIES,
  getCssFontFamily,
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

/**
 * Map a logical font family + style flags to a pdf-lib StandardFonts key.
 * pdf-lib supports the 14 standard PDF built-in fonts without embedding.
 */
function getStandardFontKey(
  family: PdfFontFamily | string | undefined,
  bold: boolean,
  italic: boolean
): StandardFonts {
  const norm = (family || "").toLowerCase().replace(/[\s-_]/g, "");
  // Check mapped option from PDF_FONT_FAMILIES
  const match = PDF_FONT_FAMILIES.find(
    (f) =>
      f.value.toLowerCase() === norm ||
      f.label.toLowerCase().replace(/[\s-_/]/g, "").includes(norm)
  );

  const target = match ? match.pdfStandardFont : (
    norm.includes("times") || norm.includes("georgia") || norm.includes("garamond") || norm.includes("serif")
      ? "TimesRoman"
      : norm.includes("courier") || norm.includes("mono")
        ? "Courier"
        : "Helvetica"
  );

  if (target === "TimesRoman") {
    if (bold && italic) return StandardFonts.TimesRomanBoldItalic;
    if (bold) return StandardFonts.TimesRomanBold;
    if (italic) return StandardFonts.TimesRomanItalic;
    return StandardFonts.TimesRoman;
  }

  if (target === "Courier") {
    if (bold && italic) return StandardFonts.CourierBoldOblique;
    if (bold) return StandardFonts.CourierBold;
    if (italic) return StandardFonts.CourierOblique;
    return StandardFonts.Courier;
  }

  if (bold && italic) return StandardFonts.HelveticaBoldOblique;
  if (bold) return StandardFonts.HelveticaBold;
  if (italic) return StandardFonts.HelveticaOblique;
  return StandardFonts.Helvetica;
}

function getTextFont(
  pdf: PDFDocument,
  bold: boolean,
  italic: boolean,
  family: PdfFontFamily | string = "Helvetica"
): Promise<PDFFont> {
  return pdf.embedFont(getStandardFontKey(family, bold, italic));
}

function canFontEncode(font: PDFFont, text: string): boolean {
  try {
    font.widthOfTextAtSize(text, 12);
    return true;
  } catch {
    return false;
  }
}

const MINIMAL_1X1_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

/**
 * Render arbitrary Unicode text (e.g. Bangla or non-WinAnsi scripts)
 * to a high-DPI transparent PNG for embedding into the PDF document.
 */
export function renderTextToPng(
  text: string,
  fontSizePt: number,
  fontFamily: string = "Helvetica",
  color: string = "#000000",
  bold = false,
  italic = false
): { bytes: Uint8Array; widthPt: number; heightPt: number } {
  // Headless / Node.js test environment fallback
  if (typeof document === "undefined") {
    const bytes = Uint8Array.from(atob(MINIMAL_1X1_PNG_BASE64), (c) =>
      c.charCodeAt(0)
    );
    const estimatedWidth = Math.max(1, text.length * fontSizePt * 0.55);
    const estimatedHeight = Math.max(1, fontSizePt * 1.25);
    return { bytes, widthPt: estimatedWidth, heightPt: estimatedHeight };
  }

  const scale = 4; // High DPI (288 DPI) for crisp print fidelity
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    const bytes = Uint8Array.from(atob(MINIMAL_1X1_PNG_BASE64), (c) =>
      c.charCodeAt(0)
    );
    return {
      bytes,
      widthPt: Math.max(1, text.length * fontSizePt * 0.55),
      heightPt: Math.max(1, fontSizePt * 1.25),
    };
  }

  const fontStyle = italic ? "italic " : "";
  const fontWeight = bold ? "bold " : "normal";
  const resolvedCssFamily = getCssFontFamily(fontFamily);
  const fallback =
    "'Noto Sans Bengali', 'SolaimanLipi', Kalpurush, 'Siyam Rupali', Vrinda, 'Bangla Sangam MN', 'Segoe UI', Arial, sans-serif";
  const fontSpec = `${fontStyle}${fontWeight}${Math.round(fontSizePt * scale)}px ${resolvedCssFamily}, ${fallback}`;

  ctx.font = fontSpec;
  const metrics = ctx.measureText(text);
  const textWidthPx = Math.max(1, Math.ceil(metrics.width));
  const heightPt = fontSizePt * 1.3;
  const heightPx = Math.max(1, Math.ceil(heightPt * scale));

  canvas.width = textWidthPx;
  canvas.height = heightPx;

  // Canvas resize clears context state, so re-apply font and style
  ctx.font = fontSpec;
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.fillText(text, 0, heightPx / 2);

  const dataUrl = canvas.toDataURL("image/png");
  const prefix = "data:image/png;base64,";
  const base64 = dataUrl.startsWith(prefix) ? dataUrl.slice(prefix.length) : "";
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const widthPt = textWidthPx / scale;

  return { bytes, widthPt, heightPt };
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
      const font = await getTextFont(pdf, annotation.bold, annotation.italic, annotation.fontFamily);
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
      const isBangla = annotation.fontFamily === "Bangla";
      for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        if (!line) continue;
        const textY = y + height - annotation.fontSize - index * lineHeight;
        if (!isBangla && canFontEncode(font, line)) {
          page.drawText(line, {
            x: x + 2,
            y: textY,
            size: annotation.fontSize,
            font,
            color: parseColor(annotation.color),
            opacity: annotation.opacity,
            maxWidth: Math.max(1, width - 4),
          });
          if (annotation.underline) {
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
        } else {
          // Render Unicode/Bangla text via high-resolution canvas PNG embed
          const rendered = renderTextToPng(
            line,
            annotation.fontSize,
            annotation.fontFamily,
            annotation.color,
            annotation.bold,
            annotation.italic
          );
          const image = await pdf.embedPng(rendered.bytes);
          const maxLineWidth = Math.max(1, width - 4);
          const drawWidth = Math.min(rendered.widthPt, maxLineWidth);
          const drawHeight = (drawWidth / Math.max(1, rendered.widthPt)) * rendered.heightPt;
          page.drawImage(image, {
            x: x + 2,
            y: textY - Math.max(0, (drawHeight - annotation.fontSize) / 2),
            width: drawWidth,
            height: drawHeight,
            opacity: annotation.opacity,
          });
          if (annotation.underline) {
            page.drawLine({
              start: { x: x + 2, y: textY - 1 },
              end: { x: x + 2 + drawWidth, y: textY - 1 },
              thickness: Math.max(0.5, annotation.fontSize / 16),
              color: parseColor(annotation.color),
              opacity: annotation.opacity,
            });
          }
        }
      }
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
        if (canFontEncode(font, annotation.typedText)) {
          page.drawText(annotation.typedText, {
            x: annotation.pdfRect.x,
            y: annotation.pdfRect.y,
            size: annotation.pdfRect.height,
            font,
            color: parseColor(annotation.strokeColor),
            opacity: annotation.opacity,
          });
        } else {
          const rendered = renderTextToPng(
            annotation.typedText,
            annotation.pdfRect.height,
            "TimesRoman",
            annotation.strokeColor,
            false,
            true
          );
          const image = await pdf.embedPng(rendered.bytes);
          const maxW = annotation.pdfRect.width;
          const drawW = Math.min(rendered.widthPt, maxW);
          const drawH = (drawW / Math.max(1, rendered.widthPt)) * rendered.heightPt;
          page.drawImage(image, {
            x: annotation.pdfRect.x,
            y: annotation.pdfRect.y,
            width: drawW,
            height: Math.min(drawH, annotation.pdfRect.height),
            opacity: annotation.opacity,
          });
        }
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

  const fontFamily = replacement.fontFamily ?? "Helvetica";
  const bold = replacement.bold ?? false;
  const italic = replacement.italic ?? false;
  const rect = replacement.pdfRect;
  const pageWidth = page.getSize().width;
  const maxAllowedWidth = Math.max(rect.width, pageWidth - rect.x - 2);

  const font = await getTextFont(pdf, bold, italic, fontFamily);
  const isBanglaFont = fontFamily === "Bangla";
  const canVector = !isBanglaFont && canFontEncode(font, replacement.replacementText);

  if (canVector) {
    const textWidth = font.widthOfTextAtSize(
      replacement.replacementText,
      replacement.fontSize
    );
    const expandedWidth = Math.max(
      rect.width,
      Math.min(textWidth + 4, maxAllowedWidth)
    );
    const expandedHeight = Math.max(rect.height, replacement.fontSize * 1.25);
    const topEdge = rect.y + rect.height;
    const drawY = Math.max(0, topEdge - expandedHeight);

    // Draw background wipe rectangle to cover original PDF text and expanded area
    page.drawRectangle({
      x: rect.x - 1,
      y: drawY - 1,
      width: expandedWidth + 2,
      height: expandedHeight + 2,
      color: parseColor(replacement.backgroundColor),
    });

    page.drawText(replacement.replacementText, {
      x: rect.x,
      y: drawY + Math.max(0, (expandedHeight - replacement.fontSize) / 2),
      size: replacement.fontSize,
      font,
      color: parseColor(replacement.color),
      maxWidth: Math.max(1, expandedWidth - 2),
    });
  } else {
    // Non-WinAnsi script (e.g. Bangla Unicode) or explicit Bangla font
    const rendered = renderTextToPng(
      replacement.replacementText,
      replacement.fontSize,
      fontFamily,
      replacement.color,
      bold,
      italic
    );
    const expandedWidth = Math.max(
      rect.width,
      Math.min(rendered.widthPt + 4, maxAllowedWidth)
    );
    const expandedHeight = Math.max(rect.height, rendered.heightPt);
    const topEdge = rect.y + rect.height;
    const rectY = Math.max(0, topEdge - expandedHeight);

    page.drawRectangle({
      x: rect.x - 1,
      y: rectY - 1,
      width: expandedWidth + 2,
      height: expandedHeight + 2,
      color: parseColor(replacement.backgroundColor),
    });

    const image = await pdf.embedPng(rendered.bytes);
    const drawWidth = Math.min(rendered.widthPt, Math.max(1, expandedWidth - 2));
    const drawHeight = (drawWidth / Math.max(1, rendered.widthPt)) * rendered.heightPt;
    const drawY = rectY + Math.max(0, (expandedHeight - drawHeight) / 2);
    page.drawImage(image, {
      x: rect.x,
      y: drawY,
      width: drawWidth,
      height: Math.min(drawHeight, expandedHeight + 2),
    });
  }
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
