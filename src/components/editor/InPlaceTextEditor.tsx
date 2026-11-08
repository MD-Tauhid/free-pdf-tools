"use client";

import * as React from "react";
import type { PageViewport } from "pdfjs-dist";
import { usePdfEditorStore } from "@/stores/pdf-editor-store";
import {
  PDF_FONT_FAMILIES,
  getCssFontFamily,
  type ExtractedTextItem,
  type PdfFontFamily,
  type TextReplacement,
} from "@/types/editor";
import { pdfRectToViewportRect } from "@/lib/pdf/coordinates";
import { assessTextReplacement } from "@/lib/pdf/text-editing-engine";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Check,
  X,
  Bold,
  Italic,
  Minus,
  Plus,
  Palette,
  Highlighter,
  Sparkles,
} from "lucide-react";

interface InPlaceTextEditorProps {
  pageNumber: number;
  viewport: PageViewport;
}

const QUICK_COLORS = [
  "#000000",
  "#1e3a8a",
  "#2563eb",
  "#dc2626",
  "#16a34a",
];

const QUICK_BACKGROUNDS = [
  "#ffffff",
  "#fef08a",
  "#f3f4f6",
  "#cffafe",
];

interface InPlaceFormProps {
  item: ExtractedTextItem;
  existingReplacement?: TextReplacement;
  defaultFontSize: number;
  viewport: PageViewport;
  onApply: (replacement: TextReplacement) => void;
  onCancel: () => void;
  onPreview: (replacement: TextReplacement | null) => void;
}

