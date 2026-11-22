"use client";

import * as React from "react";
import type { PageViewport } from "pdfjs-dist";
import { Move } from "lucide-react";
import { usePdfEditorStore } from "@/stores/pdf-editor-store";
import {
  type DrawAnnotation,
  type EditorAnnotation,
  type PdfPoint,
  type SignatureAnnotation,
  type TextReplacement,
  type TextAnnotation,
  getCssFontFamily,
} from "@/types/editor";
import { cn } from "@/lib/utils";
import {
  pdfPointToViewport,
  pdfRectToViewportRect,
  screenDeltaToPdfDelta,
} from "@/lib/pdf/coordinates";

const EMPTY_ANNOTATIONS: EditorAnnotation[] = [];
const EMPTY_REPLACEMENTS: TextReplacement[] = [];

function pointsToPath(points: PdfPoint[], viewport: PageViewport): string {
  return points
    .map((point, index) => {
      const screenPoint = pdfPointToViewport(point, viewport);
      return `${index === 0 ? "M" : "L"} ${screenPoint.x} ${screenPoint.y}`;
    })
    .join(" ");
}

/**
 * Generic draggable box wrapper for rectangular annotations (image, text-box, typed signature).
 * Provides smooth 60fps dragging, live visual transform, clamping to page bounds, and single undo record.
 */
interface DraggableBoxProps {
  annotation: EditorAnnotation;
  viewport: PageViewport;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  label?: string;
}

