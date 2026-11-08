"use client";

import * as React from "react";
import { usePdfEditorStore } from "@/stores/pdf-editor-store";
import {
  type EditorAnnotation,
  type TextAnnotation,
  type TextReplacement,
  type PdfFontFamily,
  PDF_FONT_FAMILIES,
  getCssFontFamily,
} from "@/types/editor";
import { assessTextReplacement } from "@/lib/pdf/text-editing-engine";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  X,
  Trash2,
  Type,
  Palette,
  AlignLeft,
  Info,
  Bold,
  Italic,
  Underline,
  Minus,
  Plus,
  Sparkles,
  Check,
  RotateCcw,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Helpers & Constants
// ---------------------------------------------------------------------------

function isTextAnnotation(a: EditorAnnotation): a is TextAnnotation {
  return a.type === "text-box";
}

const WORD_TEXT_COLORS = [
  "#000000",
  "#262626",
  "#1e3a8a",
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#9333ea",
  "#ea580c",
];

const WORD_COVER_COLORS = [
  "#ffffff",
  "#fef08a",
  "#f3f4f6",
  "#cffafe",
  "#dcfce7",
  "#fce7f3",
];

const FONT_SIZE_PRESETS = [9, 10, 11, 12, 14, 16, 18, 24];

// ---------------------------------------------------------------------------
// Sub-panel: Selected existing text info & MS Word-like editor
// ---------------------------------------------------------------------------

