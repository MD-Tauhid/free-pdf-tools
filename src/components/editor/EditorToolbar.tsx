"use client";

import * as React from "react";
import { usePdfEditorStore } from "@/stores/pdf-editor-store";
import {
  type EditorTool,
  type TextAnnotation,
  PDF_FONT_FAMILIES,
} from "@/types/editor";
import { usePdfHistory } from "@/hooks/usePdfEditor";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  MousePointer2,
  Type,
  Pencil,
  Highlighter,
  PenLine,
  ImagePlus,
  Undo2,
  Redo2,
  Download,
  Bold,
  Italic,
  Underline,
  Minus,
  Plus,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Tool button descriptor
// ---------------------------------------------------------------------------

interface ToolDef {
  tool: EditorTool;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
}

const TOOLS: ToolDef[] = [
  { tool: "select", label: "Select", icon: MousePointer2, shortcut: "V" },
  { tool: "text-box", label: "Add Text", icon: Type, shortcut: "T" },
  { tool: "draw", label: "Draw", icon: Pencil, shortcut: "D" },
  { tool: "highlight", label: "Highlight", icon: Highlighter, shortcut: "H" },
  { tool: "signature", label: "Signature", icon: PenLine, shortcut: "S" },
  { tool: "image", label: "Image", icon: ImagePlus, shortcut: "I" },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EditorToolbarProps {
  /** Called when the user clicks the Export/Download button. */
  onExport?: () => void;
  /** Whether an export is in progress. */
  exporting?: boolean;
  onPickImage?: () => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EditorToolbar({
  onExport,
  exporting = false,
  onPickImage,
  className,
}: EditorToolbarProps) {
  const activeTool = usePdfEditorStore((s) => s.activeTool);
  const setActiveTool = usePdfEditorStore((s) => s.setActiveTool);
  const selectedAnnotationId = usePdfEditorStore((s) => s.selectedAnnotationId);
  const annotationsByPage = usePdfEditorStore((s) => s.annotationsByPage);
  const updateAnnotation = usePdfEditorStore((s) => s.updateAnnotation);
  const selectedTextItem = usePdfEditorStore((s) => s.selectedTextItem);

  const { undo, redo, canUndo, canRedo } = usePdfHistory();

  // Find selected text annotation if any
  const selectedTextAnnotation = React.useMemo(() => {
    if (!selectedAnnotationId) return null;
    for (const pageList of Object.values(annotationsByPage)) {
      const found = pageList.find((a) => a.id === selectedAnnotationId);
      if (found && found.type === "text-box") return found as TextAnnotation;
    }
    return null;
  }, [selectedAnnotationId, annotationsByPage]);

  // Keyboard shortcuts for tool selection
  React.useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return;
      }
      const key = e.key.toUpperCase();
      const match = TOOLS.find((t) => t.shortcut === key);
      if (match) {
        e.preventDefault();
        setActiveTool(match.tool);
        if (match.tool === "image") onPickImage?.();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onPickImage, setActiveTool]);

  // Check if text formatting ribbon should be active
  const hasTextContext = Boolean(selectedTextAnnotation || selectedTextItem);

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 border-b bg-background/95 backdrop-blur-sm shrink-0 flex-wrap min-h-[46px]",
        className
      )}
      role="toolbar"
      aria-label="Editor toolbar"
    >
      {/* Tool buttons */}
      <div
        className="flex items-center gap-1"
        role="group"
        aria-label="Editing tools"
      >
        {TOOLS.map(({ tool, label, icon: Icon, shortcut }) => (
          <Button
            key={tool}
            variant={activeTool === tool ? "default" : "ghost"}
            size="sm"
            onClick={() => {
              setActiveTool(tool);
              if (tool === "image") onPickImage?.();
            }}
            title={shortcut ? `${label} (${shortcut})` : label}
            aria-label={label}
            aria-pressed={activeTool === tool}
            className={cn(
              "gap-1.5 h-8 px-2.5 text-xs",
              activeTool === tool && "shadow-xs"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </Button>
        ))}
      </div>

      {/* Divider */}
      <div className="h-5 w-px bg-border mx-0.5" aria-hidden="true" />

      {/* Undo / Redo */}
      <div
        className="flex items-center gap-0.5"
        role="group"
        aria-label="History controls"
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
          className="h-8 w-8 px-0"
        >
          <Undo2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          aria-label="Redo"
          className="h-8 w-8 px-0"
        >
          <Redo2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Word-style Font Ribbon: visible whenever text is selected */}
      {hasTextContext && selectedTextAnnotation && (
        <>
          <div className="h-5 w-px bg-border mx-0.5" aria-hidden="true" />
          <div
            className="flex items-center gap-1 bg-muted/40 px-2 py-0.5 rounded-md border text-xs"
            role="group"
            aria-label="Font formatting ribbon"
          >
            {/* Font Family */}
            <select
              value={selectedTextAnnotation.fontFamily}
              onChange={(e) =>
                updateAnnotation({
                  ...selectedTextAnnotation,
                  fontFamily: e.target.value,
                })
              }
              className="h-7 rounded border border-input bg-background px-1.5 text-xs font-medium focus:outline-none cursor-pointer max-w-[120px]"
              title="Font Family"
              aria-label="Font Family"
            >
              {PDF_FONT_FAMILIES.map((f) => (
                <option key={f.value} value={f.value} style={{ fontFamily: f.cssFamily }}>
                  {f.label}
                </option>
              ))}
            </select>

            {/* Font Size */}
            <div className="flex items-center rounded border border-input bg-background">
              <button
                type="button"
                className="h-7 w-5 flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground"
                onClick={() =>
                  updateAnnotation({
                    ...selectedTextAnnotation,
                    fontSize: Math.max(6, selectedTextAnnotation.fontSize - 1),
                  })
                }
                title="Decrease font size"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-7 text-center font-mono text-xs tabular-nums">
                {selectedTextAnnotation.fontSize}
              </span>
              <button
                type="button"
                className="h-7 w-5 flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground"
                onClick={() =>
                  updateAnnotation({
                    ...selectedTextAnnotation,
                    fontSize: Math.min(72, selectedTextAnnotation.fontSize + 1),
                  })
                }
                title="Increase font size"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>

            {/* B / I / U */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() =>
                  updateAnnotation({
                    ...selectedTextAnnotation,
                    bold: !selectedTextAnnotation.bold,
                  })
                }
                className={cn(
                  "h-7 w-7 rounded flex items-center justify-center transition-colors",
                  selectedTextAnnotation.bold
                    ? "bg-blue-600 text-white"
                    : "hover:bg-muted text-muted-foreground"
                )}
                title="Bold"
                aria-pressed={selectedTextAnnotation.bold}
              >
                <Bold className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() =>
                  updateAnnotation({
                    ...selectedTextAnnotation,
                    italic: !selectedTextAnnotation.italic,
                  })
                }
                className={cn(
                  "h-7 w-7 rounded flex items-center justify-center transition-colors",
                  selectedTextAnnotation.italic
                    ? "bg-blue-600 text-white"
                    : "hover:bg-muted text-muted-foreground"
                )}
                title="Italic"
                aria-pressed={selectedTextAnnotation.italic}
              >
                <Italic className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() =>
                  updateAnnotation({
                    ...selectedTextAnnotation,
                    underline: !selectedTextAnnotation.underline,
                  })
                }
                className={cn(
                  "h-7 w-7 rounded flex items-center justify-center transition-colors",
                  selectedTextAnnotation.underline
                    ? "bg-blue-600 text-white"
                    : "hover:bg-muted text-muted-foreground"
                )}
                title="Underline"
                aria-pressed={selectedTextAnnotation.underline}
              >
                <Underline className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Color */}
            <label className="flex items-center gap-1 cursor-pointer pl-1 border-l">
              <span className="font-bold text-xs" style={{ color: selectedTextAnnotation.color }}>
                A
              </span>
              <input
                type="color"
                value={selectedTextAnnotation.color}
                onChange={(e) =>
                  updateAnnotation({
                    ...selectedTextAnnotation,
                    color: e.target.value,
                  })
                }
                className="h-5 w-5 rounded border cursor-pointer p-0"
                aria-label="Font color"
              />
            </label>
          </div>
        </>
      )}

      {/* Export / Download Button */}
      <Button
        size="sm"
        onClick={onExport}
        disabled={exporting || !onExport}
        title="Download edited PDF"
        aria-label="Download edited PDF"
        className="h-8 gap-1.5 px-3 text-xs ml-auto bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
      >
        <Download className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">
          {exporting ? "Exporting…" : "Download PDF"}
        </span>
      </Button>
    </div>
  );
}
