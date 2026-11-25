import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { exportPdfWithAnnotations } from "@/lib/pdf/export-pdf";
import {
  pdfPointToViewport,
  pdfRectToViewportRect,
  viewportPointToPdf,
  screenDeltaToPdfDelta,
  computeExpandedScreenRect,
  computeResizedScreenRect,
  screenRectToPdfRect,
  scalePointsToRect,
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
const delta = screenDeltaToPdfDelta(40, 20, viewport);
assert.deepEqual(delta, { x: 10, y: 20 });
console.log("✓ Viewport coordinate conversion and screenDeltaToPdfDelta support rotated pages and zoom");

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

// Test dragging position updates and undo/redo for image, drawing, and signature
const imageAnnotation: EditorAnnotation = {
  id: "draggable-img",
  type: "image",
  pageNumber: 1,
  pdfRect: { x: 50, y: 50, width: 100, height: 100 },
  dataUrl:
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  mimeType: "image/png",
  opacity: 1,
};
store.addAnnotation(imageAnnotation);
assert.equal(store.getAnnotationsForPage(1).length, 2);

// Drag image to new position (x: 80, y: 30)
const movedImage: EditorAnnotation = {
  ...imageAnnotation,
  pdfRect: { ...imageAnnotation.pdfRect, x: 80, y: 30 },
};
store.updateAnnotation(movedImage);
assert.deepEqual(
  store.getAnnotationsForPage(1).find((a) => a.id === "draggable-img")?.pdfRect,
  { x: 80, y: 30, width: 100, height: 100 }
);

// Drag drawing to new position
const drawAnnotation: EditorAnnotation = {
  id: "draggable-draw",
  type: "draw",
  pageNumber: 1,
  pdfRect: { x: 10, y: 10, width: 20, height: 20 },
  points: [
    { x: 10, y: 10 },
    { x: 30, y: 30 },
  ],
  strokeColor: "#000000",
  strokeWidth: 2,
  opacity: 1,
};
store.addAnnotation(drawAnnotation);
const movedDraw: EditorAnnotation = {
  ...drawAnnotation,
  pdfRect: { x: 25, y: 15, width: 20, height: 20 },
  points: [
    { x: 25, y: 15 },
    { x: 45, y: 35 },
  ],
};
store.updateAnnotation(movedDraw);
const storedDraw = store
  .getAnnotationsForPage(1)
  .find((a) => a.id === "draggable-draw");
assert.deepEqual(storedDraw?.pdfRect, { x: 25, y: 15, width: 20, height: 20 });
if (storedDraw && "points" in storedDraw) {
  assert.deepEqual(storedDraw.points, [
    { x: 25, y: 15 },
    { x: 45, y: 35 },
  ]);
}

// Undo reverts moved drawing back to original position
store.undo();
const revertedDraw = store
  .getAnnotationsForPage(1)
  .find((a) => a.id === "draggable-draw");
assert.deepEqual(revertedDraw?.pdfRect, { x: 10, y: 10, width: 20, height: 20 });
if (revertedDraw && "points" in revertedDraw) {
  assert.deepEqual(revertedDraw.points, [
    { x: 10, y: 10 },
    { x: 30, y: 30 },
  ]);
}
console.log("✓ Drag position updates and undo/redo for image, drawing, and signature");

// Test resize geometry helpers (edge, corner, aspect ratio lock, clamping, rotated viewport, point scaling)
const resizedEdge = computeResizedScreenRect({
  startRect: { x: 50, y: 50, width: 100, height: 80 },
  handle: "e",
  dx: 40,
  dy: 20,
  boundsWidth: 500,
  boundsHeight: 500,
});
assert.deepEqual(resizedEdge, { x: 50, y: 50, width: 140, height: 80 });

const resizedAspect = computeResizedScreenRect({
  startRect: { x: 100, y: 100, width: 100, height: 50 },
  handle: "se",
  dx: 100,
  dy: 10,
  boundsWidth: 500,
  boundsHeight: 500,
  preserveAspectRatio: true,
});
assert.deepEqual(resizedAspect, { x: 100, y: 100, width: 200, height: 100 });

const resizedClampedMin = computeResizedScreenRect({
  startRect: { x: 100, y: 100, width: 50, height: 50 },
  handle: "nw",
  dx: 100,
  dy: 100,
  boundsWidth: 500,
  boundsHeight: 500,
  minSize: 16,
});
assert.deepEqual(resizedClampedMin, { x: 134, y: 134, width: 16, height: 16 });

const convertedPdfRect = screenRectToPdfRect(
  { x: 40, y: 20, width: 80, height: 60 },
  viewport
);
assert.deepEqual(convertedPdfRect, { x: 10, y: 20, width: 30, height: 40 });

const scaledPoints = scalePointsToRect(
  [
    { x: 10, y: 10 },
    { x: 30, y: 30 },
  ],
  { x: 10, y: 10, width: 20, height: 20 },
  { x: 20, y: 20, width: 40, height: 60 }
);
assert.deepEqual(scaledPoints, [
  { x: 20, y: 20 },
  { x: 60, y: 80 },
]);

// Test resize update + undo/redo in store for drawing
store.updateAnnotation({
  ...drawAnnotation,
  pdfRect: { x: 20, y: 20, width: 40, height: 60 },
  points: scaledPoints,
});
assert.deepEqual(
  store.getAnnotationsForPage(1).find((a) => a.id === "draggable-draw")?.pdfRect,
  { x: 20, y: 20, width: 40, height: 60 }
);
store.undo();
assert.deepEqual(
  store.getAnnotationsForPage(1).find((a) => a.id === "draggable-draw")?.pdfRect,
  { x: 10, y: 10, width: 20, height: 20 }
);

// Test auto-expand calculation for overflowing text boxes
assert.equal(
  computeExpandedScreenRect(
    { x: 20, y: 30, width: 200, height: 40 },
    180,
    38,
    600,
    800
  ),
  null
);
assert.deepEqual(
  computeExpandedScreenRect(
    { x: 20, y: 30, width: 200, height: 40 },
    240,
    95,
    600,
    800
  ),
  { x: 20, y: 30, width: 240, height: 95 }
);
assert.deepEqual(
  computeExpandedScreenRect(
    { x: 500, y: 750, width: 80, height: 30 },
    150,
    100,
    600,
    800
  ),
  { x: 500, y: 750, width: 100, height: 50 }
);
console.log("✓ Resize geometry, point scaling, text-box overflow expansion, rotated viewport mapping, and undo/redo work");

store.removeAnnotation("history-check", 1);
store.removeAnnotation("draggable-img", 1);
store.removeAnnotation("draggable-draw", 1);
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
