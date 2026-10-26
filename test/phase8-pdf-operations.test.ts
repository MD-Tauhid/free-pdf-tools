import assert from "node:assert/strict";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import {
  parsePageRange,
  mergePdfDocuments,
  splitPdfDocument,
  rotatePdfPages,
  reorderAndDeletePages,
  compressPdfDocument,
  addWatermarkToPdf,
} from "@/lib/pdf/page-operations";

console.log("=== Running Phase 8 PDF operations tests ===");

// 1. Page range parser
const parsed = parsePageRange(" 1-3, 5, 8-10, 15 ", 10);
assert.deepEqual(parsed, [1, 2, 3, 5, 8, 9, 10]);
assert.deepEqual(parsePageRange("", 5), []);
assert.deepEqual(parsePageRange("abc, -1, 0, 99", 5), []);
assert.deepEqual(parsePageRange("2-4, 3-5", 6), [2, 3, 4, 5]);
console.log("✓ parsePageRange correctly parses ranges, deduplicates, and clamps bounds");

// Helper to create test PDF with labeled pages
async function createTestPdf(pageCount: number, prefix = "Page"): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= pageCount; i += 1) {
    const page = doc.addPage([400, 600]);
    page.drawText(`${prefix} ${i}`, { x: 50, y: 500, size: 24, font, color: rgb(0, 0, 0) });
  }
  return await doc.save();
}

// 2. Merge PDF documents
const pdfA = await createTestPdf(2, "DocA");
const pdfB = await createTestPdf(3, "DocB");

const mergedBytes = await mergePdfDocuments([
  { data: pdfA, name: "A.pdf" },
  { data: pdfB, name: "B.pdf" },
]);
const mergedDoc = await PDFDocument.load(mergedBytes);
assert.equal(mergedDoc.getPageCount(), 5);

// Test merge with selective indices
const selectiveMerge = await mergePdfDocuments([
  { data: pdfA, pageIndices: [0] },
  { data: pdfB, pageIndices: [1, 2] },
]);
const selectiveDoc = await PDFDocument.load(selectiveMerge);
assert.equal(selectiveDoc.getPageCount(), 3);

await assert.rejects(mergePdfDocuments([]), /At least one PDF file/);
console.log("✓ mergePdfDocuments combines multiple documents and selective pages");

// 3. Split PDF document
const fourPagePdf = await createTestPdf(4, "SplitTest");

// Single extracted document mode
const singleSplit = await splitPdfDocument(fourPagePdf, [2, 4], "single", "test.pdf");
assert.equal(singleSplit.length, 1);
assert.equal(singleSplit[0].filename, "test_extracted.pdf");
assert.equal(singleSplit[0].pageCount, 2);
const splitDocLoaded = await PDFDocument.load(singleSplit[0].data);
assert.equal(splitDocLoaded.getPageCount(), 2);

// Individual pages mode
const individualSplit = await splitPdfDocument(fourPagePdf, [1, 3], "individual", "report.pdf");
assert.equal(individualSplit.length, 2);
assert.equal(individualSplit[0].filename, "report_page_1.pdf");
assert.equal(individualSplit[0].pageCount, 1);
assert.equal(individualSplit[1].filename, "report_page_3.pdf");
assert.equal(individualSplit[1].pageCount, 1);

await assert.rejects(splitPdfDocument(fourPagePdf, [99], "single"), /No valid pages/);
console.log("✓ splitPdfDocument extracts selected ranges into single or individual PDFs");

// 4. Rotate pages permanently
const threePagePdf = await createTestPdf(3, "RotateTest");

// Rotate all pages by 90 degrees
const rotatedAllBytes = await rotatePdfPages(threePagePdf, 90);
const rotatedAllDoc = await PDFDocument.load(rotatedAllBytes);
assert.equal(rotatedAllDoc.getPage(0).getRotation().angle, 90);
assert.equal(rotatedAllDoc.getPage(1).getRotation().angle, 90);
assert.equal(rotatedAllDoc.getPage(2).getRotation().angle, 90);

// Rotate specific pages: page 1 by 90, page 2 by 180, page 3 untouched
const rotatedSpecificBytes = await rotatePdfPages(threePagePdf, { 1: 90, 2: 180 });
const rotatedSpecificDoc = await PDFDocument.load(rotatedSpecificBytes);
assert.equal(rotatedSpecificDoc.getPage(0).getRotation().angle, 90);
assert.equal(rotatedSpecificDoc.getPage(1).getRotation().angle, 180);
assert.equal(rotatedSpecificDoc.getPage(2).getRotation().angle, 0);
console.log("✓ rotatePdfPages applies document-wide and per-page permanent rotation");

// 5. Reorder and Delete pages
const reorderedBytes = await reorderAndDeletePages(fourPagePdf, [3, 1]);
const reorderedDoc = await PDFDocument.load(reorderedBytes);
assert.equal(reorderedDoc.getPageCount(), 2);

await assert.rejects(reorderAndDeletePages(fourPagePdf, []), /at least one valid page/);
await assert.rejects(reorderAndDeletePages(fourPagePdf, [10, 20]), /at least one valid page/);
console.log("✓ reorderAndDeletePages rearranges page sequence and removes deleted pages");

// 6. Compress PDF document
const compressiblePdf = await createTestPdf(3, "Compressible");
const compressResult = await compressPdfDocument(compressiblePdf);
assert.ok(compressResult.compressedSize > 0);
assert.equal(typeof compressResult.savingsPercent, "number");
const compressedDoc = await PDFDocument.load(compressResult.data);
assert.equal(compressedDoc.getPageCount(), 3);
console.log("✓ compressPdfDocument optimizes streams and returns comparison metrics");

// 7. Watermark PDF
const watermarkedBytes = await addWatermarkToPdf(threePagePdf, {
  text: "CONFIDENTIAL",
  fontSize: 40,
  fontColor: "#ef4444",
  opacity: 0.35,
  rotationDegrees: 45,
  pageFilter: "odd",
});
const watermarkedDoc = await PDFDocument.load(watermarkedBytes);
assert.equal(watermarkedDoc.getPageCount(), 3);

// 1x1 transparent red PNG data URL for image watermark test
const tinyPngDataUrl =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const imgWatermarkedBytes = await addWatermarkToPdf(threePagePdf, {
  imageDataUrl: tinyPngDataUrl,
  opacity: 0.5,
  rotationDegrees: 0,
  pageFilter: [1, 2],
});
const imgWatermarkedDoc = await PDFDocument.load(imgWatermarkedBytes);
assert.equal(imgWatermarkedDoc.getPageCount(), 3);

await assert.rejects(
  addWatermarkToPdf(threePagePdf, {}),
  /Either watermark text or an image data URL/
);
console.log("✓ addWatermarkToPdf embeds text and image watermarks with page filtering");

console.log("=== Phase 8 PDF operations tests passed ===");
