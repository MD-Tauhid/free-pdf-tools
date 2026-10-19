"use client";

import * as React from "react";
import type { PageViewport } from "pdfjs-dist";
import { usePdfEditorStore } from "@/stores/pdf-editor-store";
import type {
  DrawAnnotation,
  EditorAnnotation,
  PdfPoint,
  SignatureAnnotation,
  TextAnnotation,
} from "@/types/editor";
import { cn } from "@/lib/utils";
import { pdfPointToViewport, pdfRectToViewportRect } from "@/lib/pdf/coordinates";

const EMPTY_ANNOTATIONS: EditorAnnotation[] = [];

function pdfRectToStyle(
  pdfRect: { x: number; y: number; width: number; height: number },
  viewport: PageViewport
): React.CSSProperties {
  const rect = pdfRectToViewportRect(pdfRect, viewport);
  return {
    left: rect.x,
    top: rect.y,
    width: rect.width,
    height: rect.height,
  };
}

function pointsToPath(points: PdfPoint[], viewport: PageViewport): string {
  return points
    .map((point, index) => {
      const screenPoint = pdfPointToViewport(point, viewport);
      return `${index === 0 ? "M" : "L"} ${screenPoint.x} ${screenPoint.y}`;
    })
    .join(" ");
}

function Selectable({
  annotation,
  children,
  className,
  style,
}: {
  annotation: EditorAnnotation;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const selectAnnotation = usePdfEditorStore((state) => state.selectAnnotation);
  const selected = usePdfEditorStore(
    (state) => state.selectedAnnotationId === annotation.id
  );
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Select ${annotation.type.replace("-", " ")} annotation`}
      className={cn(
        "absolute pointer-events-auto cursor-pointer",
        selected && "outline outline-2 outline-blue-500"
      )}
      style={style}
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
    >
      <span className={className}>{children}</span>
    </div>
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
    <Selectable
      annotation={annotation}
      className="block h-full w-full overflow-hidden whitespace-pre-wrap break-words px-0.5"
      style={{
        ...pdfRectToStyle(annotation.pdfRect, viewport),
        fontSize: annotation.fontSize * viewport.scale,
        color: annotation.color,
        fontWeight: annotation.bold ? "bold" : "normal",
        fontStyle: annotation.italic ? "italic" : "normal",
        textDecoration: annotation.underline ? "underline" : "none",
        opacity: annotation.opacity,
        backgroundColor: annotation.backgroundColor ?? "transparent",
        fontFamily: annotation.fontFamily,
        lineHeight: 1.3,
      }}
    >
      {annotation.content}
    </Selectable>
  );
}

function PathAnnotation({
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
  const path = pointsToPath(points, viewport);
  return (
    <svg
      className="absolute inset-0 h-full w-full overflow-visible"
      aria-label={`Page ${annotation.pageNumber} ${annotation.type} annotation`}
    >
      <path
        d={path}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth * viewport.scale}
        strokeOpacity={opacity}
        strokeLinecap="round"
        strokeLinejoin="round"
        pointerEvents="stroke"
        className="cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
        role="button"
        tabIndex={0}
        aria-label={`Select ${annotation.type} annotation`}
        onClick={(event) => {
          event.stopPropagation();
          selectAnnotation(annotation.id);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            selectAnnotation(annotation.id);
          }
        }}
      />
    </svg>
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
  if (annotations.length === 0) return null;

  return (
    <div
      className={cn("absolute inset-0 pointer-events-none", className)}
      aria-label="Annotation overlays"
      data-testid="annotation-layer"
    >
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
              <Selectable
                key={annotation.id}
                annotation={annotation}
                className="block h-full w-full rounded-[2px]"
                style={{
                  ...pdfRectToStyle(annotation.pdfRect, viewport),
                  backgroundColor: annotation.color,
                  opacity: annotation.opacity,
                  mixBlendMode: "multiply",
                }}
              >
                {null}
              </Selectable>
            );
          case "draw":
          case "signature":
            return annotation.points ? (
              <PathAnnotation
                key={annotation.id}
                annotation={annotation}
                points={annotation.points}
                strokeColor={annotation.strokeColor}
                strokeWidth={annotation.strokeWidth}
                opacity={annotation.opacity}
                viewport={viewport}
              />
            ) : annotation.type === "signature" && annotation.typedText ? (
              <Selectable
                key={annotation.id}
                annotation={annotation}
                className="block h-full w-full"
                style={{
                  ...pdfRectToStyle(annotation.pdfRect, viewport),
                  color: annotation.strokeColor,
                  fontSize: annotation.pdfRect.height * viewport.scale,
                  fontFamily: "cursive",
                  opacity: annotation.opacity,
                }}
              >
                {annotation.typedText}
              </Selectable>
            ) : null;
          case "image":
            return (
              <Selectable
                key={annotation.id}
                annotation={annotation}
                className="block h-full w-full"
                style={{
                  ...pdfRectToStyle(annotation.pdfRect, viewport),
                  opacity: annotation.opacity,
                  backgroundImage: `url("${annotation.dataUrl}")`,
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "contain",
                }}
              >
                {null}
              </Selectable>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
