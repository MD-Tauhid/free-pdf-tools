import assert from "node:assert";
import { validatePdfFile, validatePdfMagicBytes } from "@/lib/validation/file-validation";
import { pdfToScreen, screenToPdf, calculateFitWidthScale, calculateFitPageScale } from "@/lib/pdf/coordinates";
import { FILE_LIMITS } from "@/lib/security/file-limits";

console.log("=== Running Phase 3 Unit Tests ===");

// 1. Test validatePdfFile
console.log("Testing validatePdfFile...");

// Valid PDF
const validFile = new File(["dummy content"], "sample.pdf", { type: "application/pdf" });
const validRes = validatePdfFile(validFile);
assert.strictEqual(validRes.valid, true, "Valid PDF should pass validation");

// Invalid extension
const invalidExtFile = new File(["dummy"], "malware.exe", { type: "application/octet-stream" });
const invalidExtRes = validatePdfFile(invalidExtFile);
assert.strictEqual(invalidExtRes.valid, false);
assert.strictEqual(invalidExtRes.error?.code, "INVALID_TYPE");

// Empty file (0 bytes)
const emptyFile = new File([], "empty.pdf", { type: "application/pdf" });
const emptyRes = validatePdfFile(emptyFile);
assert.strictEqual(emptyRes.valid, false);
assert.strictEqual(emptyRes.error?.code, "CORRUPTED");

// Oversized file
const fakeLargeFile = {
  name: "huge.pdf",
  size: FILE_LIMITS.MAX_FILE_SIZE_BYTES + 1024,
  type: "application/pdf",
} as unknown as File;
const largeRes = validatePdfFile(fakeLargeFile);
assert.strictEqual(largeRes.valid, false);
assert.strictEqual(largeRes.error?.code, "FILE_TOO_LARGE");

console.log("✓ validatePdfFile passed all cases");

// 2. Test validatePdfMagicBytes
console.log("Testing validatePdfMagicBytes...");

// Valid header: %PDF-1.7
const validBuffer = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]).buffer;
const magicRes = validatePdfMagicBytes(validBuffer);
assert.strictEqual(magicRes.valid, true, "Valid magic bytes should pass");

// Invalid header: PNG header
const pngBuffer = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).buffer;
const invalidMagicRes = validatePdfMagicBytes(pngBuffer);
assert.strictEqual(invalidMagicRes.valid, false);
assert.strictEqual(invalidMagicRes.error?.code, "CORRUPTED");

console.log("✓ validatePdfMagicBytes passed all cases");

// 3. Test Coordinates Transformations
console.log("Testing Coordinate transformations...");

const pageHeight = 792; // Standard Letter height in points
const scale = 1.5;

// Bottom-left origin (0, 0) in PDF should map to bottom in Screen space
const screenPt = pdfToScreen(0, 0, pageHeight, scale);
assert.strictEqual(screenPt.x, 0);
assert.strictEqual(screenPt.y, pageHeight * scale);

// Top-left origin in PDF (0, pageHeight) should map to (0, 0) in Screen space
const topScreenPt = pdfToScreen(0, pageHeight, pageHeight, scale);
assert.strictEqual(topScreenPt.x, 0);
assert.strictEqual(topScreenPt.y, 0);

// Round-trip screenToPdf -> pdfToScreen
const origPdfX = 150;
const origPdfY = 300;
const mappedScreen = pdfToScreen(origPdfX, origPdfY, pageHeight, scale);
const roundTripPdf = screenToPdf(mappedScreen.x, mappedScreen.y, pageHeight, scale);

assert.ok(Math.abs(roundTripPdf.x - origPdfX) < 0.001, "X coordinate should round-trip accurately");
assert.ok(Math.abs(roundTripPdf.y - origPdfY) < 0.001, "Y coordinate should round-trip accurately");

console.log("✓ Coordinate conversions passed round-trip checks");

// 4. Test Fit calculations
console.log("Testing calculateFitWidthScale & calculateFitPageScale...");

const fitWidth = calculateFitWidthScale(1000, 612, 48); // 952 / 612 ~ 1.55
assert.ok(fitWidth > 1.5 && fitWidth < 1.6, `Expected scale ~1.55, got ${fitWidth}`);

const fitPage = calculateFitPageScale(1000, 1000, 612, 792, 64); // 936 / 792 ~ 1.18
assert.ok(fitPage > 1.1 && fitPage < 1.25, `Expected scale ~1.18, got ${fitPage}`);

console.log("✓ Fit scale calculations passed");

console.log("=== All Phase 3 Unit Tests Passed Successfully ===");
