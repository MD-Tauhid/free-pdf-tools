/**
 * PDF Editor Zustand store.
 *
 * Owns the editor's tool selection, per-page annotations, undo/redo history,
 * and the currently selected extracted text item. It does NOT own the PDF
 * document itself — that lives in usePdfDocument.
 */

import { create } from "zustand";
import type {
  EditorTool,
  EditorAnnotation,
  HistoryAction,
  SelectedTextItem,
  TextReplacement,
} from "@/types/editor";

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

export interface PdfEditorState {
  /** Currently active editing tool. */
  activeTool: EditorTool;

  /** All annotation overlays keyed by page number (1-based). */
  annotationsByPage: Record<number, EditorAnnotation[]>;

  /** Applied single-span visual replacements, keyed by PDF page. */
  textReplacementsByPage: Record<number, TextReplacement[]>;

  /** Draft preview that is not included in exported PDFs until applied. */
  replacementPreview: TextReplacement | null;

  /** Undo stack (most-recent at end). */
  undoStack: HistoryAction[];

  /** Redo stack (most-recent at end). */
  redoStack: HistoryAction[];

  /** Currently selected extracted text item (for the text selection layer). */
  selectedTextItem: SelectedTextItem | null;

  /** ID of the currently selected annotation overlay (for the properties sidebar). */
  selectedAnnotationId: string | null;

  /** Whether the right properties sidebar is open. */
  propertiesPanelOpen: boolean;
}

// ---------------------------------------------------------------------------
// Actions shape
// ---------------------------------------------------------------------------

export interface PdfEditorActions {
  setActiveTool: (tool: EditorTool) => void;

  /** Add a new annotation and record an undo entry. */
  addAnnotation: (annotation: EditorAnnotation) => void;

  /** Remove an annotation by id and record an undo entry. */
  removeAnnotation: (id: string, pageNumber: number) => void;

  /** Update an existing annotation and record an undo entry. */
  updateAnnotation: (updated: EditorAnnotation) => void;

  /** Get all annotations for a specific page. */
  getAnnotationsForPage: (pageNumber: number) => EditorAnnotation[];

  getTextReplacementsForPage: (pageNumber: number) => TextReplacement[];

  setReplacementPreview: (replacement: TextReplacement | null) => void;

  applyTextReplacement: (replacement: TextReplacement) => void;

  removeTextReplacement: (sourceItemId: string, pageNumber: number) => void;

  /** Select a text item from the text selection layer. */
  selectTextItem: (item: SelectedTextItem | null) => void;

  /** Select an annotation overlay by id. */
  selectAnnotation: (id: string | null) => void;

  /** Undo the last action. */
  undo: () => void;

  /** Redo the previously undone action. */
  redo: () => void;

  /** Whether undo is available. */
  canUndo: () => boolean;

  /** Whether redo is available. */
  canRedo: () => boolean;

  /** Open or close the properties panel. */
  setPropertiesPanelOpen: (open: boolean) => void;

