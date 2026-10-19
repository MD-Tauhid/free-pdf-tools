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
