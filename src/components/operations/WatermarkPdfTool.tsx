"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { validatePdfFile, validatePdfMagicBytes } from "@/lib/validation/file-validation";
import { addWatermarkToPdf } from "@/lib/pdf/page-operations";
import { PDFDocument } from "pdf-lib";
import {
  Stamp,
  FileText,
  Download,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Shield,
  RotateCcw,
  Move,
} from "lucide-react";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const PRESET_TEXTS = ["CONFIDENTIAL", "DRAFT", "SAMPLE", "COPY", "INTERNAL ONLY"];
const PRESET_COLORS = [
  { label: "Red", value: "#ef4444" },
  { label: "Slate", value: "#64748b" },
  { label: "Blue", value: "#2563eb" },
  { label: "Amber", value: "#d97706" },
];
const POSITION_PRESETS = [
  { label: "Center", x: 50, y: 50 },
  { label: "Top Left", x: 25, y: 20 },
  { label: "Top Center", x: 50, y: 15 },
  { label: "Top Right", x: 75, y: 20 },
  { label: "Bottom Left", x: 25, y: 80 },
  { label: "Bottom Center", x: 50, y: 85 },
  { label: "Bottom Right", x: 75, y: 80 },
] as const;
const MAX_WATERMARK_IMAGE_BYTES = 10 * 1024 * 1024;

