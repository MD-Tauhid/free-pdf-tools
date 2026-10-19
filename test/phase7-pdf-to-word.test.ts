import assert from "node:assert/strict";
import {
  buildPdfTextParagraphs,
  createDocxFromPdfText,
  type ExtractedPdfPage,
  type PdfTextSpan,
} from "@/lib/pdf/pdf-to-word";

console.log("=== Running Phase 7 PDF-to-Word tests ===");

function span(
  text: string,
  x: number,
  y: number,
  options: Partial<PdfTextSpan> = {}
): PdfTextSpan {
  return {
    text,
    x,
    y,
    width: text.length * 5,
    fontSize: 10,
    fontName: "Arial",
    fontFamily: "Arial",
    bold: false,
    italics: false,
    direction: "ltr",
    ...options,
  };
}

const pages: ExtractedPdfPage[] = [
  {
    pageNumber: 1,
    spans: [
      span("Report", 20, 700, { fontSize: 20, bold: true }),
      span("Hello", 20, 675),
      span("world", 52, 675),
      span("continued", 20, 660),
      span("• Item", 20, 630),
      span("Italic", 20, 610, { italics: true }),
    ],
  },
  { pageNumber: 2, spans: [span("Second page", 20, 700)] },
];

const paragraphs = buildPdfTextParagraphs(pages);
assert.equal(paragraphs[0].headingLevel, 1);
assert.equal(paragraphs[0].text, "Report");
assert.equal(paragraphs[1].text, "Hello world continued");
assert.equal(paragraphs[2].bulletList, true);
assert.equal(paragraphs[2].spans[0].text, "Item");
assert.equal(paragraphs[3].spans[0].italics, true);
assert.equal(paragraphs.at(-1)?.pageNumber, 2);
console.log("✓ Paragraph grouping, inferred headings, spacing, lists, and run styles");

const docxBlob = await createDocxFromPdfText(pages);
const docxBytes = new Uint8Array(await docxBlob.arrayBuffer());
assert.equal(String.fromCharCode(...docxBytes.slice(0, 4)), "PK\u0003\u0004");
assert.ok(docxBytes.byteLength > 500);
await assert.rejects(
  createDocxFromPdfText([{ pageNumber: 1, spans: [] }]),
  /No selectable text/
);
console.log("✓ DOCX archive output and scanned-only document rejection");
console.log("=== Phase 7 PDF-to-Word tests passed ===");
