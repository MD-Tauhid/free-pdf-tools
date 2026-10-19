"use client";

import * as React from "react";
import { usePdfEditorStore } from "@/stores/pdf-editor-store";
import type { EditorAnnotation } from "@/types/editor";

/**
 * Generic undo/redo history hook.
 *
 * Exposes a simplified view of the undo/redo stack from the Zustand store
 * so that components don't need to import the store directly.
 */
export function usePdfHistory() {
  const undo = usePdfEditorStore((s) => s.undo);
  const redo = usePdfEditorStore((s) => s.redo);
  const canUndo = usePdfEditorStore((s) => s.canUndo);
  const canRedo = usePdfEditorStore((s) => s.canRedo);
  const undoStack = usePdfEditorStore((s) => s.undoStack);
  const redoStack = usePdfEditorStore((s) => s.redoStack);

  const undoable = canUndo();
  const redoable = canRedo();

  // Keyboard shortcut support: Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Skip if focus is in an editable field
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.key === "z" && !e.shiftKey) {
          e.preventDefault();
          undo();
        } else if (
          e.key === "y" ||
          (e.key === "z" && e.shiftKey)
        ) {
          e.preventDefault();
          redo();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  return {
    undo,
    redo,
    canUndo: undoable,
    canRedo: redoable,
    undoCount: undoStack.length,
    redoCount: redoStack.length,
  };
}

/**
 * usePdfEditor — composites usePdfDocument + the Zustand editor store.
 *
 * Provides convenient actions for adding/removing/updating annotations,
 * and for accessing annotation overlays for a given page.
 */
export function usePdfEditor() {
  const addAnnotation = usePdfEditorStore((s) => s.addAnnotation);
  const removeAnnotation = usePdfEditorStore((s) => s.removeAnnotation);
  const updateAnnotation = usePdfEditorStore((s) => s.updateAnnotation);
  const getAnnotationsForPage = usePdfEditorStore(
    (s) => s.getAnnotationsForPage
  );
  const selectAnnotation = usePdfEditorStore((s) => s.selectAnnotation);
  const selectedAnnotationId = usePdfEditorStore(
    (s) => s.selectedAnnotationId
  );
  const activeTool = usePdfEditorStore((s) => s.activeTool);
  const setActiveTool = usePdfEditorStore((s) => s.setActiveTool);
  const clearAllAnnotations = usePdfEditorStore((s) => s.clearAllAnnotations);

  /**
   * Convenience: generate a new annotation id.
   */
  const generateId = React.useCallback((): string => {
    return `ann-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
  }, []);

  /**
   * Add an annotation overlay, auto-filling the id if not already set.
   */
  const addAnnotationWithId = React.useCallback(
    (annotation: Omit<EditorAnnotation, "id"> & { id?: string }) => {
      const full = {
        ...annotation,
        id: annotation.id ?? generateId(),
      } as EditorAnnotation;
      addAnnotation(full);
      return full.id;
    },
    [addAnnotation, generateId]
  );

  return {
    activeTool,
    setActiveTool,
    addAnnotation: addAnnotationWithId,
    removeAnnotation,
    updateAnnotation,
    getAnnotationsForPage,
    selectAnnotation,
    selectedAnnotationId,
    clearAllAnnotations,
    generateId,
  };
}
