import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { exportPdfWithAnnotations } from "@/lib/pdf/export-pdf";
import {
  pdfPointToViewport,
  pdfRectToViewportRect,
  viewportPointToPdf,
} from "@/lib/pdf/coordinates";
import { usePdfEditorStore } from "@/stores/pdf-editor-store";
import type { EditorAnnotation } from "@/types/editor";

console.log("=== Running Phase 4 editor foundation tests ===");

const viewport = {
  scale: 2,
  convertToViewportPoint(x: number, y: number) {
    return [2 * y, 2 * x];
  },
  convertToPdfPoint(x: number, y: number) {
    return [y / 2, x / 2];
  },
};
const point = { x: 30, y: 10 };
const screenPoint = pdfPointToViewport(point, viewport);
assert.deepEqual(screenPoint, { x: 20, y: 60 });
assert.deepEqual(viewportPointToPdf(screenPoint, viewport), point);
assert.deepEqual(
  pdfRectToViewportRect(
    { x: 10, y: 20, width: 30, height: 40 },
    viewport
  ),
  { x: 40, y: 20, width: 80, height: 60 }
);
console.log("✓ Viewport coordinate conversion supports rotated pages and zoom");

const store = usePdfEditorStore.getState();
store.clearAllAnnotations();
store.addAnnotation({
  id: "history-check",
  type: "highlight",
  pageNumber: 1,
  pdfRect: { x: 10, y: 10, width: 20, height: 10 },
  color: "#FFFF00",
  opacity: 0.4,
  coveredItemIds: [],
});
assert.equal(store.canUndo(), true);
store.undo();
assert.equal(store.getAnnotationsForPage(1).length, 0);
store.redo();
assert.equal(store.getAnnotationsForPage(1).length, 1);
store.updateAnnotation({
  ...store.getAnnotationsForPage(1)[0],
  type: "highlight",
  color: "#00FF00",
  opacity: 0.4,
  coveredItemIds: [],
});
store.undo();
assert.equal(store.getAnnotationsForPage(1)[0].type, "highlight");
assert.equal(store.canRedo(), true);
store.redo();
store.removeAnnotation("history-check", 1);
assert.equal(store.getAnnotationsForPage(1).length, 0);
store.undo();
assert.equal(store.getAnnotationsForPage(1).length, 1);
store.setActiveTool("draw");
store.clearAllAnnotations();
assert.equal(usePdfEditorStore.getState().activeTool, "select");
console.log("✓ Annotation add/update/remove undo and redo");

const original = await PDFDocument.create();
const originalPage = original.addPage([612, 792]);
originalPage.drawText("Original content", { x: 24, y: 750 });
original.addPage([612, 792]);
const sourceBytes = await original.save();
const sourceBuffer = sourceBytes.slice().buffer as ArrayBuffer;

const annotations: EditorAnnotation[] = [
  {
    id: "textbox",
    type: "text-box",
    pageNumber: 1,
    pdfRect: { x: 40, y: 620, width: 180, height: 42 },
    content: "Added text",
    fontSize: 14,
    fontFamily: "Helvetica",
    color: "#123456",
    bold: true,
    italic: false,
    underline: true,
    backgroundColor: "#FFFFCC",
    opacity: 1,
  },
  {
    id: "highlight",
    type: "highlight",
    pageNumber: 1,
    pdfRect: { x: 30, y: 580, width: 160, height: 18 },
    color: "#FFFF00",
    opacity: 0.4,
    coveredItemIds: [],
  },
  {
    id: "draw",
    type: "draw",
    pageNumber: 1,
    pdfRect: { x: 50, y: 500, width: 70, height: 20 },
    points: [
      { x: 50, y: 500 },
      { x: 70, y: 520 },
      { x: 120, y: 505 },
    ],
    strokeColor: "#FF0000",
    strokeWidth: 2,
    opacity: 1,
  },
  {
    id: "signature",
    type: "signature",
    pageNumber: 1,
    pdfRect: { x: 180, y: 450, width: 100, height: 30 },
    points: [
      { x: 180, y: 450 },
      { x: 220, y: 480 },
      { x: 280, y: 455 },
    ],
    typedText: null,
    strokeColor: "#111827",
    strokeWidth: 2,
    opacity: 1,
  },
  {
    id: "image",
    type: "image",
    pageNumber: 2,
    pdfRect: { x: 40, y: 40, width: 80, height: 80 },
    dataUrl:
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/Z5kAAAAASUVORK5CYII=",
    mimeType: "image/png",
    opacity: 1,
  },
];

const exportedBytes = await exportPdfWithAnnotations(sourceBuffer, {
  1: annotations.filter((annotation) => annotation.pageNumber === 1),
  2: annotations.filter((annotation) => annotation.pageNumber === 2),
});
const exported = await PDFDocument.load(exportedBytes);
assert.equal(exported.getPageCount(), 2);
assert.ok(exportedBytes.byteLength > sourceBytes.byteLength);
assert.ok(exported.getPage(0).node.Contents());
assert.ok(exported.getPage(1).node.Contents());
await assert.rejects(
  exportPdfWithAnnotations(sourceBuffer, {
    3: [annotations[0]],
  }),
  /invalid PDF page/
);
console.log("✓ All annotation types export to the original document");
console.log("=== Phase 4 editor foundation tests passed ===");
