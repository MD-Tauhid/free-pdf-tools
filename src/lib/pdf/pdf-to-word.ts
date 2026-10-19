import {
  Document,
  HeadingLevel,
  Paragraph,
  Packer,
  TextRun,
  type ParagraphChild,
} from "docx";
import type { PDFDocumentProxy } from "pdfjs-dist";

interface PdfJsTextItem {
  str: string;
  dir: string;
  transform: number[];
  width: number;
  height: number;
  fontName: string;
}

interface PdfJsTextStyle {
  fontFamily?: string;
}

export interface PdfTextSpan {
  text: string;
  x: number;
  y: number;
  width: number;
  fontSize: number;
  fontName: string;
  fontFamily: string;
  bold: boolean;
  italics: boolean;
  direction: string;
}

export interface ExtractedPdfPage {
  pageNumber: number;
  spans: PdfTextSpan[];
  hasVerticalText?: boolean;
}

export interface PdfTextParagraph {
  pageNumber: number;
  spans: PdfTextSpan[];
  text: string;
  headingLevel: 1 | 2 | null;
  rightToLeft: boolean;
  bulletList: boolean;
}

export interface PdfToWordResult {
  blob: Blob;
  pageCount: number;
  extractedPages: number;
  warning: string | null;
}

function getTextSpan(
  item: PdfJsTextItem,
  styles: Record<string, PdfJsTextStyle>
): PdfTextSpan | null {
  const [a, b, c, d, x, y] = item.transform;
  if (
    !item.str.trim() ||
    ![a, b, c, d, x, y, item.width, item.height].every(Number.isFinite)
  ) {
    return null;
  }
  const fontSize = Math.max(Math.hypot(c, d), Math.abs(item.height), 1);
  const fontName = item.fontName ?? "";
  const style = styles[fontName];
  const normalizedFontName = `${fontName} ${style?.fontFamily ?? ""}`;

  return {
    text: item.str,
    x,
    y,
    width: item.width,
    fontSize,
    fontName,
    fontFamily: style?.fontFamily || "Arial",
    bold: /bold|black|heavy|demi|semibold/i.test(normalizedFontName),
    italics: /italic|oblique/i.test(normalizedFontName),
    direction: item.dir,
  };
}

export async function extractPdfText(
  pdf: PDFDocumentProxy,
  onPage?: (pageNumber: number, pageCount: number) => void
): Promise<ExtractedPdfPage[]> {
  const pages: ExtractedPdfPage[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const spans = content.items.flatMap((item) =>
      "str" in item
        ? [getTextSpan(item as PdfJsTextItem, content.styles)].filter(
            (span): span is PdfTextSpan => span !== null
          )
        : []
    );
    pages.push({
      pageNumber,
      spans: spans.filter((span) => span.direction !== "ttb"),
      hasVerticalText: content.items.some(
        (item) => "str" in item && (item as PdfJsTextItem).dir === "ttb"
      ),
    });
    onPage?.(pageNumber, pdf.numPages);
  }
  return pages;
}

function groupSpansIntoLines(spans: PdfTextSpan[]): PdfTextSpan[][] {
  const ordered = [...spans].sort((left, right) => {
    const baselineDifference = right.y - left.y;
    if (Math.abs(baselineDifference) > 2) return baselineDifference;
    return left.direction === "rtl"
      ? right.x - left.x
      : left.x - right.x;
  });
  const lines: PdfTextSpan[][] = [];

  for (const span of ordered) {
    const line = lines.find((candidate) => {
      const baseline = candidate.reduce((sum, current) => sum + current.y, 0) /
        candidate.length;
      const maxFontSize = Math.max(
        span.fontSize,
        ...candidate.map((current) => current.fontSize)
      );
      return Math.abs(baseline - span.y) <= Math.max(2, maxFontSize * 0.35);
    });
    if (line) line.push(span);
    else lines.push([span]);
  }

  return lines
    .map((line) =>
      line.sort((left, right) =>
        left.direction === "rtl" ? right.x - left.x : left.x - right.x
      )
    )
    .sort((left, right) => {
      const leftY = left.reduce((sum, span) => sum + span.y, 0) / left.length;
      const rightY = right.reduce((sum, span) => sum + span.y, 0) / right.length;
      return rightY - leftY;
    });
}