function SelectedTextPanel() {
  const selectedTextItem = usePdfEditorStore((s) => s.selectedTextItem);
  const selectTextItem = usePdfEditorStore((s) => s.selectTextItem);
  const replacementsByPage = usePdfEditorStore(
    (s) =>
      selectedTextItem
        ? s.textReplacementsByPage[selectedTextItem.item.pageNumber]
        : undefined
  );
  const replacementPreview = usePdfEditorStore((s) => s.replacementPreview);
  const setReplacementPreview = usePdfEditorStore(
    (s) => s.setReplacementPreview
  );
  const applyTextReplacement = usePdfEditorStore(
    (s) => s.applyTextReplacement
  );
  const removeTextReplacement = usePdfEditorStore(
    (s) => s.removeTextReplacement
  );
  const existingReplacement = replacementsByPage?.find(
    (replacement) => replacement.sourceItemId === selectedTextItem?.item.id
  );
  const defaultFontSize = Math.min(
    72,
    Math.max(1, selectedTextItem ? Math.round(selectedTextItem.item.pdfRect.height * 0.85 * 2) / 2 : 10)
  );
  const [draft, setDraft] = React.useState(() => ({
    text: existingReplacement?.replacementText ?? selectedTextItem?.item.text ?? "",
    fontSize: existingReplacement?.fontSize ?? defaultFontSize,
    fontFamily: existingReplacement?.fontFamily ?? ("Helvetica" as PdfFontFamily),
    bold: existingReplacement?.bold ?? false,
    italic: existingReplacement?.italic ?? false,
    color: existingReplacement?.color ?? "#000000",
    backgroundColor: existingReplacement?.backgroundColor ?? "#ffffff",
  }));

  if (!selectedTextItem) return null;

  const { item } = selectedTextItem;
  const assessment = assessTextReplacement(item, draft.text);
  const canApply =
    assessment.supported &&
    draft.text.trim().length > 0 &&
    draft.text !== item.text;
  const hasPreview = replacementPreview?.sourceItemId === item.id;

  // Estimate text width to warn if it exceeds the bounding box
  const charFactor = draft.fontFamily === "Courier" ? 0.6 : draft.bold ? 0.55 : 0.5;
  const estimatedWidth = draft.text.length * draft.fontSize * charFactor;
  const availableWidth = item.pdfRect.width;
  const widthRatio = availableWidth > 0 ? estimatedWidth / availableWidth : 1;
  const isTooWide = widthRatio > 1;

  const createReplacement = (
    values: typeof draft
  ): TextReplacement => ({
    id: existingReplacement?.id ?? crypto.randomUUID(),
    type: "text-replacement",
    sourceItemId: item.id,
    originalItem: item,
    originalText: item.text,
    replacementText: values.text,
    fontSize: values.fontSize,
    fontFamily: values.fontFamily,
    bold: values.bold,
    italic: values.italic,
    color: values.color,
    backgroundColor: values.backgroundColor,
    pageNumber: item.pageNumber,
    pdfRect: item.pdfRect,
  });

  const updateDraft = (values: Partial<typeof draft>) => {
    const next = { ...draft, ...values };
    setDraft(next);
    const nextAssessment = assessTextReplacement(item, next.text);
    setReplacementPreview(
      nextAssessment.supported &&
        next.text.trim().length > 0 &&
        next.text !== item.text
        ? createReplacement(next)
        : null
    );
  };

  const cancelPreview = () => {
    setReplacementPreview(null);
    setDraft({
      text: existingReplacement?.replacementText ?? item.text,
      fontSize:
        existingReplacement?.fontSize ??
        Math.min(72, Math.max(1, Math.round(item.pdfRect.height * 0.85 * 2) / 2)),
      fontFamily: existingReplacement?.fontFamily ?? "Helvetica",
      bold: existingReplacement?.bold ?? false,
      italic: existingReplacement?.italic ?? false,
      color: existingReplacement?.color ?? "#000000",
      backgroundColor: existingReplacement?.backgroundColor ?? "#ffffff",
    });
  };

  const handleAutoFit = () => {
    if (availableWidth > 0 && draft.text.length > 0) {
      const idealSize = Math.max(
        6,
        Math.min(72, Math.floor((availableWidth / (draft.text.length * charFactor)) * 10) / 10)
      );
      updateDraft({ fontSize: idealSize });
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Title & Deselect */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Type className="h-4 w-4 text-blue-600 shrink-0" />
          <span>Edit Document Text</span>
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

      {/* Original Content Card */}
      <div className="rounded-lg border bg-muted/40 p-2.5 space-y-1">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Original text span</span>
          <span>{item.text.length} chars</span>
        </div>
        <p className="text-xs text-foreground font-mono break-all leading-relaxed bg-background/80 p-1.5 rounded border">
          &ldquo;{item.text}&rdquo;
        </p>
      </div>

      {/* MS Word Font & Formatting Group */}
      <div className="rounded-lg border bg-card p-3 space-y-3 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
            Word Font & Style
          </span>
          <span className="text-[10px] text-blue-600 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-300 font-medium px-1.5 py-0.5 rounded">
            Live Preview
          </span>
        </div>

        {/* Font Family Dropdown */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground flex items-center justify-between">
            <span>Font Family</span>
            <span className="text-[10px] text-muted-foreground">
              {PDF_FONT_FAMILIES.find((f) => f.value === draft.fontFamily)?.category}
            </span>
          </label>
          <select
            value={draft.fontFamily}
            onChange={(e) => updateDraft({ fontFamily: e.target.value as PdfFontFamily })}
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            aria-label="Font Family"
          >
            {PDF_FONT_FAMILIES.map((font) => (
              <option
                key={font.value}
                value={font.value}
                style={{ fontFamily: font.cssFamily }}
              >
                {font.label} ({font.description})
              </option>
            ))}
          </select>
        </div>

        {/* Font Size & Presets */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Font Size</span>
            <span className="font-mono text-foreground font-semibold">
              {draft.fontSize} pt
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="h-8 w-8 rounded border flex items-center justify-center hover:bg-muted active:scale-95 text-muted-foreground hover:text-foreground shrink-0"
              onClick={() => updateDraft({ fontSize: Math.max(4, draft.fontSize - 1) })}
              title="Decrease size"
              aria-label="Decrease size"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <input
              type="number"
              min={1}
              max={72}
              step={0.5}
              value={draft.fontSize}
              onChange={(e) => {
                const value = Number(e.target.value);
                if (Number.isFinite(value) && value >= 1 && value <= 72) {
                  updateDraft({ fontSize: value });
                }
              }}
              className="flex-1 h-8 rounded-md border bg-background px-2 text-center text-xs font-mono"
              aria-label="Replacement font size"
            />
            <button
              type="button"
              className="h-8 w-8 rounded border flex items-center justify-center hover:bg-muted active:scale-95 text-muted-foreground hover:text-foreground shrink-0"
              onClick={() => updateDraft({ fontSize: Math.min(72, draft.fontSize + 1) })}
              title="Increase size"
              aria-label="Increase size"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          {/* Quick presets */}
          <div className="flex flex-wrap gap-1 pt-0.5">
            {FONT_SIZE_PRESETS.map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => updateDraft({ fontSize: sz })}
                className={cn(
                  "px-1.5 py-0.5 text-[10px] rounded border font-mono transition-colors",
                  draft.fontSize === sz
                    ? "bg-blue-600 text-white border-blue-600 font-bold"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted"
                )}
              >
                {sz}
              </button>
            ))}
          </div>
        </div>

        {/* Style Toggles (B, I) */}
        <div className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground block">
            Text Style
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => updateDraft({ bold: !draft.bold })}
              className={cn(
                "h-8 flex-1 rounded border text-xs font-bold transition-all flex items-center justify-center gap-1",
                draft.bold
                  ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                  : "bg-background text-muted-foreground border-border hover:bg-muted"
              )}
              aria-pressed={draft.bold}
              title="Bold"
            >
              <Bold className="h-3.5 w-3.5" />
              <span>Bold</span>
            </button>
            <button
              type="button"
              onClick={() => updateDraft({ italic: !draft.italic })}
              className={cn(
                "h-8 flex-1 rounded border text-xs italic font-medium transition-all flex items-center justify-center gap-1",
                draft.italic
                  ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                  : "bg-background text-muted-foreground border-border hover:bg-muted"
              )}
              aria-pressed={draft.italic}
              title="Italic"
            >
              <Italic className="h-3.5 w-3.5" />
              <span>Italic</span>
            </button>
          </div>
        </div>

        {/* Colors (Word Palette) */}
        <div className="grid grid-cols-2 gap-3 pt-1 border-t">
          {/* Text Color */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-muted-foreground block">
              Font Color
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={draft.color}
                onChange={(e) => updateDraft({ color: e.target.value })}
                className="h-7 w-7 rounded border cursor-pointer p-0 shrink-0"
                aria-label="Text color"
              />
              <span className="text-[10px] font-mono text-muted-foreground truncate">
                {draft.color}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {WORD_TEXT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => updateDraft({ color: c })}
                  className={cn(
                    "h-4 w-4 rounded-full border border-black/20 hover:scale-115 transition-transform",
                    draft.color.toLowerCase() === c.toLowerCase() && "ring-2 ring-blue-500 ring-offset-1"
                  )}
                  style={{ backgroundColor: c }}
                  title={`Select ${c}`}
                />
              ))}
            </div>
          </div>

          {/* Cover Color */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-muted-foreground block">
              Paper Cover Color
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={draft.backgroundColor}
                onChange={(e) => updateDraft({ backgroundColor: e.target.value })}
                className="h-7 w-7 rounded border cursor-pointer p-0 shrink-0"
                aria-label="Background cover color"
              />
              <span className="text-[10px] font-mono text-muted-foreground truncate">
                {draft.backgroundColor}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {WORD_COVER_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => updateDraft({ backgroundColor: c })}
                  className={cn(
                    "h-4 w-4 rounded-full border border-black/20 hover:scale-115 transition-transform",
                    draft.backgroundColor.toLowerCase() === c.toLowerCase() && "ring-2 ring-blue-500 ring-offset-1"
                  )}
                  style={{ backgroundColor: c }}
                  title={`Select ${c}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Replacement Text Input Card */}
      <div className="space-y-2 border-t pt-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-foreground">
            Replacement Text
          </label>
          <span className="text-[10px] text-muted-foreground">
            {draft.text.length} chars
          </span>
        </div>
        <textarea
          value={draft.text}
          onChange={(event) => updateDraft({ text: event.target.value })}
          rows={2}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans leading-normal"
          aria-label="Replacement text"
          placeholder="Type replacement text here…"
          style={{
            fontFamily: getCssFontFamily(draft.fontFamily),
            fontWeight: draft.bold ? "bold" : "normal",
            fontStyle: draft.italic ? "italic" : "normal",
          }}
        />

        {/* Width capacity indicator */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Bounding span capacity:</span>
            <span
              className={cn(
                "font-mono font-medium",
                isTooWide ? "text-destructive" : widthRatio > 0.85 ? "text-amber-600" : "text-green-600"
              )}
            >
              {Math.round(estimatedWidth)} pt / {Math.round(availableWidth)} pt ({Math.round(widthRatio * 100)}%)
            </span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-300 rounded-full",
                isTooWide ? "bg-destructive" : widthRatio > 0.85 ? "bg-amber-500" : "bg-green-500"
              )}
              style={{ width: `${Math.min(100, Math.round(widthRatio * 100))}%` }}
            />
          </div>
        </div>

        {/* Auto-fit suggestion */}
        {isTooWide && (
          <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30 p-2 text-xs flex items-center justify-between gap-2">
            <span className="text-amber-800 dark:text-amber-300 text-[11px]">
              Text exceeds original span. Auto-fit size to prevent overflow.
            </span>
            <Button
              size="xs"
              variant="outline"
              onClick={handleAutoFit}
              className="gap-1 shrink-0 text-amber-900 dark:text-amber-200 border-amber-300"
            >
              <Sparkles className="h-3 w-3" />
              <span>Auto-Fit</span>
            </Button>
          </div>
        )}

        {!assessment.supported && (
          <p className="rounded border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive">
            {assessment.warnings[0]}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            size="sm"
            onClick={() => applyTextReplacement(createReplacement(draft))}
            disabled={!canApply}
            className="flex-1 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Check className="h-3.5 w-3.5" />
            <span>Apply Changes</span>
          </Button>
          {hasPreview && (
            <Button size="sm" variant="outline" onClick={cancelPreview}>
              Cancel preview
            </Button>
          )}
          {existingReplacement && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                removeTextReplacement(item.id, item.pageNumber);
                setReplacementPreview(null);
                setDraft({
                  text: item.text,
                  fontSize: Math.min(72, Math.max(1, Math.round(item.pdfRect.height * 0.85 * 2) / 2)),
                  fontFamily: "Helvetica",
                  bold: false,
                  italic: false,
                  color: "#000000",
                  backgroundColor: "#ffffff",
                });
              }}
              className="gap-1 text-muted-foreground"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Revert</span>
            </Button>
          )}
        </div>
      </div>

      {/* Advisory Info Note */}
      <div className="rounded-lg border border-border/80 bg-muted/30 p-2.5 text-[11px] text-muted-foreground flex gap-2">
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-blue-500" />
        <span className="leading-relaxed">
          Export draws replacement text over the original using the selected font. The original source text remains recoverable in the PDF content stream.
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-panel: Annotation overlay properties (Text Box with Font Family)
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

  // Text annotation editor (Text Box)
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
            style={{
              fontFamily: getCssFontFamily(annotation.fontFamily),
              fontWeight: annotation.bold ? "bold" : "normal",
              fontStyle: annotation.italic ? "italic" : "normal",
            }}
          />
        </div>

        {/* Font Family */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Font Family
          </label>
          <select
            value={annotation.fontFamily}
            onChange={(e) =>
              updateAnnotation({ ...annotation, fontFamily: e.target.value })
            }
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            aria-label="Font Family"
          >
            {PDF_FONT_FAMILIES.map((font) => (
              <option
                key={font.value}
                value={font.value}
                style={{ fontFamily: font.cssFamily }}
              >
                {font.label}
              </option>
            ))}
          </select>
        </div>

        {/* Font size */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Font size</span>
            <span className="font-mono text-foreground font-semibold">
              {annotation.fontSize} pt
            </span>
          </div>
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
              className="flex-1 cursor-pointer"
              aria-label="Font size"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {FONT_SIZE_PRESETS.map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => updateAnnotation({ ...annotation, fontSize: sz })}
                className={cn(
                  "px-1.5 py-0.5 text-[10px] rounded border font-mono transition-colors",
                  annotation.fontSize === sz
                    ? "bg-blue-600 text-white border-blue-600 font-bold"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted"
                )}
              >
                {sz}
              </button>
            ))}
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
              className="h-8 w-10 rounded border cursor-pointer p-0"
              aria-label="Text color"
            />
            <div className="flex gap-1">
              {WORD_TEXT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => updateAnnotation({ ...annotation, color: c })}
                  className={cn(
                    "h-4 w-4 rounded-full border border-black/20 hover:scale-115 transition-transform",
                    annotation.color.toLowerCase() === c.toLowerCase() && "ring-2 ring-blue-500 ring-offset-1"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Style toggles */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Style</p>
          <div className="flex items-center gap-2">
            {[
              { key: "bold", label: "B", icon: Bold },
              { key: "italic", label: "I", icon: Italic },
              { key: "underline", label: "U", icon: Underline },
            ].map(({ key, label, icon: Icon }) => {
              const active = Boolean(annotation[key as keyof TextAnnotation]);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    updateAnnotation({ ...annotation, [key]: !active })
                  }
                  aria-pressed={active}
                  className={cn(
                    "h-8 flex-1 rounded border text-xs font-medium transition-colors flex items-center justify-center gap-1",
                    active
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-background text-muted-foreground border-border hover:border-foreground/40"
                  )}
                  title={label}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{label}</span>
                </button>
              );
            })}
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
          "w-72 border-l bg-background/80 backdrop-blur-xs flex flex-col shrink-0 hidden lg:flex",
          className
        )}
        aria-label="Properties"
      >
        <div className="flex items-center px-4 py-3 border-b">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Properties
          </span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <Type className="h-8 w-8 text-muted-foreground/40 mb-2" />
          <p className="text-xs font-medium text-foreground mb-1">No Selection</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Click any text on the page with the Select tool to edit it, or pick an annotation.
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={cn(
        "w-72 border-l bg-background/80 backdrop-blur-xs flex flex-col shrink-0 shadow-xs",
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
          <SelectedTextPanel key={selectedTextItem?.item.id ?? "no-selection"} />
        )}
      </div>
    </aside>
  );
}
