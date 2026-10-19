import { pdfLibExportService } from "@/lib/pdf/export-pdf";
import { pdfJsTextExtractor } from "@/lib/pdf/extract-text";
import { createPdfEditingEngine } from "@/lib/pdf/text-editing-engine";

export const pdfEditingEngine = createPdfEditingEngine(
  pdfJsTextExtractor,
  pdfLibExportService
);
