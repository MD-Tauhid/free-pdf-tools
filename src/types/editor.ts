/**
 * Editor type definitions for the PDF editing workspace.
 *
 * IMPORTANT: These types define the editing overlay model.
 * The underlying PDF bytes are NOT modified by these overlays
 * until the user explicitly exports. See docs/pdf-editing-limitations.md.
 */

// ---------------------------------------------------------------------------
// Tool modes
// ---------------------------------------------------------------------------

export type EditorTool =
  | "select"
  | "text-box"
  | "draw"
  | "highlight"
  | "signature"
  | "image";

// ---------------------------------------------------------------------------
// Shared geometry
// ---------------------------------------------------------------------------

/** Bounding box in CSS screen-space pixels (post-scale, post-rotation). */
export interface ScreenRect {
  x: number; // left from page-canvas origin
  y: number; // top from page-canvas origin
  width: number;
  height: number;
}

/** Bounding box in PDF user-space points (72 pt = 1 in, bottom-left origin). */
export interface PdfRect {
  x: number; // left edge
  y: number; // bottom edge (PDF coordinate system)
  width: number;
  height: number;
}

/** A point in PDF user-space points (72 pt = 1 in, bottom-left origin). */
export interface PdfPoint {
  x: number;
  y: number;
}

// ---------------------------------------------------------------------------
// Text content extracted by PDF.js
// ---------------------------------------------------------------------------

/** A single extracted text run from PDF.js getTextContent(). */
export interface ExtractedTextItem {
  /** Normalised text string (may contain ligatures / glyph substitutions). */
  text: string;
  /** 6-element transform matrix [a,b,c,d,e,f] from PDF.js — e=x, f=y. */
  transform: [number, number, number, number, number, number];
  /** Width in user-space units. */
  width: number;
  /** Height (ascent+descent) in user-space units. */
  height: number;
  /** PDF font name (not a system font name). */
  fontName: string;
  /** Derived bounding box in PDF user-space. Populated by extractor. */
  pdfRect: PdfRect;
  /** Page number this item belongs to (1-based). */
  pageNumber: number;
  /** Unique id within the page text layer. */
  id: string;
}

// ---------------------------------------------------------------------------
// Annotation / overlay types
// ---------------------------------------------------------------------------

/** Common fields for every annotation overlay. */
interface AnnotationBase {
  /** Stable random UUID. */
  id: string;
  /** Page number (1-based). */
  pageNumber: number;
  /** Position + size in PDF user-space points. */
  pdfRect: PdfRect;
}

/** A free text-box drawn by the user (new text, not editing existing). */
export interface TextAnnotation extends AnnotationBase {
  type: "text-box";
  content: string;
  fontSize: number; // pt
  fontFamily: string;
  color: string; // CSS colour string, e.g. "#000000"
  bold: boolean;
  italic: boolean;
  underline: boolean;
  backgroundColor: string | null; // null = transparent
  opacity: number; // 0..1
}

/** A freehand drawing path (SVG path data in PDF user-space). */
export interface DrawAnnotation extends AnnotationBase {
  type: "draw";
  /** Freehand points in PDF user-space coordinates. */
  points: PdfPoint[];
  strokeColor: string;
  strokeWidth: number; // pt
  opacity: number;
}

/** A highlight rectangle over existing text. */
export interface HighlightAnnotation extends AnnotationBase {
  type: "highlight";
  color: string; // e.g. "#FFFF00"
  opacity: number; // 0..1, typically 0.3–0.5
  /** IDs of underlying ExtractedTextItems that this highlight covers. */
  coveredItemIds: string[];
}

/** An image placed on a page. */
export interface ImageAnnotation extends AnnotationBase {
  type: "image";
  /** Data URL (base64) of the embedded image. */
  dataUrl: string;
  /** Original MIME type. */
  mimeType: "image/png" | "image/jpeg";
  opacity: number;
}

/** A signature (drawn or typed) placed on a page. */
export interface SignatureAnnotation extends AnnotationBase {
  type: "signature";
  /** Freehand signature points in PDF user-space coordinates, or null for typed. */
  points: PdfPoint[] | null;
  /** Text for typed signatures, or null for drawn. */
  typedText: string | null;
  strokeColor: string;
  strokeWidth: number;
  opacity: number;
}

/** Discriminated union of all annotation overlay types. */
export type EditorAnnotation =
  | TextAnnotation
  | DrawAnnotation
  | HighlightAnnotation
  | ImageAnnotation
  | SignatureAnnotation;

// ---------------------------------------------------------------------------
// Undo/Redo history entry
// ---------------------------------------------------------------------------

export type HistoryAction =
  | { kind: "add"; annotation: EditorAnnotation }
  | { kind: "remove"; annotation: EditorAnnotation }
  | { kind: "update"; before: EditorAnnotation; after: EditorAnnotation };

// ---------------------------------------------------------------------------
// Editor selection state
// ---------------------------------------------------------------------------

/** Currently selected extracted text item (from the text selection layer). */
export interface SelectedTextItem {
  item: ExtractedTextItem;
  /** Screen-space rect at the time of selection (for positioning the panel). */
  screenRect: ScreenRect;
}
