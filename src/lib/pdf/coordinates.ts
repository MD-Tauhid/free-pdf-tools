/**
 * Coordinate transformations between PDF User Space (72 DPI, bottom-left origin)
 * and Screen Space (CSS pixels, top-left origin).
 */

export interface ScreenPoint {
  x: number;
  y: number;
}

export interface PdfPoint {
  x: number;
  y: number;
}

export interface RectBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PdfViewportTransform {
  scale: number;
  convertToViewportPoint(x: number, y: number): number[];
  convertToPdfPoint(x: number, y: number): number[];
}

export function pdfPointToViewport(
  point: PdfPoint,
  viewport: PdfViewportTransform
): ScreenPoint {
  const [x, y] = viewport.convertToViewportPoint(point.x, point.y) as [
    number,
    number,
  ];
  return { x, y };
}

export function viewportPointToPdf(
  point: ScreenPoint,
  viewport: PdfViewportTransform
): PdfPoint {
  const [x, y] = viewport.convertToPdfPoint(point.x, point.y) as [
    number,
    number,
  ];
  return { x, y };
}

/**
 * Converts a delta offset in Screen Space (CSS pixels) to PDF User Space displacement vector.
 * Accounts for zoom scaling, page rotation, and coordinate orientation.
 */
export function screenDeltaToPdfDelta(
  screenDx: number,
  screenDy: number,
  viewport: PdfViewportTransform
): PdfPoint {
  const p0 = viewportPointToPdf({ x: 0, y: 0 }, viewport);
  const p1 = viewportPointToPdf({ x: screenDx, y: screenDy }, viewport);
  return {
    x: p1.x - p0.x,
    y: p1.y - p0.y,
  };
}