function addDetectedSpacing(line: PdfTextSpan[]): PdfTextSpan[] {
  return line.map((span, index) => {
    if (index === 0) return span;
    const previous = line[index - 1];
    const gap = span.x - (previous.x + previous.width);
    const needsSpace =
      !previous.text.endsWith(" ") &&
      !span.text.startsWith(" ") &&
      (span.direction === "rtl"
        ? previous.x - (span.x + span.width) > Math.max(1, span.fontSize * 0.15)
        : gap > Math.max(1, span.fontSize * 0.15));
    return needsSpace ? { ...span, text: ` ${span.text}` } : span;
  });
}

function lineBaseline(line: PdfTextSpan[]): number {
  return line.reduce((sum, span) => sum + span.y, 0) / line.length;
}

function lineFontSize(line: PdfTextSpan[]): number {
  const sizes = line.map((span) => span.fontSize).sort((a, b) => a - b);
  return sizes[Math.floor(sizes.length / 2)] ?? 10;
}

function detectHeadingLevel(
  spans: PdfTextSpan[],
  bodyFontSize: number
): 1 | 2 | null {
  const size = Math.max(...spans.map((span) => span.fontSize));
  const text = spans.map((span) => span.text).join("").trim();
  if (!text || text.length > 120) return null;
  if (size >= bodyFontSize * 1.6) return 1;
  if (size >= bodyFontSize * 1.25) return 2;
  if (
    spans.some((span) => span.bold) &&
    text.length <= 90 &&
    !/[.!?]$/.test(text)
  ) {
    return 2;
  }
  return null;
}

export function buildPdfTextParagraphs(
  pages: ExtractedPdfPage[]
): PdfTextParagraph[] {
  const allSizes = pages.flatMap((page) =>
    page.spans.map((span) => span.fontSize)
  ).sort((left, right) => left - right);
  const bodyFontSize = allSizes[Math.floor(allSizes.length / 2)] ?? 10;
  const paragraphs: PdfTextParagraph[] = [];

  for (const page of pages) {
    const lines = groupSpansIntoLines(page.spans);
    let current: PdfTextSpan[] = [];
    let previousLine: PdfTextSpan[] | null = null;
    let paragraphLineCount = 0;

    const flush = () => {
      if (current.length === 0) return;
      const text = current.map((span) => span.text).join("");
      const headingLevel = detectHeadingLevel(current, bodyFontSize);
      const bulletList = /^[\s\u00a0]*[•▪◦‣]\s*/u.test(text);
      const paragraphSpans = bulletList
        ? current.map((span, index) =>
            index === 0
              ? { ...span, text: span.text.replace(/^[\s\u00a0]*[•▪◦‣]\s*/u, "") }
              : span
          )
        : current;
      paragraphs.push({
        pageNumber: page.pageNumber,
        spans: paragraphSpans,
        text,
        headingLevel,
        rightToLeft: current.some((span) => span.direction === "rtl"),
        bulletList,
      });
      current = [];
      paragraphLineCount = 0;
    };

    for (const line of lines) {
      const lineSize = lineFontSize(line);
      const headingLevel = detectHeadingLevel(line, bodyFontSize);
      const baselineGap = previousLine
        ? lineBaseline(previousLine) - lineBaseline(line)
        : 0;
      const previousSize = previousLine ? lineFontSize(previousLine) : lineSize;
      const indentDifference = previousLine
        ? Math.abs(line[0].x - previousLine[0].x)
        : 0;
      const startsNewParagraph =
        previousLine !== null &&
        (baselineGap > previousSize * 1.7 ||
          indentDifference > previousSize * 1.8 ||
          (headingLevel !== null && paragraphLineCount > 0) ||
          detectHeadingLevel(previousLine, bodyFontSize) !== null);

      if (startsNewParagraph) flush();
      if (current.length > 0) {
        current.push({ ...line[0], text: " " });
      }
      current.push(...addDetectedSpacing(line));
      paragraphLineCount += 1;
      previousLine = line;
    }
    flush();
  }

  return paragraphs;
}