function InPlaceForm({
  item,
  existingReplacement,
  defaultFontSize,
  viewport,
  onApply,
  onCancel,
  onPreview,
}: InPlaceFormProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const [text, setText] = React.useState(
    () => existingReplacement?.replacementText ?? item.text
  );
  const [fontSize, setFontSize] = React.useState(
    () => existingReplacement?.fontSize ?? defaultFontSize
  );
  const [fontFamily, setFontFamily] = React.useState<PdfFontFamily>(
    () => existingReplacement?.fontFamily ?? "Helvetica"
  );
  const [bold, setBold] = React.useState(
    () => existingReplacement?.bold ?? false
  );
  const [italic, setItalic] = React.useState(
    () => existingReplacement?.italic ?? false
  );
  const [color, setColor] = React.useState(
    () => existingReplacement?.color ?? "#000000"
  );
  const [backgroundColor, setBackgroundColor] = React.useState(
    () => existingReplacement?.backgroundColor ?? "#ffffff"
  );
  const [showColorPicker, setShowColorPicker] = React.useState(false);
  const [showBgPicker, setShowBgPicker] = React.useState(false);

  React.useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const screenRect = pdfRectToViewportRect(item.pdfRect, viewport);
  const assessment = assessTextReplacement(item, text);

  // Calculate width ratio to warn if text overflows
  const estimatedCharFactor = fontFamily === "Courier" ? 0.6 : bold ? 0.55 : 0.5;
  const estimatedTextWidth = text.length * fontSize * estimatedCharFactor;
  const availableWidth = item.pdfRect.width;
  const isTooWide = estimatedTextWidth > availableWidth;

  const createReplacementObj = (
    newText = text,
    newSize = fontSize,
    newFont = fontFamily,
    newBold = bold,
    newItalic = italic,
    newColor = color,
    newBg = backgroundColor
  ): TextReplacement => ({
    id: existingReplacement?.id ?? crypto.randomUUID(),
    type: "text-replacement",
    sourceItemId: item.id,
    originalItem: item,
    originalText: item.text,
    replacementText: newText,
    fontSize: newSize,
    fontFamily: newFont,
    bold: newBold,
    italic: newItalic,
    color: newColor,
    backgroundColor: newBg,
    pageNumber: item.pageNumber,
    pdfRect: item.pdfRect,
  });

  const handleTextChange = (newText: string) => {
    setText(newText);
    const nextAssessment = assessTextReplacement(item, newText);
    if (nextAssessment.supported && newText.trim().length > 0 && newText !== item.text) {
      onPreview(
        createReplacementObj(newText, fontSize, fontFamily, bold, italic, color, backgroundColor)
      );
    } else {
      onPreview(null);
    }
  };

  const handleApplyClick = () => {
    if (!assessment.supported || !text.trim() || text === item.text) {
      onCancel();
      return;
    }
    onApply(
      createReplacementObj(text, fontSize, fontFamily, bold, italic, color, backgroundColor)
    );
  };

  const handleAutoFit = () => {
    if (availableWidth > 0 && text.length > 0) {
      const idealSize = Math.max(
        6,
        Math.min(72, Math.floor((availableWidth / (text.length * estimatedCharFactor)) * 10) / 10)
      );
      setFontSize(idealSize);
      if (text !== item.text && text.trim().length > 0) {
        onPreview(
          createReplacementObj(text, idealSize, fontFamily, bold, italic, color, backgroundColor)
        );
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleApplyClick();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  // Position floating toolbar above the selection, or below if near top
  const toolbarTop = screenRect.y > 48 ? screenRect.y - 42 : screenRect.y + screenRect.height + 8;
  const toolbarLeft = Math.max(8, screenRect.x - 10);

  return (
    <>
      {/* Floating Word-style Mini Toolbar */}
      <div
        className="absolute z-40 flex items-center gap-1 p-1 bg-background/95 backdrop-blur-md rounded-lg border border-border shadow-xl text-xs text-foreground select-none pointer-events-auto"
        style={{
          top: toolbarTop,
          left: toolbarLeft,
          transform: "translate3d(0, 0, 0)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Font family selector */}
        <select
          value={fontFamily}
          onChange={(e) => {
            const val = e.target.value as PdfFontFamily;
            setFontFamily(val);
            if (text.trim() && text !== item.text) {
              onPreview(
                createReplacementObj(text, fontSize, val, bold, italic, color, backgroundColor)
              );
            }
          }}
          className="h-7 rounded border border-input bg-background px-1.5 py-0.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[130px] cursor-pointer"
          title="Font Family"
          aria-label="Font Family"
        >
          {PDF_FONT_FAMILIES.map((f) => (
            <option key={f.value} value={f.value} style={{ fontFamily: f.cssFamily }}>
              {f.label}
            </option>
          ))}
        </select>

        {/* Font size decrement/increment */}
        <div className="flex items-center rounded border border-input bg-background/80">
          <button
            type="button"
            className="h-7 w-6 flex items-center justify-center hover:bg-muted active:scale-95 text-muted-foreground hover:text-foreground"
            onClick={() => {
              const next = Math.max(6, fontSize - 1);
              setFontSize(next);
              if (text.trim() && text !== item.text) {
                onPreview(
                  createReplacementObj(text, next, fontFamily, bold, italic, color, backgroundColor)
                );
              }
            }}
            title="Decrease Font Size"
            aria-label="Decrease Font Size"
          >
            <Minus className="h-3 w-3" />
          </button>
          <input
            type="number"
            min={4}
            max={72}
            step={0.5}
            value={fontSize}
            onChange={(e) => {
              const val = Number(e.target.value);
              if (Number.isFinite(val) && val >= 4 && val <= 72) {
                setFontSize(val);
                if (text.trim() && text !== item.text) {
                  onPreview(
                    createReplacementObj(text, val, fontFamily, bold, italic, color, backgroundColor)
                  );
                }
              }
            }}
            className="h-7 w-10 text-center text-xs font-mono bg-transparent border-0 focus:outline-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            aria-label="Font Size in points"
          />
          <button
            type="button"
            className="h-7 w-6 flex items-center justify-center hover:bg-muted active:scale-95 text-muted-foreground hover:text-foreground"
            onClick={() => {
              const next = Math.min(72, fontSize + 1);
              setFontSize(next);
              if (text.trim() && text !== item.text) {
                onPreview(
                  createReplacementObj(text, next, fontFamily, bold, italic, color, backgroundColor)
                );
              }
            }}
            title="Increase Font Size"
            aria-label="Increase Font Size"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>

        {/* Bold button */}
        <button
          type="button"
          onClick={() => {
            const next = !bold;
            setBold(next);
            if (text.trim() && text !== item.text) {
              onPreview(
                createReplacementObj(text, fontSize, fontFamily, next, italic, color, backgroundColor)
              );
            }
          }}
          className={cn(
            "h-7 w-7 rounded flex items-center justify-center font-bold transition-colors",
            bold
              ? "bg-blue-600 text-white shadow-xs"
              : "hover:bg-muted text-muted-foreground hover:text-foreground"
          )}
          title="Bold (Ctrl+B)"
          aria-label="Bold"
          aria-pressed={bold}
        >
          <Bold className="h-3.5 w-3.5" />
        </button>

        {/* Italic button */}
        <button
          type="button"
          onClick={() => {
            const next = !italic;
            setItalic(next);
            if (text.trim() && text !== item.text) {
              onPreview(
                createReplacementObj(text, fontSize, fontFamily, bold, next, color, backgroundColor)
              );
            }
          }}
          className={cn(
            "h-7 w-7 rounded flex items-center justify-center italic transition-colors",
            italic
              ? "bg-blue-600 text-white shadow-xs"
              : "hover:bg-muted text-muted-foreground hover:text-foreground"
          )}
          title="Italic (Ctrl+I)"
          aria-label="Italic"
          aria-pressed={italic}
        >
          <Italic className="h-3.5 w-3.5" />
        </button>

        {/* Text color button with quick picker */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowColorPicker(!showColorPicker);
              setShowBgPicker(false);
            }}
            className="h-7 px-1.5 rounded flex items-center gap-1 hover:bg-muted text-foreground transition-colors"
            title="Text Color"
            aria-label="Text Color"
          >
            <span className="font-bold text-xs" style={{ color }}>
              A
            </span>
            <span
              className="h-1.5 w-3 rounded-full border border-black/20"
              style={{ backgroundColor: color }}
            />
          </button>
          {showColorPicker && (
            <div className="absolute top-8 left-0 z-50 p-2 bg-popover rounded-md border shadow-lg flex flex-col gap-1.5 min-w-[120px]">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                Font Color
              </span>
              <div className="flex gap-1 items-center">
                {QUICK_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setColor(c);
                      setShowColorPicker(false);
                      if (text.trim() && text !== item.text) {
                        onPreview(
                          createReplacementObj(text, fontSize, fontFamily, bold, italic, c, backgroundColor)
                        );
                      }
                    }}
                    className="h-5 w-5 rounded-full border border-black/20 hover:scale-110 transition-transform"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <label className="flex items-center gap-1 text-[11px] cursor-pointer mt-1 pt-1 border-t text-muted-foreground">
                <Palette className="h-3 w-3" />
                <span>Custom…</span>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => {
                    setColor(e.target.value);
                    if (text.trim() && text !== item.text) {
                      onPreview(
                        createReplacementObj(text, fontSize, fontFamily, bold, italic, e.target.value, backgroundColor)
                      );
                    }
                  }}
                  className="sr-only"
                />
              </label>
            </div>
          )}
        </div>

        {/* Cover / Highlight color */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowBgPicker(!showBgPicker);
              setShowColorPicker(false);
            }}
            className="h-7 px-1.5 rounded flex items-center gap-1 hover:bg-muted text-foreground transition-colors"
            title="Cover Background Color"
            aria-label="Cover Background Color"
          >
            <Highlighter className="h-3.5 w-3.5" />
            <span
              className="h-1.5 w-3 rounded-full border border-black/20"
              style={{ backgroundColor }}
            />
          </button>
          {showBgPicker && (
            <div className="absolute top-8 left-0 z-50 p-2 bg-popover rounded-md border shadow-lg flex flex-col gap-1.5 min-w-[120px]">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                Paper Cover Color
              </span>
              <div className="flex gap-1 items-center">
                {QUICK_BACKGROUNDS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setBackgroundColor(c);
                      setShowBgPicker(false);
                      if (text.trim() && text !== item.text) {
                        onPreview(
                          createReplacementObj(text, fontSize, fontFamily, bold, italic, color, c)
                        );
                      }
                    }}
                    className="h-5 w-5 rounded-full border border-black/20 hover:scale-110 transition-transform"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <label className="flex items-center gap-1 text-[11px] cursor-pointer mt-1 pt-1 border-t text-muted-foreground">
                <Palette className="h-3 w-3" />
                <span>Custom…</span>
                <input
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => {
                    setBackgroundColor(e.target.value);
                    if (text.trim() && text !== item.text) {
                      onPreview(
                        createReplacementObj(text, fontSize, fontFamily, bold, italic, color, e.target.value)
                      );
                    }
                  }}
                  className="sr-only"
                />
              </label>
            </div>
          )}
        </div>

        {/* Auto-fit button if too long */}
        {isTooWide && (
          <button
            type="button"
            onClick={handleAutoFit}
            className="h-7 px-1.5 rounded flex items-center gap-1 text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40 text-[11px] font-medium"
            title="Auto-shrink font size to fit inside span"
          >
            <Sparkles className="h-3 w-3 text-amber-500" />
            <span>Fit</span>
          </button>
        )}

        <div className="h-4 w-px bg-border mx-0.5" />

        {/* Apply & Cancel */}
        <Button
          size="icon-xs"
          variant="default"
          onClick={handleApplyClick}
          className="h-7 w-7 bg-green-600 hover:bg-green-700 text-white"
          title="Apply Changes (Enter)"
          aria-label="Apply Changes"
        >
          <Check className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon-xs"
          variant="ghost"
          onClick={onCancel}
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          title="Cancel (Esc)"
          aria-label="Cancel"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Direct In-Place Input positioned directly over the text span */}
      <div
        className="absolute z-30 pointer-events-auto"
        style={{
          left: screenRect.x - viewport.scale,
          top: screenRect.y - viewport.scale,
          width: Math.max(screenRect.width + 4 * viewport.scale, 40),
          height: screenRect.height + 2 * viewport.scale,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full h-full border-2 border-dashed border-blue-500 rounded-xs outline-none px-1 shadow-md select-text"
          style={{
            backgroundColor,
            color,
            fontFamily: getCssFontFamily(fontFamily),
            fontSize: `${fontSize * viewport.scale}px`,
            fontWeight: bold ? "bold" : "normal",
            fontStyle: italic ? "italic" : "normal",
            lineHeight: 1,
          }}
          aria-label="In-place text editing"
        />
      </div>
    </>
  );
}

