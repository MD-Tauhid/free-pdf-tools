import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { exportPdfWithAnnotations } from "@/lib/pdf/export-pdf";
import { assessTextReplacement } from "@/lib/pdf/text-editing-engine";
import { usePdfEditorStore } from "@/stores/pdf-editor-store";
import type { ExtractedTextItem, TextReplacement } from "@/types/editor";

console.log("=== Running Phase 5 text editing tests ===");

const item: ExtractedTextItem = {
  id: "p1-t0",
  text: "Hello",
  transform: [10, 0, 0, 10, 24, 100],
  width: 40,
  height: 12,
  fontName: "ExampleSubset",
  pdfRect: { x: 24, y: 98, width: 40, height: 12 },
  pageNumber: 1,
};

function replacement(text: string): TextReplacement {
  return {
    id: "replacement-1",
    type: "text-replacement",
    sourceItemId: item.id,
    originalItem: item,
    originalText: item.text,
    replacementText: text,
    fontSize: 10,
    color: "#000000",
    backgroundColor: "#FFFFFF",
    pageNumber: 1,
    pdfRect: item.pdfRect,
  };
}

const rotatedItem: ExtractedTextItem = {
  ...item,
  transform: [0, 10, -10, 0, 24, 100],
};
assert.equal(assessTextReplacement(rotatedItem, "Replacement").supported, false);
assert.equal(assessTextReplacement(item, "two\nlines").supported, false);
assert.ok(assessTextReplacement(item, "two\nlines").warnings.some((warning) =>
  warning.includes("line breaks")
));
console.log("✓ Layout assessment identifies rotated text and multiline warnings");

const store = usePdfEditorStore.getState();
store.clearAllAnnotations();
store.setReplacementPreview(replacement("Preview"));
assert.equal(usePdfEditorStore.getState().replacementPreview?.replacementText, "Preview");
store.setReplacementPreview(null);
assert.equal(usePdfEditorStore.getState().replacementPreview, null);

store.applyTextReplacement(replacement("First"));
assert.equal(store.getTextReplacementsForPage(1)[0].replacementText, "First");
store.applyTextReplacement(replacement("Second"));
store.undo();
assert.equal(store.getTextReplacementsForPage(1)[0].replacementText, "First");
store.redo();
assert.equal(store.getTextReplacementsForPage(1)[0].replacementText, "Second");
store.removeTextReplacement(item.id, 1);
assert.equal(store.getTextReplacementsForPage(1).length, 0);
store.undo();
assert.equal(store.getTextReplacementsForPage(1)[0].replacementText, "Second");
store.clearAllAnnotations();
assert.equal(store.getTextReplacementsForPage(1).length, 0);
console.log("✓ Replacement previews, apply/revert, reset, undo, and redo");

const document = await PDFDocument.create();
document.addPage([612, 792]).drawText("Hello", { x: 24, y: 100 });
const source = (await document.save()).slice().buffer as ArrayBuffer;

const exportedBytes = await exportPdfWithAnnotations(
  source,
  {},
  [replacement("Hi")]
);
const exported = await PDFDocument.load(exportedBytes);
assert.equal(exported.getPageCount(), 1);
assert.ok(exportedBytes.byteLength > source.byteLength);

// Test export with custom font family and bold/italic styles
const timesExported = await exportPdfWithAnnotations(
  source,
  {},
  [{ ...replacement("Times"), fontFamily: "TimesRoman", bold: true, italic: true }]
);
assert.ok(timesExported.byteLength > source.byteLength);

const courierExported = await exportPdfWithAnnotations(
  source,
  {},
  [{ ...replacement("Code"), fontFamily: "Courier", bold: false, italic: true }]
);
assert.ok(courierExported.byteLength > source.byteLength);
console.log("✓ Export with multiple font families (TimesRoman, Courier) and styles");

// Test local languages: German, Spanish, French (WinAnsi vector fonts)
const germanExported = await exportPdfWithAnnotations(
  source,
  {},
  [{ ...replacement("Grüße"), fontFamily: "Helvetica" }]
);
assert.ok(germanExported.byteLength > source.byteLength);

const spanishExported = await exportPdfWithAnnotations(
  source,
  {},
  [{ ...replacement("¡Olé!"), fontFamily: "TimesRoman" }]
);
assert.ok(spanishExported.byteLength > source.byteLength);

const frenchExported = await exportPdfWithAnnotations(
  source,
  {},
  [{ ...replacement("Déjà"), fontFamily: "Georgia" }]
);
assert.ok(frenchExported.byteLength > source.byteLength);
console.log("✓ Export supports European local languages (German, Spanish, French)");

// Test Bangla Unicode script export via high-res canvas/PNG embedding
const banglaExported = await exportPdfWithAnnotations(
  source,
  {},
  [{ ...replacement("বাংলা"), fontFamily: "Bangla", fontSize: 10 }]
);
assert.ok(banglaExported.byteLength > source.byteLength);

// Test Bangla in a text box annotation
const banglaTextBoxExported = await exportPdfWithAnnotations(
  source,
  {
    1: [
      {
        id: "tb-bangla",
        type: "text-box",
        pageNumber: 1,
        pdfRect: { x: 50, y: 50, width: 100, height: 40 },
        content: "বাংলা টেক্সট\nদ্বিতীয় লাইন",
        fontSize: 12,
        fontFamily: "Bangla",
        color: "#000000",
        bold: false,
        italic: false,
        underline: true,
        backgroundColor: "#ffffff",
        opacity: 1,
      },
    ],
  },
  []
);
assert.ok(banglaTextBoxExported.byteLength > source.byteLength);
console.log("✓ Export supports Bangla local language (বাংলা) in replacements and text boxes");

await assert.rejects(
  exportPdfWithAnnotations(source, {}, [replacement("A replacement much too long")]),
  /too wide/
);
await assert.rejects(
  exportPdfWithAnnotations(source, {}, [
    { ...replacement("একটি অনেক বড় বাংলা লেখা যা স্প্যানে ধরে না"), fontFamily: "Bangla" },
  ]),
  /too wide/
);
await assert.rejects(
  exportPdfWithAnnotations(source, {}, [replacement("two\nlines")]),
  /line breaks/
);
await assert.rejects(
  exportPdfWithAnnotations(source, {}, [
    { ...replacement("Rotated"), originalItem: rotatedItem },
  ]),
  /Rotated text is not supported/
);
console.log("✓ Replacement export, overflow, rotation, multiline, and language guards");
console.log("=== Phase 5 text editing tests passed ===");
