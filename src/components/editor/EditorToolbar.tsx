"use client";

import * as React from "react";
import { usePdfEditorStore } from "@/stores/pdf-editor-store";
import type { EditorTool } from "@/types/editor";
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
  const { undo, redo, canUndo, canRedo } = usePdfHistory();

  // Keyboard shortcuts for tool selection (single letters, no modifiers)
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

  return (
    <div
      className={cn(
        "flex items-center gap-1 px-3 py-2 border-b bg-background/95 backdrop-blur-sm shrink-0 flex-wrap",
        className
      )}
      role="toolbar"
      aria-label="Editor toolbar"
    >
      {/* Tool buttons */}
      <div
        className="flex items-center gap-1 mr-2"
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
              activeTool === tool && "shadow-sm"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </Button>
        ))}
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-border mx-1" aria-hidden="true" />

      {/* Undo / Redo */}
      <div
        className="flex items-center gap-1 mr-2"
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

      {/* Divider */}
      <div className="h-6 w-px bg-border mx-1" aria-hidden="true" />

      {/* Export */}
      <Button
        size="sm"
        onClick={onExport}
        disabled={exporting || !onExport}
        title="Download edited PDF"
        aria-label="Download edited PDF"
        className="h-8 gap-1.5 px-3 text-xs ml-auto"
      >
        <Download className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">
          {exporting ? "Exporting…" : "Download PDF"}
        </span>
      </Button>
    </div>
  );
}