export function WatermarkPdfTool() {
  const [file, setFile] = React.useState<File | null>(null);
  const [pdfData, setPdfData] = React.useState<Uint8Array | null>(null);
  const [totalPages, setTotalPages] = React.useState<number>(0);
  const [error, setError] = React.useState<string | null>(null);

  // Watermark parameters
  const [watermarkText, setWatermarkText] = React.useState<string>("CONFIDENTIAL");
  const [watermarkImage, setWatermarkImage] = React.useState<string | null>(null);
  const [watermarkImageName, setWatermarkImageName] = React.useState<string | null>(null);
  const [fontSize, setFontSize] = React.useState<number>(44);
  const [fontColor, setFontColor] = React.useState<string>("#ef4444");
  const [opacity, setOpacity] = React.useState<number>(0.3);
  const [rotationDegrees, setRotationDegrees] = React.useState<number>(45);
  const [pageFilter, setPageFilter] = React.useState<"all" | "odd" | "even">("all");
  const [xPercent, setXPercent] = React.useState<number>(50);
  const [yPercent, setYPercent] = React.useState<number>(50);
  const [isDragging, setIsDragging] = React.useState<boolean>(false);

  const [isProcessing, setIsProcessing] = React.useState(false);
  const [downloadUrl, setDownloadUrl] = React.useState<string | null>(null);
  const [downloadSize, setDownloadSize] = React.useState<number>(0);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const watermarkImageInputRef = React.useRef<HTMLInputElement>(null);
  const previewContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    return () => {
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
      }
    };
  }, [downloadUrl]);

  const handleWatermarkPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleWatermarkPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const container = previewContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const rawX = ((e.clientX - rect.left) / rect.width) * 100;
    const rawY = ((e.clientY - rect.top) / rect.height) * 100;

    const clampedX = Math.round(Math.min(100, Math.max(0, rawX)));
    const clampedY = Math.round(Math.min(100, Math.max(0, rawY)));

    setXPercent(clampedX);
    setYPercent(clampedY);
    if (downloadUrl) setDownloadUrl(null);
  };

  const handleWatermarkPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore if already released
      }
      setIsDragging(false);
    }
  };

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = previewContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const rawX = ((e.clientX - rect.left) / rect.width) * 100;
    const rawY = ((e.clientY - rect.top) / rect.height) * 100;

    const clampedX = Math.round(Math.min(100, Math.max(0, rawX)));
    const clampedY = Math.round(Math.min(100, Math.max(0, rawY)));

    setXPercent(clampedX);
    setYPercent(clampedY);
    if (downloadUrl) setDownloadUrl(null);
  };

  const handleResetPosition = () => {
    setXPercent(50);
    setYPercent(50);
    if (downloadUrl) setDownloadUrl(null);
  };

  const handleFileChange = async (selectedFile: File | null) => {
    if (!selectedFile) return;
    setError(null);
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }

    const val = validatePdfFile(selectedFile);
    if (!val.valid) {
      setError(val.error?.message || "Invalid PDF file.");
      return;
    }

    try {
      const buffer = await selectedFile.arrayBuffer();
      const magicVal = validatePdfMagicBytes(buffer);
      if (!magicVal.valid) {
        setError("File header is corrupted or not a valid PDF.");
        return;
      }

      const data = new Uint8Array(buffer);
      const doc = await PDFDocument.load(data, { ignoreEncryption: true });
      const count = doc.getPageCount();

      setFile(selectedFile);
      setPdfData(data);
      setTotalPages(count);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load PDF.";
      setError(msg);
    }
  };

  const handleApply = async () => {
    if (!pdfData || !file) return;

    if (!watermarkImage && !watermarkText.trim()) {
      setError("Please enter watermark text.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const watermarkedBytes = await addWatermarkToPdf(pdfData, {
        text: watermarkImage ? undefined : watermarkText.trim(),
        imageDataUrl: watermarkImage ?? undefined,
        fontSize,
        fontColor,
        opacity,
        rotationDegrees,
        pageFilter,
        xPercent,
        yPercent,
      });

      const blob = new Blob([watermarkedBytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      setDownloadUrl(url);
      setDownloadSize(watermarkedBytes.byteLength);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to watermark document.";
      setError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWatermarkImageChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const input = event.currentTarget;
    const imageFile = input.files?.[0];
    input.value = "";
    if (!imageFile) return;

    const extension = imageFile.name.toLowerCase().split(".").pop();
    const mimeType =
      imageFile.type ||
      (extension === "png"
        ? "image/png"
        : extension === "jpg" || extension === "jpeg"
          ? "image/jpeg"
          : "");
    if (mimeType !== "image/png" && mimeType !== "image/jpeg") {
      setError("Choose a PNG or JPEG image for the watermark.");
      return;
    }
    if (imageFile.size === 0 || imageFile.size > MAX_WATERMARK_IMAGE_BYTES) {
      setError("Watermark images must be larger than 0 bytes and no more than 10 MB.");
      return;
    }

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") resolve(reader.result);
          else reject(new Error("The selected image could not be read."));
        };
        reader.onerror = () =>
          reject(reader.error ?? new Error("The selected image could not be read."));
        reader.readAsDataURL(imageFile);
      });
      const base64Start = dataUrl.indexOf(",") + 1;
      const header = atob(dataUrl.slice(base64Start, base64Start + 12));
      const isPng =
        header.length >= 8 &&
        header.charCodeAt(0) === 0x89 &&
        header.slice(1, 4) === "PNG" &&
        header.charCodeAt(4) === 0x0d &&
        header.charCodeAt(5) === 0x0a &&
        header.charCodeAt(6) === 0x1a &&
        header.charCodeAt(7) === 0x0a;
      const isJpeg =
        header.length >= 3 &&
        header.charCodeAt(0) === 0xff &&
        header.charCodeAt(1) === 0xd8 &&
        header.charCodeAt(2) === 0xff;
      const actualMimeType = isPng
        ? "image/png"
        : isJpeg
          ? "image/jpeg"
          : null;
      if (!actualMimeType || (imageFile.type && imageFile.type !== actualMimeType)) {
        throw new Error("The selected file is not a valid PNG or JPEG image.");
      }
      setWatermarkImage(
        dataUrl.replace(/^data:[^;,]+;/, `data:${actualMimeType};`)
      );
      setWatermarkImageName(imageFile.name);
      setError(null);
      setDownloadUrl(null);
    } catch (error: unknown) {
      console.error("Failed to read watermark image:", error);
      setError("The selected image could not be read. Choose another PNG or JPEG image.");
    }
  };

  const handleReset = () => {
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
    }
    setFile(null);
    setPdfData(null);
    setTotalPages(0);
    setError(null);
    setWatermarkImage(null);
    setWatermarkImageName(null);
    setDownloadUrl(null);
    setXPercent(50);
    setYPercent(50);
    setIsDragging(false);
  };

  return (
    <div className="w-full space-y-6">
      {!file ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files.length > 0) {
              handleFileChange(e.dataTransfer.files[0]);
            }
          }}
          className="rounded-2xl border-2 border-dashed border-border bg-card p-10 text-center shadow-sm transition-colors hover:border-blue-500/50"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 mb-4">
            <Stamp className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">
            Select a PDF to Add Watermark
          </h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
            Apply customizable text or stamp overlays with configurable opacity and angle.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="sr-only"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileChange(e.target.files[0]);
                }
              }}
            />
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              Select PDF File
            </Button>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-4 w-4 text-green-600" />
            <span>Watermarks are rendered directly in browser memory without uploads.</span>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground truncate max-w-xs sm:max-w-md">
                  {file.name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {totalPages} {totalPages === 1 ? "page" : "pages"} • {formatBytes(file.size)}
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="gap-1.5"
            >
              <RotateCcw className="h-4 w-4" />
              Choose Another File
            </Button>
          </div>

          {/* Configuration Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Controls */}
            <div className="lg:col-span-2 space-y-4">
              <div>
                <label className="text-sm font-semibold text-foreground block mb-1">
                  Watermark Text
                </label>
                <input
                  type="text"
                  value={watermarkText}
                  disabled={Boolean(watermarkImage)}
                  onChange={(e) => {
                    setWatermarkText(e.target.value);
                    if (downloadUrl) setDownloadUrl(null);
                  }}
                  className="w-full rounded-lg border bg-background px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. CONFIDENTIAL"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {PRESET_TEXTS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setWatermarkText(preset);
                        if (downloadUrl) setDownloadUrl(null);
                      }}
                      disabled={Boolean(watermarkImage)}
                      className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/80"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 rounded-lg border bg-background p-3">
                <label className="text-sm font-semibold text-foreground block">
                  Image Watermark (Optional)
                </label>
                <input
                  ref={watermarkImageInputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="sr-only"
                  onChange={handleWatermarkImageChange}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => watermarkImageInputRef.current?.click()}
                    disabled={isProcessing}
                  >
                    {watermarkImage ? "Choose Another Image" : "Choose PNG or JPEG"}
                  </Button>
                  {watermarkImageName && (
                    <>
                      <span className="max-w-56 truncate text-xs text-muted-foreground">
                        {watermarkImageName}
                      </span>
                      <button
                        type="button"
                        className="text-xs font-medium text-destructive hover:underline"
                        onClick={() => {
                          setWatermarkImage(null);
                          setWatermarkImageName(null);
                          setDownloadUrl(null);
                        }}
                      >
                        Remove image
                      </button>
                    </>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Choosing an image uses it instead of the text watermark. Maximum size: 10 MB.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {!watermarkImage && (
                  <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Font Size ({fontSize} pt)
                  </label>
                  <input
                    type="range"
                    min="20"
                    max="80"
                    value={fontSize}
                    onChange={(e) => {
                      setFontSize(Number(e.target.value));
                      if (downloadUrl) setDownloadUrl(null);
                    }}
                    className="w-full"
                  />
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Opacity ({Math.round(opacity * 100)}%)
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="0.8"
                    step="0.05"
                    value={opacity}
                    onChange={(e) => {
                      setOpacity(Number(e.target.value));
                      if (downloadUrl) setDownloadUrl(null);
                    }}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {!watermarkImage && (
                  <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">
                    Color
                  </label>
                  <div className="flex items-center gap-2">
                    {PRESET_COLORS.map((col) => (
                      <button
                        key={col.value}
                        type="button"
                        onClick={() => {
                          setFontColor(col.value);
                          if (downloadUrl) setDownloadUrl(null);
                        }}
                        style={{ backgroundColor: col.value }}
                        className={`h-7 w-7 rounded-full transition-transform ${
                          fontColor === col.value ? "ring-2 ring-offset-2 ring-blue-500 scale-110" : "opacity-80 hover:opacity-100"
                        }`}
                        title={col.label}
                        aria-label={`${col.label} watermark color`}
                      />
                    ))}
                    <input
                      type="color"
                      value={fontColor}
                      aria-label="Custom watermark color"
                      onChange={(event) => {
                        setFontColor(event.target.value);
                        if (downloadUrl) setDownloadUrl(null);
                      }}
                      className="h-8 w-8 cursor-pointer rounded border bg-background p-0.5"
                    />
                  </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">
                    Angle
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[0, 45, 90, -45].map((deg) => (
                      <button
                        key={deg}
                        type="button"
                        onClick={() => {
                          setRotationDegrees(deg);
                          if (downloadUrl) setDownloadUrl(null);
                        }}
                        className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                          rotationDegrees === deg
                            ? "bg-blue-600 text-white font-bold"
                            : "bg-background text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {deg}°
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Target Pages
                </label>
                <div className="flex items-center gap-2">
                  {(["all", "odd", "even"] as const).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => {
                        setPageFilter(filter);
                        if (downloadUrl) setDownloadUrl(null);
                      }}
                      className={`px-3 py-1.5 text-xs rounded-lg border capitalize transition-colors ${
                        pageFilter === filter
                          ? "bg-blue-600 text-white font-bold shadow-2xs"
                          : "bg-background text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {filter === "all" ? "All Pages" : `${filter} Pages`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Position & Alignment Controls */}
              <div className="space-y-2.5 rounded-lg border bg-background p-3.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Move className="h-3.5 w-3.5 text-blue-500" />
                    Position & Alignment
                  </label>
                  <button
                    type="button"
                    onClick={handleResetPosition}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {POSITION_PRESETS.map((preset) => {
                    const isActive = xPercent === preset.x && yPercent === preset.y;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setXPercent(preset.x);
                          setYPercent(preset.y);
                          if (downloadUrl) setDownloadUrl(null);
                        }}
                        className={`rounded px-2.5 py-1 text-xs transition-colors ${
                          isActive
                            ? "bg-blue-600 text-white font-semibold shadow-2xs"
                            : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-[11px] text-muted-foreground font-medium block mb-1">
                      Horizontal (X: {xPercent}%)
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={xPercent}
                      aria-label="Watermark horizontal position percentage"
                      onChange={(e) => {
                        setXPercent(Number(e.target.value));
                        if (downloadUrl) setDownloadUrl(null);
                      }}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground font-medium block mb-1">
                      Vertical (Y: {yPercent}%)
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={yPercent}
                      aria-label="Watermark vertical position percentage"
                      onChange={(e) => {
                        setYPercent(Number(e.target.value));
                        if (downloadUrl) setDownloadUrl(null);
                      }}
                      className="w-full"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground">
                  💡 Tip: Drag the watermark directly inside the live preview or click anywhere on the page to reposition it.
                </p>
              </div>
            </div>

            {/* Live Visual Preview */}
            <div className="flex flex-col items-center justify-center p-4 rounded-xl border bg-muted/20">
              <div className="flex items-center justify-between w-full mb-3 px-1">
                <span className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
                  <Move className="h-3.5 w-3.5 text-blue-500" />
                  Live Preview
                </span>
                <span className="text-[11px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                  X: {xPercent}% · Y: {yPercent}%
                </span>
              </div>

              <div
                ref={previewContainerRef}
                onClick={handleContainerClick}
                className="relative flex h-64 w-44 rounded-lg border bg-background shadow-xs overflow-hidden select-none cursor-crosshair"
                title="Click or drag to position watermark"
              >
                {/* Guidelines: subtle center crosshairs */}
                <div
                  className={`absolute top-0 bottom-0 left-1/2 w-px border-l border-dashed pointer-events-none transition-colors ${
                    Math.abs(xPercent - 50) <= 2 ? "border-blue-500/70" : "border-border/30"
                  }`}
                />
                <div
                  className={`absolute left-0 right-0 top-1/2 h-px border-t border-dashed pointer-events-none transition-colors ${
                    Math.abs(yPercent - 50) <= 2 ? "border-blue-500/70" : "border-border/30"
                  }`}
                />

                {/* Simulated page content lines */}
                <div className="absolute inset-x-3 top-4 space-y-1.5 opacity-20 pointer-events-none">
                  <div className="h-1.5 w-full bg-foreground rounded" />
                  <div className="h-1.5 w-3/4 bg-foreground rounded" />
                  <div className="h-1.5 w-5/6 bg-foreground rounded" />
                  <div className="h-1.5 w-2/3 bg-foreground rounded" />
                  <div className="h-1.5 w-4/5 bg-foreground rounded mt-4" />
                  <div className="h-1.5 w-1/2 bg-foreground rounded" />
                </div>

                {/* Draggable Watermark Item */}
                <div
                  onPointerDown={handleWatermarkPointerDown}
                  onPointerMove={handleWatermarkPointerMove}
                  onPointerUp={handleWatermarkPointerUp}
                  onPointerCancel={handleWatermarkPointerUp}
                  style={{
                    left: `${xPercent}%`,
                    top: `${yPercent}%`,
                    transform: `translate(-50%, -50%) rotate(${rotationDegrees}deg)`,
                    touchAction: "none",
                  }}
                  className={`group absolute select-none transition-shadow ${
                    isDragging
                      ? "cursor-grabbing ring-2 ring-blue-500 ring-offset-2 ring-offset-background z-20"
                      : "cursor-grab hover:ring-1 hover:ring-blue-400 hover:ring-offset-1 z-10"
                  } rounded p-1`}
                  title="Drag to reposition watermark"
                >
                  {/* Floating drag handle badge */}
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded bg-blue-600 px-1.5 py-0.5 text-[9px] font-medium text-white shadow opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                    <Move className="h-2.5 w-2.5" />
                    Drag
                  </div>

                  {watermarkImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={watermarkImage}
                      alt="Image watermark preview"
                      style={{
                        opacity,
                      }}
                      className="max-h-24 max-w-24 object-contain select-none pointer-events-none"
                      draggable={false}
                    />
                  ) : (
                    <div
                      style={{
                        color: fontColor,
                        opacity,
                        fontSize: `${Math.round(fontSize * 0.42)}px`,
                      }}
                      className="font-bold tracking-wider select-none text-center pointer-events-none whitespace-nowrap"
                    >
                      {watermarkText || "WATERMARK"}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between w-full mt-2.5 text-[11px] text-muted-foreground px-1">
                <span>
                  {pageFilter === "all" ? `All ${totalPages} pages` : `${pageFilter} pages`}
                </span>
                <button
                  type="button"
                  onClick={handleResetPosition}
                  className="hover:text-foreground text-blue-600 dark:text-blue-400 font-medium hover:underline"
                >
                  Reset to Center
                </button>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-green-600 shrink-0" />
              <span>
                {watermarkImage
                  ? "Image embedded directly in your PDF."
                  : "Text embedded as vector typography."}{" "}
                Fast in-browser execution.
              </span>
            </div>

            {downloadUrl ? (
              <a
                href={downloadUrl}
                download={`${file.name.replace(/\.pdf$/i, "")}_watermarked.pdf`}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-700 transition-colors w-full sm:w-auto"
              >
                <Download className="h-4 w-4" />
                Download Watermarked PDF ({formatBytes(downloadSize)})
              </a>
            ) : (
              <Button
                type="button"
                disabled={isProcessing}
                onClick={handleApply}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 w-full sm:w-auto"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Applying Watermark...
                  </>
                ) : (
                  <>
                    <Stamp className="mr-2 h-4 w-4" />
                    Apply Watermark to PDF
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Success banner */}
      {downloadUrl && (
        <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-green-800 dark:text-green-300 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0 text-green-600 dark:text-green-400" />
          <div>
            <h4 className="font-semibold text-sm">Watermark Added Successfully!</h4>
            <p className="text-xs mt-0.5 text-green-700 dark:text-green-400">
              Ready for immediate download.
            </p>
          </div>
        </div>
      )}

      {/* Error Notice */}
      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-destructive flex items-start gap-3">
          <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
          <div className="text-sm">
            <h4 className="font-semibold">Watermark error</h4>
            <p className="text-xs mt-0.5 opacity-90">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
