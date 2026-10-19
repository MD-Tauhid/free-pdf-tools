import type { PDFDocumentProxy } from "@/types/pdf";
import type { ExtractedTextItem } from "@/types/editor";
import type { PdfTextExtractor } from "@/lib/pdf/text-editing-engine";

export async function extractPageTextItems(
  document: PDFDocumentProxy,
  pageNumber: number
): Promise<ExtractedTextItem[]> {
  const page = await document.getPage(pageNumber);
  const content = await page.getTextContent();
  const [minX, minY, maxX, maxY] = page.view;
  const items: ExtractedTextItem[] = [];
  let index = 0;

  for (const item of content.items) {
    if (!("str" in item) || !item.str.trim() || item.transform.length !== 6) {
      index += 1;
      continue;
    }

    const transform = item.transform as [
      number,
      number,
      number,
      number,
      number,
      number,
    ];
    const [, , c, d, tx, ty] = transform;
    const fontSize = Math.hypot(c, d) || Math.abs(item.height) || 10;
    const width = Math.abs(item.width);
    const height = Math.abs(item.height) || fontSize;
    const baselineY = ty;
    const pdfRect = {
      x: tx,
      y: baselineY - fontSize * 0.2,
      width,
      height: fontSize,
    };

    if (
      pdfRect.x + pdfRect.width < minX - 10 ||
      pdfRect.y + pdfRect.height < minY - 10 ||
      pdfRect.x > maxX + 10 ||
      pdfRect.y > maxY + 10
    ) {
      index += 1;
      continue;
    }

    items.push({
      id: `p${pageNumber}-t${index}`,
      text: item.str,
      transform,
      width,
      height,
      fontName: item.fontName,
      pdfRect,
      pageNumber,
    });
    index += 1;
  }
  return items;
}

export const pdfJsTextExtractor: PdfTextExtractor = {
  extractPage: extractPageTextItems,
};