function DraggableBox({
  annotation,
  viewport,
  children,
  className,
  style,
  label,
}: DraggableBoxProps) {
  const selectAnnotation = usePdfEditorStore((state) => state.selectAnnotation);
  const updateAnnotation = usePdfEditorStore((state) => state.updateAnnotation);
  const selected = usePdfEditorStore(
    (state) => state.selectedAnnotationId === annotation.id
  );

  const [dragOffset, setDragOffset] = React.useState<{ dx: number; dy: number } | null>(null);
  const dragRef = React.useRef<{
    startX: number;
    startY: number;
    dx: number;
    dy: number;
    hasMoved: boolean;
    pointerId: number;
  } | null>(null);

  const rect = pdfRectToViewportRect(annotation.pdfRect, viewport);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    selectAnnotation(annotation.id);
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      dx: 0,
      dy: 0,
      hasMoved: false,
      pointerId: event.pointerId,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;
    const dx = event.clientX - dragRef.current.startX;
    const dy = event.clientY - dragRef.current.startY;
    if (!dragRef.current.hasMoved && Math.hypot(dx, dy) >= 3) {
      dragRef.current.hasMoved = true;
    }
    if (dragRef.current.hasMoved) {
      dragRef.current.dx = dx;
      dragRef.current.dy = dy;
      setDragOffset({ dx, dy });
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const { hasMoved, dx, dy } = dragRef.current;
    dragRef.current = null;
    setDragOffset(null);

    if (hasMoved && (dx !== 0 || dy !== 0)) {
      const deltaPdf = screenDeltaToPdfDelta(dx, dy, viewport);
      const minX = 0;
      const maxX = viewport.width / viewport.scale;
      const minY = 0;
      const maxY = viewport.height / viewport.scale;

      const targetX = annotation.pdfRect.x + deltaPdf.x;
      const targetY = annotation.pdfRect.y + deltaPdf.y;
      const clampedX = Math.max(minX, Math.min(targetX, maxX - annotation.pdfRect.width));
      const clampedY = Math.max(minY, Math.min(targetY, maxY - annotation.pdfRect.height));

      if (clampedX !== annotation.pdfRect.x || clampedY !== annotation.pdfRect.y) {
        updateAnnotation({
          ...annotation,
          pdfRect: {
            ...annotation.pdfRect,
            x: clampedX,
            y: clampedY,
          },
        });
      }
    }
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
      setDragOffset(null);
    }
  };

  const displayLabel = label ?? annotation.type.replace("-", " ");
  const isDragging = Boolean(dragOffset);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Select and drag ${displayLabel} annotation`}
      className={cn(
        "absolute pointer-events-auto cursor-grab active:cursor-grabbing select-none transition-shadow",
        selected && "outline outline-2 outline-blue-500 rounded-[2px]",
        isDragging && "shadow-xl z-30 cursor-grabbing ring-2 ring-blue-500"
      )}
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
        transform: dragOffset
          ? `translate3d(${dragOffset.dx}px, ${dragOffset.dy}px, 0)`
          : undefined,
        zIndex: isDragging ? 35 : selected ? 25 : 15,
        touchAction: "none",
        ...style,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectAnnotation(selected ? null : annotation.id);
        }
      }}
    >
      <span className={className}>{children}</span>

      {/* Selected state: Move badge and corner grab handles */}
      {selected && (
        <>
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-blue-600 text-white text-[10px] font-medium px-1.5 py-0.5 rounded shadow pointer-events-none select-none whitespace-nowrap z-40">
            <Move className="h-2.5 w-2.5" />
            <span className="capitalize">{displayLabel}</span>
          </div>
          <div className="absolute -top-1 -left-1 h-2 w-2 rounded-full bg-blue-600 border border-white pointer-events-none z-40" />
          <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-blue-600 border border-white pointer-events-none z-40" />
          <div className="absolute -bottom-1 -left-1 h-2 w-2 rounded-full bg-blue-600 border border-white pointer-events-none z-40" />
          <div className="absolute -bottom-1 -right-1 h-2 w-2 rounded-full bg-blue-600 border border-white pointer-events-none z-40" />
        </>
      )}
    </div>
  );
}

/**
 * Draggable path for freehand drawings and drawn signatures.
 * Renders both an accessible grab hit-area stroke and a visual selection bounding box.
 */
function DraggablePath({
  annotation,
  points,
  strokeColor,
  strokeWidth,
  opacity,
  viewport,
}: {
  annotation: DrawAnnotation | SignatureAnnotation;
  points: PdfPoint[];
  strokeColor: string;
  strokeWidth: number;
  opacity: number;
  viewport: PageViewport;
}) {
  const selectAnnotation = usePdfEditorStore((state) => state.selectAnnotation);
  const updateAnnotation = usePdfEditorStore((state) => state.updateAnnotation);
  const selected = usePdfEditorStore(
    (state) => state.selectedAnnotationId === annotation.id
  );

  const [dragOffset, setDragOffset] = React.useState<{ dx: number; dy: number } | null>(null);
  const dragRef = React.useRef<{
    startX: number;
    startY: number;
    dx: number;
    dy: number;
    hasMoved: boolean;
    pointerId: number;
  } | null>(null);

  const rect = pdfRectToViewportRect(annotation.pdfRect, viewport);
  const path = pointsToPath(points, viewport);

  const handlePointerDown = (event: React.PointerEvent<HTMLElement | SVGElement>) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    selectAnnotation(annotation.id);
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      dx: 0,
      dy: 0,
      hasMoved: false,
      pointerId: event.pointerId,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLElement | SVGElement>) => {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;
    const dx = event.clientX - dragRef.current.startX;
    const dy = event.clientY - dragRef.current.startY;
    if (!dragRef.current.hasMoved && Math.hypot(dx, dy) >= 3) {
      dragRef.current.hasMoved = true;
    }
    if (dragRef.current.hasMoved) {
      dragRef.current.dx = dx;
      dragRef.current.dy = dy;
      setDragOffset({ dx, dy });
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLElement | SVGElement>) => {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const { hasMoved, dx, dy } = dragRef.current;
    dragRef.current = null;
    setDragOffset(null);

    if (hasMoved && (dx !== 0 || dy !== 0)) {
      const deltaPdf = screenDeltaToPdfDelta(dx, dy, viewport);
      const minX = 0;
      const maxX = viewport.width / viewport.scale;
      const minY = 0;
      const maxY = viewport.height / viewport.scale;

      const targetX = annotation.pdfRect.x + deltaPdf.x;
      const targetY = annotation.pdfRect.y + deltaPdf.y;
      const clampedX = Math.max(minX, Math.min(targetX, maxX - annotation.pdfRect.width));
      const clampedY = Math.max(minY, Math.min(targetY, maxY - annotation.pdfRect.height));
      const actualDeltaX = clampedX - annotation.pdfRect.x;
      const actualDeltaY = clampedY - annotation.pdfRect.y;

      if (actualDeltaX !== 0 || actualDeltaY !== 0) {
        updateAnnotation({
          ...annotation,
          pdfRect: {
            ...annotation.pdfRect,
            x: clampedX,
            y: clampedY,
          },
          points: points.map((p) => ({
            x: p.x + actualDeltaX,
            y: p.y + actualDeltaY,
          })),
        });
      }
    }
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLElement | SVGElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
      setDragOffset(null);
    }
  };

  const isDragging = Boolean(dragOffset);
  const transform = dragOffset
    ? `translate3d(${dragOffset.dx}px, ${dragOffset.dy}px, 0)`
    : undefined;

  const dragHandlers = {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerCancel,
  };

  const displayLabel = annotation.type === "signature" ? "Signature" : "Drawing";

  return (
    <>
      <svg
        className="absolute inset-0 h-full w-full overflow-visible pointer-events-none"
        style={{
          transform,
          zIndex: isDragging ? 35 : selected ? 25 : 15,
          touchAction: "none",
        }}
        aria-label={`Page ${annotation.pageNumber} ${annotation.type} annotation`}
      >
        {/* Invisible wider hit area for easy grabbing on touch or mouse */}
        <path
          d={path}
          fill="none"
          stroke="transparent"
          strokeWidth={Math.max(16, strokeWidth * viewport.scale + 12)}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-auto cursor-grab active:cursor-grabbing"
          role="button"
          tabIndex={0}
          aria-label={`Drag ${annotation.type} annotation`}
          {...dragHandlers}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              selectAnnotation(selected ? null : annotation.id);
            }
          }}
        />
        {/* Visible stroke */}
        <path
          d={path}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth * viewport.scale}
          strokeOpacity={opacity}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none"
        />
      </svg>

      {/* Selected bounding box and drag handles */}
      {selected && (
        <div
          className={cn(
            "absolute pointer-events-auto cursor-grab active:cursor-grabbing border-2 border-dashed border-blue-500 rounded bg-blue-500/5 select-none transition-shadow",
            isDragging && "shadow-xl ring-2 ring-blue-500 cursor-grabbing"
          )}
          style={{
            left: Math.max(0, rect.x - 4),
            top: Math.max(0, rect.y - 4),
            width: Math.max(20, rect.width + 8),
            height: Math.max(20, rect.height + 8),
            transform,
            zIndex: isDragging ? 36 : 26,
            touchAction: "none",
          }}
          {...dragHandlers}
        >
          {/* Move handle pill */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-blue-600 text-white text-[10px] font-medium px-1.5 py-0.5 rounded shadow pointer-events-none select-none whitespace-nowrap z-40">
            <Move className="h-2.5 w-2.5" />
            <span>{displayLabel}</span>
          </div>
          {/* 4 corner handles */}
          <div className="absolute -top-1 -left-1 h-2 w-2 rounded-full bg-blue-600 border border-white pointer-events-none z-40" />
          <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-blue-600 border border-white pointer-events-none z-40" />
          <div className="absolute -bottom-1 -left-1 h-2 w-2 rounded-full bg-blue-600 border border-white pointer-events-none z-40" />
          <div className="absolute -bottom-1 -right-1 h-2 w-2 rounded-full bg-blue-600 border border-white pointer-events-none z-40" />
        </div>
      )}
    </>
  );
}

function TextAnnotationOverlay({
  annotation,
  viewport,
}: {
  annotation: TextAnnotation;
  viewport: PageViewport;
}) {
  return (
    <DraggableBox
      annotation={annotation}
      viewport={viewport}
      label="Text"
      className="block h-full w-full overflow-hidden whitespace-pre-wrap break-words px-0.5"
      style={{
        fontSize: annotation.fontSize * viewport.scale,
        color: annotation.color,
        fontWeight: annotation.bold ? "bold" : "normal",
        fontStyle: annotation.italic ? "italic" : "normal",
        textDecoration: annotation.underline ? "underline" : "none",
        opacity: annotation.opacity,
        backgroundColor: annotation.backgroundColor ?? "transparent",
        fontFamily: getCssFontFamily(annotation.fontFamily),
        lineHeight: 1.3,
      }}
    >
      {annotation.content}
    </DraggableBox>
  );
}

function HighlightOverlay({
  annotation,
  viewport,
}: {
  annotation: EditorAnnotation;
  viewport: PageViewport;
}) {
  const selectAnnotation = usePdfEditorStore((state) => state.selectAnnotation);
  const selected = usePdfEditorStore(
    (state) => state.selectedAnnotationId === annotation.id
  );
  const rect = pdfRectToViewportRect(annotation.pdfRect, viewport);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Select highlight annotation"
      className={cn(
        "absolute pointer-events-auto cursor-pointer rounded-[2px]",
        selected && "outline outline-2 outline-blue-500"
      )}
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
        backgroundColor: "color" in annotation ? (annotation.color as string) : "#FFFF00",
        opacity: "opacity" in annotation ? (annotation.opacity as number) : 0.4,
        mixBlendMode: "multiply",
        zIndex: selected ? 25 : 10,
      }}
      onClick={(event) => {
        event.stopPropagation();
        selectAnnotation(selected ? null : annotation.id);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectAnnotation(selected ? null : annotation.id);
        }
      }}
    />
  );
}

interface AnnotationLayerProps {
  pageNumber: number;
  viewport: PageViewport;
  className?: string;
}

export function AnnotationLayer({
  pageNumber,
  viewport,
  className,
}: AnnotationLayerProps) {
  const annotationsByPage = usePdfEditorStore((state) => state.annotationsByPage);
  const annotations = annotationsByPage[pageNumber] ?? EMPTY_ANNOTATIONS;
  const replacementsByPage = usePdfEditorStore(
    (state) => state.textReplacementsByPage
  );
  const appliedReplacements =
    replacementsByPage[pageNumber] ?? EMPTY_REPLACEMENTS;
  const replacementPreview = usePdfEditorStore(
    (state) => state.replacementPreview
  );
  const visibleReplacements = appliedReplacements.filter(
    (replacement) => replacementPreview?.sourceItemId !== replacement.sourceItemId
  );
  const replacements = replacementPreview?.pageNumber === pageNumber
    ? [...visibleReplacements, replacementPreview]
    : visibleReplacements;

  if (annotations.length === 0 && replacements.length === 0) return null;

  return (
    <div
      className={cn("absolute inset-0 pointer-events-none", className)}
      aria-label="Annotation overlays"
      data-testid="annotation-layer"
    >
      {replacements.map((replacement) => {
        const rect = pdfRectToViewportRect(replacement.pdfRect, viewport);
        return (
          <div
            key={`replacement-${replacement.sourceItemId}`}
            className="absolute flex items-center overflow-hidden whitespace-nowrap"
            aria-label={`Text replacement preview: ${replacement.replacementText}`}
            style={{
              left: rect.x - viewport.scale,
              top: rect.y - viewport.scale,
              width: rect.width + 2 * viewport.scale,
              height: rect.height + 2 * viewport.scale,
              paddingLeft: viewport.scale,
              backgroundColor: replacement.backgroundColor,
              color: replacement.color,
              fontSize: replacement.fontSize * viewport.scale,
              fontFamily: getCssFontFamily(replacement.fontFamily),
              fontWeight: replacement.bold ? "bold" : "normal",
              fontStyle: replacement.italic ? "italic" : "normal",
              lineHeight: 1,
            }}
          >
            {replacement.replacementText}
          </div>
        );
      })}

      {annotations.map((annotation) => {
        switch (annotation.type) {
          case "text-box":
            return (
              <TextAnnotationOverlay
                key={annotation.id}
                annotation={annotation}
                viewport={viewport}
              />
            );
          case "highlight":
            return (
              <HighlightOverlay
                key={annotation.id}
                annotation={annotation}
                viewport={viewport}
              />
            );
          case "draw":
          case "signature":
            return annotation.points ? (
              <DraggablePath
                key={annotation.id}
                annotation={annotation}
                points={annotation.points}
                strokeColor={annotation.strokeColor}
                strokeWidth={annotation.strokeWidth}
                opacity={annotation.opacity}
                viewport={viewport}
              />
            ) : annotation.type === "signature" && annotation.typedText ? (
              <DraggableBox
                key={annotation.id}
                annotation={annotation}
                viewport={viewport}
                label="Signature"
                className="block h-full w-full"
                style={{
                  color: annotation.strokeColor,
                  fontSize: annotation.pdfRect.height * viewport.scale,
                  fontFamily: "cursive",
                  opacity: annotation.opacity,
                }}
              >
                {annotation.typedText}
              </DraggableBox>
            ) : null;
          case "image":
            return (
              <DraggableBox
                key={annotation.id}
                annotation={annotation}
                viewport={viewport}
                label="Image"
                className="block h-full w-full"
                style={{
                  opacity: annotation.opacity,
                  backgroundImage: `url("${annotation.dataUrl}")`,
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "contain",
                }}
              >
                {null}
              </DraggableBox>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