  /** Remove ALL annotations (e.g., reset when a new document is loaded). */
  clearAllAnnotations: () => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const MAX_HISTORY = 100;

export const usePdfEditorStore = create<PdfEditorState & PdfEditorActions>(
  (set, get) => ({
    // --- initial state ---
    activeTool: "select",
    annotationsByPage: {},
    textReplacementsByPage: {},
    replacementPreview: null,
    undoStack: [],
    redoStack: [],
    selectedTextItem: null,
    selectedAnnotationId: null,
    propertiesPanelOpen: false,

    // --- actions ---

    setActiveTool: (tool) =>
      set({
        activeTool: tool,
        selectedAnnotationId: null,
        selectedTextItem: null,
        replacementPreview: null,
        propertiesPanelOpen: false,
      }),

    addAnnotation: (annotation) => {
      const { annotationsByPage, undoStack } = get();
      const pageAnnotations = annotationsByPage[annotation.pageNumber] ?? [];
      const action: HistoryAction = { kind: "add", annotation };

      set({
        annotationsByPage: {
          ...annotationsByPage,
          [annotation.pageNumber]: [...pageAnnotations, annotation],
        },
        undoStack: [...undoStack.slice(-MAX_HISTORY + 1), action],
        redoStack: [],
        selectedAnnotationId: annotation.id,
        selectedTextItem: null,
        propertiesPanelOpen: true,
      });
    },

    removeAnnotation: (id, pageNumber) => {
      const { annotationsByPage, undoStack } = get();
      const pageAnnotations = annotationsByPage[pageNumber] ?? [];
      const target = pageAnnotations.find((a) => a.id === id);
      if (!target) return;

      const action: HistoryAction = { kind: "remove", annotation: target };

      set({
        annotationsByPage: {
          ...annotationsByPage,
          [pageNumber]: pageAnnotations.filter((a) => a.id !== id),
        },
        undoStack: [...undoStack.slice(-MAX_HISTORY + 1), action],
        redoStack: [],
        selectedAnnotationId: null,
        selectedTextItem: null,
        propertiesPanelOpen: false,
      });
    },

    updateAnnotation: (updated) => {
      const { annotationsByPage, undoStack } = get();
      const pageAnnotations = annotationsByPage[updated.pageNumber] ?? [];
      const before = pageAnnotations.find((a) => a.id === updated.id);
      if (!before) return;

      const action: HistoryAction = { kind: "update", before, after: updated };

      set({
        annotationsByPage: {
          ...annotationsByPage,
          [updated.pageNumber]: pageAnnotations.map((a) =>
            a.id === updated.id ? updated : a
          ),
        },
        undoStack: [...undoStack.slice(-MAX_HISTORY + 1), action],
        redoStack: [],
      });
    },

    getAnnotationsForPage: (pageNumber) => {
      return get().annotationsByPage[pageNumber] ?? [];
    },

    getTextReplacementsForPage: (pageNumber) =>
      get().textReplacementsByPage[pageNumber] ?? [],

    setReplacementPreview: (replacement) =>
      set({ replacementPreview: replacement }),

    applyTextReplacement: (replacement) => {
      const { textReplacementsByPage, undoStack } = get();
      const pageReplacements =
        textReplacementsByPage[replacement.pageNumber] ?? [];
      const before = pageReplacements.find(
        (current) => current.sourceItemId === replacement.sourceItemId
      );
      const action: HistoryAction = before
        ? { kind: "text-replacement-update", before, after: replacement }
        : { kind: "text-replacement-add", replacement };

      set({
        textReplacementsByPage: {
          ...textReplacementsByPage,
          [replacement.pageNumber]: before
            ? pageReplacements.map((current) =>
                current.sourceItemId === replacement.sourceItemId
                  ? replacement
                  : current
              )
            : [...pageReplacements, replacement],
        },
        replacementPreview: null,
        undoStack: [...undoStack.slice(-MAX_HISTORY + 1), action],
        redoStack: [],
        selectedAnnotationId: null,
        propertiesPanelOpen: true,
      });
    },

    removeTextReplacement: (sourceItemId, pageNumber) => {
      const { textReplacementsByPage, undoStack } = get();
      const pageReplacements = textReplacementsByPage[pageNumber] ?? [];
      const target = pageReplacements.find(
        (replacement) => replacement.sourceItemId === sourceItemId
      );
      if (!target) return;
      const action: HistoryAction = {
        kind: "text-replacement-remove",
        replacement: target,
      };
      set({
        textReplacementsByPage: {
          ...textReplacementsByPage,
          [pageNumber]: pageReplacements.filter(
            (replacement) => replacement.sourceItemId !== sourceItemId
          ),
        },
        replacementPreview: null,
        undoStack: [...undoStack.slice(-MAX_HISTORY + 1), action],
        redoStack: [],
      });
    },

    selectTextItem: (item) =>
      set({
        selectedTextItem: item,
        selectedAnnotationId: null,
        replacementPreview: null,
        propertiesPanelOpen: item !== null,
      }),

    selectAnnotation: (id) =>
      set({
        selectedAnnotationId: id,
        selectedTextItem: null,
        replacementPreview: null,
        propertiesPanelOpen: id !== null,
      }),

    undo: () => {
      const {
        undoStack,
        redoStack,
        annotationsByPage,
        textReplacementsByPage,
      } = get();
      if (undoStack.length === 0) return;

      const action = undoStack[undoStack.length - 1];
      const remaining = undoStack.slice(0, -1);
      let newAnnotationsByPage = { ...annotationsByPage };
      let newTextReplacementsByPage = { ...textReplacementsByPage };

      if (action.kind === "text-replacement-add") {
        const page = action.replacement.pageNumber;
        newTextReplacementsByPage = {
          ...newTextReplacementsByPage,
          [page]: (newTextReplacementsByPage[page] ?? []).filter(
            (replacement) =>
              replacement.sourceItemId !== action.replacement.sourceItemId
          ),
        };
      } else if (action.kind === "text-replacement-remove") {
        const page = action.replacement.pageNumber;
        newTextReplacementsByPage = {
          ...newTextReplacementsByPage,
          [page]: [
            ...(newTextReplacementsByPage[page] ?? []),
            action.replacement,
          ],
        };
      } else if (action.kind === "text-replacement-update") {
        const page = action.before.pageNumber;
        newTextReplacementsByPage = {
          ...newTextReplacementsByPage,
          [page]: (newTextReplacementsByPage[page] ?? []).map((replacement) =>
            replacement.sourceItemId === action.before.sourceItemId
              ? action.before
              : replacement
          ),
        };
      } else if (action.kind === "add") {
        // Reverse: remove the annotation that was added
        const pg = action.annotation.pageNumber;
        newAnnotationsByPage = {
          ...newAnnotationsByPage,
          [pg]: (newAnnotationsByPage[pg] ?? []).filter(
            (a) => a.id !== action.annotation.id
          ),
        };
      } else if (action.kind === "remove") {
        // Reverse: re-add the annotation that was removed
        const pg = action.annotation.pageNumber;
        newAnnotationsByPage = {
          ...newAnnotationsByPage,
          [pg]: [...(newAnnotationsByPage[pg] ?? []), action.annotation],
        };
      } else {
        // action.kind === "update" — reverse: restore the before state
        const pg = action.before.pageNumber;
        newAnnotationsByPage = {
          ...newAnnotationsByPage,
          [pg]: (newAnnotationsByPage[pg] ?? []).map((a) =>
            a.id === action.before.id ? action.before : a
          ),
        };
      }

      set({
        undoStack: remaining,
        redoStack: [...redoStack, action],
        annotationsByPage: newAnnotationsByPage,
        textReplacementsByPage: newTextReplacementsByPage,
        replacementPreview: null,
        selectedAnnotationId: null,
        selectedTextItem: null,
        propertiesPanelOpen: false,
      });
    },

    redo: () => {
      const {
        undoStack,
        redoStack,
        annotationsByPage,
        textReplacementsByPage,
      } = get();
      if (redoStack.length === 0) return;

      const action = redoStack[redoStack.length - 1];
      const remaining = redoStack.slice(0, -1);
      let newAnnotationsByPage = { ...annotationsByPage };
      let newTextReplacementsByPage = { ...textReplacementsByPage };

      if (action.kind === "text-replacement-add") {
        const page = action.replacement.pageNumber;
        newTextReplacementsByPage = {
          ...newTextReplacementsByPage,
          [page]: [
            ...(newTextReplacementsByPage[page] ?? []),
            action.replacement,
          ],
        };
      } else if (action.kind === "text-replacement-remove") {
        const page = action.replacement.pageNumber;
        newTextReplacementsByPage = {
          ...newTextReplacementsByPage,
          [page]: (newTextReplacementsByPage[page] ?? []).filter(
            (replacement) =>
              replacement.sourceItemId !== action.replacement.sourceItemId
          ),
        };
      } else if (action.kind === "text-replacement-update") {
        const page = action.after.pageNumber;
        newTextReplacementsByPage = {
          ...newTextReplacementsByPage,
          [page]: (newTextReplacementsByPage[page] ?? []).map((replacement) =>
            replacement.sourceItemId === action.after.sourceItemId
              ? action.after
              : replacement
          ),
        };
      } else if (action.kind === "add") {
        const pg = action.annotation.pageNumber;
        newAnnotationsByPage = {
          ...newAnnotationsByPage,
          [pg]: [...(newAnnotationsByPage[pg] ?? []), action.annotation],
        };
      } else if (action.kind === "remove") {
        const pg = action.annotation.pageNumber;
        newAnnotationsByPage = {
          ...newAnnotationsByPage,
          [pg]: (newAnnotationsByPage[pg] ?? []).filter(
            (a) => a.id !== action.annotation.id
          ),
        };
      } else {
        // update — re-apply the "after" state
        const pg = action.after.pageNumber;
        newAnnotationsByPage = {
          ...newAnnotationsByPage,
          [pg]: (newAnnotationsByPage[pg] ?? []).map((a) =>
            a.id === action.after.id ? action.after : a
          ),
        };
      }

      set({
        redoStack: remaining,
        undoStack: [...undoStack, action],
        annotationsByPage: newAnnotationsByPage,
        textReplacementsByPage: newTextReplacementsByPage,
        replacementPreview: null,
        selectedAnnotationId: null,
        selectedTextItem: null,
        propertiesPanelOpen: false,
      });
    },

    canUndo: () => get().undoStack.length > 0,
    canRedo: () => get().redoStack.length > 0,

    setPropertiesPanelOpen: (open) => set({ propertiesPanelOpen: open }),

    clearAllAnnotations: () =>
      set({
        activeTool: "select",
        annotationsByPage: {},
        textReplacementsByPage: {},
        replacementPreview: null,
        undoStack: [],
        redoStack: [],
        selectedAnnotationId: null,
        selectedTextItem: null,
        propertiesPanelOpen: false,
      }),
  })
);