export async function createDocxFromPdfText(
  pages: ExtractedPdfPage[]
): Promise<Blob> {
  const paragraphs = buildPdfTextParagraphs(pages);
  if (paragraphs.length === 0) {
    throw new Error(
      "No selectable text was found. This PDF may be scanned or image-only; OCR is not available."
    );
  }

  let previousPage = paragraphs[0].pageNumber;
  const documentParagraphs = paragraphs.map((paragraph, index) => {
    const children: ParagraphChild[] = [];
    for (const span of paragraph.spans) {
      if (!span.text) continue;
      children.push(
        new TextRun({
          text: span.text,
          bold: span.bold,
          italics: span.italics,
          font: span.fontFamily,
          size: Math.max(16, Math.min(96, Math.round(span.fontSize * 2))),
        })
      );
    }
    const pageBreakBefore = index > 0 && paragraph.pageNumber !== previousPage;
    previousPage = paragraph.pageNumber;

    return new Paragraph({
      children,
      heading:
        paragraph.headingLevel === 1
          ? HeadingLevel.HEADING_1
          : paragraph.headingLevel === 2
            ? HeadingLevel.HEADING_2
            : undefined,
      bullet: paragraph.bulletList ? { level: 0 } : undefined,
      bidirectional: paragraph.rightToLeft,
      pageBreakBefore,
      spacing: { after: 100 },
    });
  });

  const doc = new Document({
    sections: [{ children: documentParagraphs }],
  });
  return Packer.toBlob(doc);
}

export async function convertPdfToWord(
  file: File,
  onPage?: (pageNumber: number, pageCount: number) => void
): Promise<PdfToWordResult> {
  const [{ loadPdfDocument }, { validatePdfFile, validatePdfMagicBytes }] =
    await Promise.all([
      import("@/lib/pdf/load-pdf"),
      import("@/lib/validation/file-validation"),
    ]);
  const fileValidation = validatePdfFile(file);
  if (!fileValidation.valid) {
    throw new Error(fileValidation.error?.message ?? "Choose a valid PDF file.");
  }
  const buffer = await file.arrayBuffer();
  const magicValidation = validatePdfMagicBytes(buffer);
  if (!magicValidation.valid) {
    throw new Error(
      magicValidation.error?.message ?? "The selected file is not a valid PDF."
    );
  }

  const pdf = await loadPdfDocument(buffer);
  try {
    if (pdf.numPages > 200) {
      throw new Error(
        "This browser converter supports PDFs with up to 200 pages."
      );
    }
    const pages = await extractPdfText(pdf, onPage);
    const paragraphs = buildPdfTextParagraphs(pages);
    if (paragraphs.length === 0) {
      throw new Error(
        "No selectable text was found. This PDF may be scanned or image-only; OCR is not available."
      );
    }
    const blob = await createDocxFromPdfText(pages);
    const emptyPages = pages
      .filter((page) => page.spans.length === 0)
      .map((page) => page.pageNumber);
    const warning =
      [
        emptyPages.length > 0
          ? `No selectable text was found on page${emptyPages.length === 1 ? "" : "s"} ${emptyPages.join(", ")}. Scanned pages are not converted because OCR is not available.`
          : null,
        pages.some((page) => page.hasVerticalText)
          ? "Some vertically oriented text could not be included in the Word document."
          : null,
      ]
        .filter((message): message is string => message !== null)
        .join(" ") || null;
    return {
      blob,
      pageCount: pdf.numPages,
      extractedPages: pages.length - emptyPages.length,
      warning,
    };
  } finally {
    await pdf.loadingTask.destroy();
  }
}