export function InPlaceTextEditor({
  pageNumber,
  viewport,
}: InPlaceTextEditorProps) {
  const selectedTextItem = usePdfEditorStore((s) => s.selectedTextItem);
  const selectTextItem = usePdfEditorStore((s) => s.selectTextItem);
  const replacementsByPage = usePdfEditorStore(
    (s) => s.textReplacementsByPage[pageNumber]
  );
  const setReplacementPreview = usePdfEditorStore(
    (s) => s.setReplacementPreview
  );
  const applyTextReplacement = usePdfEditorStore(
    (s) => s.applyTextReplacement
  );

  // Check if current selection belongs to this page
  const isSelectedOnThisPage =
    selectedTextItem && selectedTextItem.item.pageNumber === pageNumber;

  const item = isSelectedOnThisPage ? selectedTextItem.item : null;

  const existingReplacement = React.useMemo(() => {
    if (!item || !replacementsByPage) return undefined;
    return replacementsByPage.find((r) => r.sourceItemId === item.id);
  }, [item, replacementsByPage]);

  const defaultFontSize = React.useMemo(() => {
    if (!item) return 10;
    return Math.min(72, Math.max(1, Math.round(item.pdfRect.height * 0.85 * 2) / 2));
  }, [item]);

  if (!item) return null;

  return (
    <InPlaceForm
      key={item.id}
      item={item}
      existingReplacement={existingReplacement}
      defaultFontSize={defaultFontSize}
      viewport={viewport}
      onApply={(replacement) => {
        applyTextReplacement(replacement);
        selectTextItem(null);
      }}
      onCancel={() => {
        setReplacementPreview(null);
        selectTextItem(null);
      }}
      onPreview={setReplacementPreview}
    />
  );
}