export function pdfRectToViewportRect(
  rect: RectBounds,
  viewport: PdfViewportTransform
): RectBounds {
  const corners = [
    pdfPointToViewport({ x: rect.x, y: rect.y }, viewport),
    pdfPointToViewport({ x: rect.x + rect.width, y: rect.y }, viewport),
    pdfPointToViewport({ x: rect.x, y: rect.y + rect.height }, viewport),
    pdfPointToViewport(
      { x: rect.x + rect.width, y: rect.y + rect.height },
      viewport
    ),
  ];
  const xs = corners.map(({ x }) => x);
  const ys = corners.map(({ y }) => y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  return {
    x: left,
    y: top,
    width: Math.max(...xs) - left,
    height: Math.max(...ys) - top,
  };
}

/**
 * Converts PDF coordinates (points, bottom-left origin) to Screen coordinates (pixels, top-left origin).
 */
export function pdfToScreen(
  pdfX: number,
  pdfY: number,
  pageHeight: number,
  scale: number
): ScreenPoint {
  return {
    x: pdfX * scale,
    y: (pageHeight - pdfY) * scale,
  };
}

/**
 * Converts Screen coordinates (pixels, top-left origin) to PDF coordinates (points, bottom-left origin).
 */
export function screenToPdf(
  screenX: number,
  screenY: number,
  pageHeight: number,
  scale: number
): PdfPoint {
  return {
    x: screenX / scale,
    y: pageHeight - screenY / scale,
  };
}

/**
 * Computes zoom scale for "fit-to-width" given available viewport width and page dimensions.
 */
export function calculateFitWidthScale(
  containerWidth: number,
  pageWidth: number,
  horizontalPadding = 48
): number {
  if (pageWidth <= 0) return 1.0;
  const availableWidth = Math.max(containerWidth - horizontalPadding, 200);
  const scale = availableWidth / pageWidth;
  return Math.min(Math.max(scale, 0.25), 3.0);
}

/**
 * Computes zoom scale for "fit-to-page" given viewport container and page dimensions.
 */
export function calculateFitPageScale(
  containerWidth: number,
  containerHeight: number,
  pageWidth: number,
  pageHeight: number,
  padding = 64
): number {
  if (pageWidth <= 0 || pageHeight <= 0) return 1.0;
  const availableWidth = Math.max(containerWidth - padding, 200);
  const availableHeight = Math.max(containerHeight - padding, 200);
  const scaleX = availableWidth / pageWidth;
  const scaleY = availableHeight / pageHeight;
  const scale = Math.min(scaleX, scaleY);
  return Math.min(Math.max(scale, 0.25), 3.0);
}

export type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

export interface ComputeResizeOptions {
  startRect: RectBounds;
  handle: ResizeHandle;
  dx: number;
  dy: number;
  boundsWidth: number;
  boundsHeight: number;
  minSize?: number;
  preserveAspectRatio?: boolean;
}

/**
 * Computes a resized bounding box in Screen Space, clamped to page bounds and
 * respecting minimum size and optional aspect ratio lock on corner handles.
 */
export function computeResizedScreenRect({
  startRect,
  handle,
  dx,
  dy,
  boundsWidth,
  boundsHeight,
  minSize = 16,
  preserveAspectRatio = false,
}: ComputeResizeOptions): RectBounds {
  const anchorLeft = startRect.x;
  const anchorRight = startRect.x + startRect.width;
  const anchorTop = startRect.y;
  const anchorBottom = startRect.y + startRect.height;

  let left = anchorLeft;
  let right = anchorRight;
  let top = anchorTop;
  let bottom = anchorBottom;

  if (handle.includes("w")) {
    left = Math.max(0, Math.min(anchorLeft + dx, anchorRight - minSize));
  }
  if (handle.includes("e")) {
    right = Math.min(boundsWidth, Math.max(anchorRight + dx, anchorLeft + minSize));
  }
  if (handle.includes("n")) {
    top = Math.max(0, Math.min(anchorTop + dy, anchorBottom - minSize));
  }
  if (handle.includes("s")) {
    bottom = Math.min(boundsHeight, Math.max(anchorBottom + dy, anchorTop + minSize));
  }

  const isCorner = handle.length === 2;
  if (preserveAspectRatio && isCorner && startRect.width > 0 && startRect.height > 0) {
    const aspect = startRect.width / startRect.height;
    const rawW = right - left;
    const rawH = bottom - top;
    const widthDeltaRatio = Math.abs(rawW / startRect.width - 1);
    const heightDeltaRatio = Math.abs(rawH / startRect.height - 1);

    let targetW = widthDeltaRatio >= heightDeltaRatio ? rawW : rawH * aspect;
    let targetH = targetW / aspect;

    const maxW = handle.includes("w") ? anchorRight : boundsWidth - anchorLeft;
    const maxH = handle.includes("n") ? anchorBottom : boundsHeight - anchorTop;

    if (targetW > maxW) {
      targetW = maxW;
      targetH = targetW / aspect;
    }
    if (targetH > maxH) {
      targetH = maxH;
      targetW = targetH * aspect;
    }
    if (targetW < minSize) {
      targetW = minSize;
      targetH = targetW / aspect;
    }
    if (targetH < minSize) {
      targetH = minSize;
      targetW = targetH * aspect;
    }

    if (handle.includes("w")) {
      left = anchorRight - targetW;
    } else {
      right = anchorLeft + targetW;
    }
    if (handle.includes("n")) {
      top = anchorBottom - targetH;
    } else {
      bottom = anchorTop + targetH;
    }
  }

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

/**
 * Converts a Screen Space rectangle back into PDF User Space, accounting for
 * zoom scaling and any page rotation.
 */
export function screenRectToPdfRect(
  rect: RectBounds,
  viewport: PdfViewportTransform
): RectBounds {
  const p1 = viewportPointToPdf({ x: rect.x, y: rect.y }, viewport);
  const p2 = viewportPointToPdf(
    { x: rect.x + rect.width, y: rect.y + rect.height },
    viewport
  );
  const minX = Math.min(p1.x, p2.x);
  const maxX = Math.max(p1.x, p2.x);
  const minY = Math.min(p1.y, p2.y);
  const maxY = Math.max(p1.y, p2.y);
  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

/**
 * Scales freehand points from `fromRect` to `toRect` proportionally.
 */
export function scalePointsToRect(
  points: PdfPoint[],
  fromRect: RectBounds,
  toRect: RectBounds
): PdfPoint[] {
  return points.map((p) => {
    const relX =
      fromRect.width > 0.001 ? (p.x - fromRect.x) / fromRect.width : 0.5;
    const relY =
      fromRect.height > 0.001 ? (p.y - fromRect.y) / fromRect.height : 0.5;
    return {
      x: toRect.x + relX * toRect.width,
      y: toRect.y + relY * toRect.height,
    };
  });
}
