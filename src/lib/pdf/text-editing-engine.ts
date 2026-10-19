import type { PDFDocumentProxy } from "@/types/pdf";
import type { ExtractedTextItem, TextReplacement } from "@/types/editor";

export interface TextEditAssessment {
  supported: boolean;
  warnings: string[];
}

export interface PdfTextExtractor {
  extractPage(
    document: PDFDocumentProxy,
    pageNumber: number
  ): Promise<ExtractedTextItem[]>;
}

export interface PdfLayoutAnalyzer {
  assess(item: ExtractedTextItem, replacementText?: string): TextEditAssessment;
}

export interface PdfExportService {
  export(
    source: ArrayBuffer,
    replacements: TextReplacement[],
    annotationsByPage?: Record<number, import("@/types/editor").EditorAnnotation[]>
  ): Promise<Uint8Array>;
}

export interface PdfEditingEngine {
  textExtractor: PdfTextExtractor;
  layoutAnalyzer: PdfLayoutAnalyzer;
  exportService: PdfExportService;
}

export function assessTextReplacement(
  item: ExtractedTextItem,
  replacementText?: string
): TextEditAssessment {
  const warnings: string[] = [];
  const angle = Math.atan2(item.transform[1], item.transform[0]);
  const rotationDegrees = Math.abs((angle * 180) / Math.PI);
  const horizontal = Math.min(rotationDegrees, 360 - rotationDegrees) < 0.5;
  const hasBounds =
    Number.isFinite(item.pdfRect.x) &&
    Number.isFinite(item.pdfRect.y) &&
    item.pdfRect.width > 0 &&
    item.pdfRect.height > 0;
  const singleLine =
    replacementText === undefined || !/[\r\n]/.test(replacementText);

  if (!item.text.trim() || !hasBounds) {
    warnings.push("This text span does not have usable text and position data.");
  }
  if (!horizontal) {
    warnings.push(
      "Rotated text is not supported. Select an unrotated text span instead."
    );
  }
  if (replacementText !== undefined && /[\r\n]/.test(replacementText)) {
    warnings.push(
      "Replace one extracted text span at a time; line breaks and paragraph reflow are not supported."
    );
  }
  if (
    replacementText !== undefined &&
    replacementText.length > item.text.length
  ) {
    warnings.push(
      "The replacement is longer than the original and may not fit its fixed-width span. Export checks the actual font width."
    );
  }
  warnings.push(
    "The source background color cannot be detected automatically. Choose a matching solid color; image, gradient, table, or patterned backgrounds may show a patch."
  );
  warnings.push(
    "This is a visual cover, not secure redaction. The original text remains in the PDF content and may still be recoverable."
  );
  warnings.push(
    "Replacement uses a standard Helvetica font; original embedded font styling is not preserved."
  );

  return {
    supported:
      horizontal &&
      hasBounds &&
      item.text.trim().length > 0 &&
      singleLine,
    warnings,
  };
}

export function createPdfEditingEngine(
  textExtractor: PdfTextExtractor,
  exportService: PdfExportService
): PdfEditingEngine {
  return {
    textExtractor,
    layoutAnalyzer: { assess: assessTextReplacement },
    exportService,
  };
}
