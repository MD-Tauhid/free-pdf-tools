"use client";

import * as React from "react";
import { usePdfEditorStore } from "@/stores/pdf-editor-store";
import type { EditorAnnotation, TextAnnotation } from "@/types/editor";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  X,
  Trash2,
  Type,
  Palette,
  AlignLeft,
  Info,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isTextAnnotation(a: EditorAnnotation): a is TextAnnotation {
  return a.type === "text-box";
}

// ---------------------------------------------------------------------------
// Sub-panel: Selected existing text info
// ---------------------------------------------------------------------------

function SelectedTextPanel() {
  const selectedTextItem = usePdfEditorStore((s) => s.selectedTextItem);
  const selectTextItem = usePdfEditorStore((s) => s.selectTextItem);

  if (!selectedTextItem) return null;

  const { item } = selectedTextItem;

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Type className="h-4 w-4 text-blue-600 shrink-0" />
          <span>Selected Text</span>
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => selectTextItem(null)}
          aria-label="Deselect text"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="rounded-lg border bg-muted/40 p-3">
        <p className="text-xs text-muted-foreground mb-1">Content</p>
        <p className="text-sm text-foreground font-mono break-all leading-relaxed">
          &ldquo;{item.text}&rdquo;
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-md border p-2 bg-muted/30">
          <p className="text-muted-foreground mb-0.5">Position</p>
          <p className="font-mono text-foreground">
            ({Math.round(item.pdfRect.x)}, {Math.round(item.pdfRect.y)})
          </p>
        </div>
        <div className="rounded-md border p-2 bg-muted/30">
          <p className="text-muted-foreground mb-0.5">Size</p>
          <p className="font-mono text-foreground">
            {Math.round(item.pdfRect.width)} × {Math.round(item.pdfRect.height)}
          </p>
        </div>
        <div className="col-span-2 rounded-md border p-2 bg-muted/30">
          <p className="text-muted-foreground mb-0.5">Font (PDF internal)</p>
          <p className="font-mono text-foreground truncate">{item.fontName || "—"}</p>
        </div>
      </div>

      {/* Limitation notice */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30 p-3 text-xs text-amber-800 dark:text-amber-300 flex gap-2">
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <span>
          In-place text editing of existing PDF glyphs is not yet supported.
          Use <strong>Add Text</strong> to overlay new text above this location.
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-panel: Annotation overlay properties
// ---------------------------------------------------------------------------

function AnnotationPropertiesPanel({
  annotation,
}: {
  annotation: EditorAnnotation;
}) {
  const updateAnnotation = usePdfEditorStore((s) => s.updateAnnotation);
  const removeAnnotation = usePdfEditorStore((s) => s.removeAnnotation);
  const selectAnnotation = usePdfEditorStore((s) => s.selectAnnotation);

  const handleDelete = React.useCallback(() => {
    removeAnnotation(annotation.id, annotation.pageNumber);
    selectAnnotation(null);
  }, [removeAnnotation, annotation, selectAnnotation]);

  // Text annotation editor
  if (isTextAnnotation(annotation)) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Type className="h-4 w-4 text-blue-600" />
            <span>Text Box</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={handleDelete}
              title="Delete annotation"
              aria-label="Delete annotation"
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => selectAnnotation(null)}
              aria-label="Close properties"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <AlignLeft className="h-3 w-3" />
            Text content
          </label>
          <textarea
            value={annotation.content}
            onChange={(e) =>
              updateAnnotation({ ...annotation, content: e.target.value })
            }
            className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            aria-label="Text content"
          />
        </div>

        {/* Font size */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Font size (pt)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={6}
              max={72}
              step={1}
              value={annotation.fontSize}
              onChange={(e) =>
                updateAnnotation({
                  ...annotation,
                  fontSize: Number(e.target.value),
                })
              }
              className="flex-1"
              aria-label="Font size"
            />
            <span className="w-10 text-center text-sm font-mono tabular-nums text-foreground">
              {annotation.fontSize}
            </span>
          </div>
        </div>

        {/* Colour */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Palette className="h-3 w-3" />
            Text color
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={annotation.color}
              onChange={(e) =>
                updateAnnotation({ ...annotation, color: e.target.value })
              }
              className="h-8 w-10 rounded border cursor-pointer"
              aria-label="Text color"
            />
            <span className="text-xs font-mono text-muted-foreground">
              {annotation.color}
            </span>
          </div>
        </div>

        {/* Style toggles */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Style</p>
          <div className="flex items-center gap-2">
            {(
              [
                { key: "bold", label: "B" },
                { key: "italic", label: "I" },
                { key: "underline", label: "U" },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() =>
                  updateAnnotation({ ...annotation, [key]: !annotation[key] })
                }
                aria-pressed={annotation[key]}
                className={cn(
                  "h-7 w-7 rounded border text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2",
                  annotation[key]
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-background text-muted-foreground border-border hover:border-foreground/40"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Generic fallback for other annotation types
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground capitalize">
          {annotation.type.replace("-", " ")}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={handleDelete}
            className="text-destructive hover:text-destructive"
            aria-label="Delete annotation"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => selectAnnotation(null)}
            aria-label="Close properties"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Page {annotation.pageNumber}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main PropertiesSidebar
// ---------------------------------------------------------------------------

interface PropertiesSidebarProps {
  className?: string;
}

export function PropertiesSidebar({ className }: PropertiesSidebarProps) {
  const selectedAnnotationId = usePdfEditorStore(
    (s) => s.selectedAnnotationId
  );
  const annotationsByPage = usePdfEditorStore((s) => s.annotationsByPage);
  const selectedTextItem = usePdfEditorStore((s) => s.selectedTextItem);
  const propertiesPanelOpen = usePdfEditorStore(
    (s) => s.propertiesPanelOpen
  );

  // Find the selected annotation across all pages
  const selectedAnnotation = React.useMemo(() => {
    if (!selectedAnnotationId) return null;
    for (const pageAnnotations of Object.values(annotationsByPage)) {
      const found = pageAnnotations.find((a) => a.id === selectedAnnotationId);
      if (found) return found;
    }
    return null;
  }, [selectedAnnotationId, annotationsByPage]);

  const hasContent = selectedAnnotation !== null || selectedTextItem !== null;

  if (!propertiesPanelOpen || !hasContent) {
    return (
      <aside
        className={cn(
          "w-64 border-l bg-background/80 backdrop-blur-xs flex flex-col shrink-0 hidden lg:flex",
          className
        )}
        aria-label="Properties"
      >
        <div className="flex items-center px-4 py-3 border-b">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Properties
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            Select a text span or annotation to view its properties here.
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={cn(
        "w-64 border-l bg-background/80 backdrop-blur-xs flex flex-col shrink-0",
        className
      )}
      aria-label="Properties"
    >
      <div className="flex items-center px-4 py-3 border-b">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Properties
        </span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {selectedAnnotation ? (
          <AnnotationPropertiesPanel annotation={selectedAnnotation} />
        ) : (
          <SelectedTextPanel />
        )}
      </div>
    </aside>
  );
}
