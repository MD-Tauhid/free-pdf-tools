"use client";

import * as React from "react";
import type { PageViewport } from "pdfjs-dist";
import { usePdfEditorStore } from "@/stores/pdf-editor-store";
import type { EditorAnnotation, PdfPoint } from "@/types/editor";
import { pdfPointToViewport, viewportPointToPdf } from "@/lib/pdf/coordinates";

interface AnnotationInputLayerProps {
  pageNumber: number;
  viewport: PageViewport;
}

function toScreenPoint(point: PdfPoint, viewport: PageViewport) {
  return pdfPointToViewport(point, viewport);
}

function makePdfRect(points: PdfPoint[]) {
  const first = points[0];
  const last = points[points.length - 1];
  return {
    x: Math.min(first.x, last.x),
    y: Math.min(first.y, last.y),
    width: Math.abs(last.x - first.x),
    height: Math.abs(last.y - first.y),
  };
}

export function AnnotationInputLayer({
  pageNumber,
  viewport,
}: AnnotationInputLayerProps) {
  const activeTool = usePdfEditorStore((state) => state.activeTool);
  const addAnnotation = usePdfEditorStore((state) => state.addAnnotation);
  const selectAnnotation = usePdfEditorStore((state) => state.selectAnnotation);
  const [points, setPoints] = React.useState<PdfPoint[]>([]);
  const pointsRef = React.useRef<PdfPoint[]>([]);
  const activePointerIdRef = React.useRef<number | null>(null);
  const isDrawing =
    activeTool === "draw" ||
    activeTool === "highlight" ||
    activeTool === "signature";

  const pointFromEvent = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const bounds = event.currentTarget.getBoundingClientRect();
      return viewportPointToPdf(
        {
          x: event.clientX - bounds.left,
          y: event.clientY - bounds.top,
        },
        viewport
      );
    },
    [viewport]
  );

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawing || event.button !== 0 || activePointerIdRef.current !== null) {
      return;
    }
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointerIdRef.current = event.pointerId;
    const point = pointFromEvent(event);
    pointsRef.current = [point];
    setPoints([point]);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (
      !isDrawing ||
      activePointerIdRef.current !== event.pointerId ||
      pointsRef.current.length === 0
    ) {
      return;
    }
    const point = pointFromEvent(event);
    const previous = pointsRef.current[pointsRef.current.length - 1];
    if (
      previous &&
      Math.hypot(point.x - previous.x, point.y - previous.y) < 0.5
    ) {
      return;
    }
    pointsRef.current = [...pointsRef.current, point];
    setPoints(pointsRef.current);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (
      !isDrawing ||
      activePointerIdRef.current !== event.pointerId ||
      pointsRef.current.length === 0
    ) {
      return;
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    activePointerIdRef.current = null;
    const finalPoints = pointsRef.current;
    pointsRef.current = [];
    setPoints([]);
    if (finalPoints.length === 0) return;

    const id = crypto.randomUUID();
    let annotation: EditorAnnotation;
    if (activeTool === "highlight") {
      const pdfRect = makePdfRect(finalPoints);
      if (pdfRect.width < 1 || pdfRect.height < 1) return;
      annotation = {
        id,
        type: "highlight",
        pageNumber,
        pdfRect,
        color: "#FFFF00",
        opacity: 0.4,
        coveredItemIds: [],
      };
    } else if (activeTool === "signature") {
      annotation = {
        id,
        type: "signature",
        pageNumber,
        pdfRect: makePdfRect(finalPoints),
        points: finalPoints,
        typedText: null,
        strokeColor: "#111827",
        strokeWidth: 2,
        opacity: 1,
      };
    } else {
      annotation = {
        id,
        type: "draw",
        pageNumber,
        pdfRect: makePdfRect(finalPoints),
        points: finalPoints,
        strokeColor: "#111827",
        strokeWidth: 2,
        opacity: 1,
      };
    }
    addAnnotation(annotation);
    selectAnnotation(id);
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== event.pointerId) return;
    activePointerIdRef.current = null;
    pointsRef.current = [];
    setPoints([]);
  };

  if (!isDrawing && points.length === 0) return null;

  const screenPoints = points.map((point) => toScreenPoint(point, viewport));
  const lastScreenPoint = screenPoints[screenPoints.length - 1];
  const pathData = screenPoints
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  return (
    <div
      className="absolute inset-0 z-10"
      style={{
        pointerEvents: isDrawing ? "auto" : "none",
        cursor: isDrawing ? "crosshair" : "default",
        touchAction: "none",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      aria-label={`${activeTool} annotation input`}
      data-testid="annotation-input-layer"
    >
      {points.length > 0 && (
        <svg
          className="absolute inset-0 h-full w-full overflow-visible"
          aria-hidden="true"
        >
          {activeTool === "highlight" && points.length > 1 && lastScreenPoint ? (
            <rect
              x={Math.min(screenPoints[0].x, lastScreenPoint.x)}
              y={Math.min(screenPoints[0].y, lastScreenPoint.y)}
              width={Math.abs(lastScreenPoint.x - screenPoints[0].x)}
              height={Math.abs(lastScreenPoint.y - screenPoints[0].y)}
              fill="#FFFF00"
              fillOpacity="0.4"
            />
          ) : (
            <path
              d={pathData}
              fill="none"
              stroke="#111827"
              strokeWidth={2 * viewport.scale}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
      )}
    </div>
  );
}
