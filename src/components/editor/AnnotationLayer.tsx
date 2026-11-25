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
  computeResizedScreenRect,
  pdfPointToViewport,
  pdfRectToViewportRect,
  scalePointsToRect,
  screenDeltaToPdfDelta,
  screenRectToPdfRect,
  type RectBounds,
  type ResizeHandle,
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

const HANDLE_CONFIGS: readonly {
  handle: ResizeHandle;
  className: string;
}[] = [
    { handle: "nw", className: "-top-1.5 -left-1.5 cursor-nwse-resize" },
    { handle: "n", className: "-top-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize" },
    { handle: "ne", className: "-top-1.5 -right-1.5 cursor-nesw-resize" },
    { handle: "e", className: "top-1/2 -right-1.5 -translate-y-1/2 cursor-ew-resize" },
    { handle: "se", className: "-bottom-1.5 -right-1.5 cursor-nwse-resize" },
    { handle: "s", className: "-bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize" },
    { handle: "sw", className: "-bottom-1.5 -left-1.5 cursor-nesw-resize" },
    { handle: "w", className: "top-1/2 -left-1.5 -translate-y-1/2 cursor-ew-resize" },
  ];

interface ResizeHandlesProps {
  startRect: RectBounds;
  viewport: PageViewport;
  defaultPreserveAspectRatio?: boolean;
  onResizePreview: (rect: RectBounds | null) => void;
  onResizeCommit: (finalRect: RectBounds) => void;
}

/**
 * Interactive 8-point resize handles (4 corners + 4 edges) for selected annotations.
 */
function ResizeHandles({
  startRect,
  viewport,
  defaultPreserveAspectRatio = false,
  onResizePreview,
  onResizeCommit,
}: ResizeHandlesProps) {
  const resizeRef = React.useRef<{
    handle: ResizeHandle;
    startX: number;
    startY: number;
    startRect: RectBounds;
    lastRect: RectBounds;
    pointerId: number;
  } | null>(null);

  const handlePointerDown = (
    handle: ResizeHandle,
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeRef.current = {
      handle,
      startX: event.clientX,
      startY: event.clientY,
      startRect,
      lastRect: startRect,
      pointerId: event.pointerId,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = resizeRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    event.stopPropagation();
    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;
    const nextRect = computeResizedScreenRect({
      startRect: state.startRect,
      handle: state.handle,
      dx,
      dy,
      boundsWidth: viewport.width,
      boundsHeight: viewport.height,
      minSize: 16,
      preserveAspectRatio: defaultPreserveAspectRatio || event.shiftKey,
    });
    state.lastRect = nextRect;
    onResizePreview(nextRect);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = resizeRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    event.stopPropagation();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const { startRect: initial, lastRect } = state;
    resizeRef.current = null;
    onResizePreview(null);

    if (
      lastRect.x !== initial.x ||
      lastRect.y !== initial.y ||
      lastRect.width !== initial.width ||
      lastRect.height !== initial.height
    ) {
      onResizeCommit(lastRect);
    }
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    if (resizeRef.current?.pointerId === event.pointerId) {
      resizeRef.current = null;
      onResizePreview(null);
    }
  };

  return (
    <>
      {HANDLE_CONFIGS.map(({ handle, className }) => (
        <div
          key={handle}
          aria-label={`Resize ${handle} handle`}
          className={cn(
            "absolute h-3 w-3 rounded-full bg-blue-600 border-2 border-white shadow-sm pointer-events-auto z-40 hover:scale-125 transition-transform",
            className
          )}
          style={{ touchAction: "none" }}
          onPointerDown={(e) => handlePointerDown(handle, e)}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
        />
      ))}
    </>
  );
}

/**
 * Generic draggable and resizable box wrapper for rectangular annotations
 * (image, text-box, typed signature).
 * Provides smooth 60fps dragging/resizing, clamping to page bounds, and single undo record.
 */
interface DraggableBoxProps {
  annotation: EditorAnnotation;
  viewport: PageViewport;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  getDynamicStyle?: (displayRect: RectBounds) => React.CSSProperties;
  label?: string;
}

function DraggableBox({
  annotation,
  viewport,
  children,
  className,
  style,
  getDynamicStyle,
  label,
}: DraggableBoxProps) {
  const selectAnnotation = usePdfEditorStore((state) => state.selectAnnotation);
  const updateAnnotation = usePdfEditorStore((state) => state.updateAnnotation);
  const selected = usePdfEditorStore(
    (state) => state.selectedAnnotationId === annotation.id
  );

  const [dragOffset, setDragOffset] = React.useState<{ dx: number; dy: number } | null>(null);
  const [resizeRect, setResizeRect] = React.useState<RectBounds | null>(null);
  const dragRef = React.useRef<{
    startX: number;
    startY: number;
    dx: number;
    dy: number;
    hasMoved: boolean;
    pointerId: number;
  } | null>(null);

  const rect = pdfRectToViewportRect(annotation.pdfRect, viewport);
  const displayRect = resizeRect ?? rect;

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || resizeRect) return;
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

  const handleResizeCommit = (finalScreenRect: RectBounds) => {
    const newPdfRect = screenRectToPdfRect(finalScreenRect, viewport);
    updateAnnotation({
      ...annotation,
      pdfRect: newPdfRect,
    });
  };

  const displayLabel = label ?? annotation.type.replace("-", " ");
  const isDragging = Boolean(dragOffset);
  const isResizing = Boolean(resizeRect);
  const resolvedStyle: React.CSSProperties = {
    left: displayRect.x,
    top: displayRect.y,
    width: displayRect.width,
    height: displayRect.height,
    transform: dragOffset
      ? `translate3d(${dragOffset.dx}px, ${dragOffset.dy}px, 0)`
      : undefined,
    zIndex: isDragging || isResizing ? 35 : selected ? 25 : 15,
    touchAction: "none",
    ...style,
    ...(getDynamicStyle ? getDynamicStyle(displayRect) : undefined),
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Select, drag, and resize ${displayLabel} annotation`}
      className={cn(
        "absolute pointer-events-auto cursor-grab active:cursor-grabbing select-none transition-shadow",
        selected && "outline outline-2 outline-blue-500 rounded-[2px]",
        (isDragging || isResizing) && "shadow-xl z-30 ring-2 ring-blue-500",
        isDragging && "cursor-grabbing"
      )}
      style={resolvedStyle}
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

      {/* Selected state: Move badge and 8 resize handles */}
      {selected && (
        <>
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-blue-600 text-white text-[10px] font-medium px-1.5 py-0.5 rounded shadow pointer-events-none select-none whitespace-nowrap z-40">
            <Move className="h-2.5 w-2.5" />
            <span className="capitalize">{displayLabel}</span>
          </div>
          <ResizeHandles
            startRect={rect}
            viewport={viewport}
            defaultPreserveAspectRatio={annotation.type === "image"}
            onResizePreview={setResizeRect}
            onResizeCommit={handleResizeCommit}
          />
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
  const [resizeRect, setResizeRect] = React.useState<RectBounds | null>(null);
  const dragRef = React.useRef<{
    startX: number;
    startY: number;
    dx: number;
    dy: number;
    hasMoved: boolean;
    pointerId: number;
  } | null>(null);

  const rect = pdfRectToViewportRect(annotation.pdfRect, viewport);
  const displayRect = resizeRect ?? rect;

  const path = React.useMemo(() => {
    if (!resizeRect) return pointsToPath(points, viewport);
    return points
      .map((point, index) => {
        const sp = pdfPointToViewport(point, viewport);
        const relX = rect.width > 0.001 ? (sp.x - rect.x) / rect.width : 0.5;
        const relY = rect.height > 0.001 ? (sp.y - rect.y) / rect.height : 0.5;
        const sx = resizeRect.x + relX * resizeRect.width;
        const sy = resizeRect.y + relY * resizeRect.height;
        return `${index === 0 ? "M" : "L"} ${sx} ${sy}`;
      })
      .join(" ");
  }, [points, viewport, resizeRect, rect]);

  const handlePointerDown = (event: React.PointerEvent<HTMLElement | SVGElement>) => {
    if (event.button !== 0 || resizeRect) return;
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

  const handleResizeCommit = (finalScreenRect: RectBounds) => {
    const newPdfRect = screenRectToPdfRect(finalScreenRect, viewport);
    const scaledPoints = scalePointsToRect(points, annotation.pdfRect, newPdfRect);
    updateAnnotation({
      ...annotation,
      pdfRect: newPdfRect,
      points: scaledPoints,
    });
  };

  const isDragging = Boolean(dragOffset);
  const isResizing = Boolean(resizeRect);
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
          zIndex: isDragging || isResizing ? 35 : selected ? 25 : 15,
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

      {/* Selected bounding box and drag/resize handles */}
      {selected && (
        <div
          className={cn(
            "absolute pointer-events-auto cursor-grab active:cursor-grabbing border-2 border-dashed border-blue-500 rounded bg-blue-500/5 select-none transition-shadow",
            (isDragging || isResizing) && "shadow-xl ring-2 ring-blue-500",
            isDragging && "cursor-grabbing"
          )}
          style={{
            left: Math.max(0, displayRect.x - 4),
            top: Math.max(0, displayRect.y - 4),
            width: Math.max(20, displayRect.width + 8),
            height: Math.max(20, displayRect.height + 8),
            transform,
            zIndex: isDragging || isResizing ? 36 : 26,
            touchAction: "none",
          }}
          {...dragHandlers}
        >
          {/* Move handle pill */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-blue-600 text-white text-[10px] font-medium px-1.5 py-0.5 rounded shadow pointer-events-none select-none whitespace-nowrap z-40">
            <Move className="h-2.5 w-2.5" />
            <span>{displayLabel}</span>
          </div>
          <ResizeHandles
            startRect={rect}
            viewport={viewport}
            onResizePreview={setResizeRect}
            onResizeCommit={handleResizeCommit}
          />
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
                className="block h-full w-full overflow-hidden whitespace-nowrap"
                style={{
                  color: annotation.strokeColor,
                  fontFamily: "cursive",
                  opacity: annotation.opacity,
                  lineHeight: 1,
                }}
                getDynamicStyle={(displayRect) => ({
                  fontSize: displayRect.height,
                })}
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
                  backgroundSize: "100% 100%",
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
