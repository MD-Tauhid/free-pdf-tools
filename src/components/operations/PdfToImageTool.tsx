"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { validatePdfFile, validatePdfMagicBytes } from "@/lib/validation/file-validation";
import { renderPdfToImages, type RenderedPageImage } from "@/lib/pdf/pdf-to-image";
import { PDFDocument } from "pdf-lib";
import {
  FileImage,
  FileText,
  Download,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Shield,
  RotateCcw,
} from "lucide-react";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PdfToImageTool() {
  const [file, setFile] = React.useState<File | null>(null);
  const [rawBuffer, setRawBuffer] = React.useState<ArrayBuffer | null>(null);
  const [totalPages, setTotalPages] = React.useState<number>(0);
  const [error, setError] = React.useState<string | null>(null);

  // Conversion options
  const [imageFormat, setImageFormat] = React.useState<"image/png" | "image/jpeg">("image/png");
  const [scale, setScale] = React.useState<number>(1.5);

  const [isProcessing, setIsProcessing] = React.useState(false);
  const [progress, setProgress] = React.useState<{ current: number; total: number } | null>(null);
  const [renderedImages, setRenderedImages] = React.useState<RenderedPageImage[]>([]);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = async (selectedFile: File | null) => {
    if (!selectedFile) return;
    setError(null);
    setRenderedImages([]);

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
      setRawBuffer(buffer);
      setTotalPages(count);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load PDF.";
      setError(msg);
    }
  };

  const handleConvert = async () => {
    if (!rawBuffer || !file) return;

    setIsProcessing(true);
    setError(null);
    setProgress({ current: 0, total: totalPages });

    try {
      const images = await renderPdfToImages(rawBuffer, {
        format: imageFormat,
        scale,
        onProgress: (current, total) => setProgress({ current, total }),
      });
      setRenderedImages(images);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Image rendering failed.";
      setError(msg);
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  const handleReset = () => {
    setFile(null);
    setRawBuffer(null);
    setTotalPages(0);
    setError(null);
    setRenderedImages([]);
    setProgress(null);
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
            <FileImage className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">
            Select a PDF to Convert to Images
          </h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
            Extract and render high-resolution PNG or JPEG pages directly in your browser.
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
            <span>Hardware-accelerated HTML5 canvas rendering in local memory.</span>
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

          {/* Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-muted/20 p-4 rounded-xl border">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider block">
                Image Format
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setImageFormat("image/png")}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-all ${
                    imageFormat === "image/png"
                      ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                      : "bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  PNG (Lossless, Transparent)
                </button>
                <button
                  type="button"
                  onClick={() => setImageFormat("image/jpeg")}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-all ${
                    imageFormat === "image/jpeg"
                      ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                      : "bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  JPEG (Compact File Size)
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider block">
                Quality / Resolution
              </label>
              <div className="flex gap-2">
                {[
                  { label: "Standard (1x)", val: 1.0 },
                  { label: "High (1.5x)", val: 1.5 },
                  { label: "Ultra (2.0x)", val: 2.0 },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setScale(opt.val)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                      scale === opt.val
                        ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                        : "bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Convert Trigger */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-green-600 shrink-0" />
              <span>Converts 100% in your browser. No files uploaded.</span>
            </div>

            <Button
              type="button"
              disabled={isProcessing}
              onClick={handleConvert}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 w-full sm:w-auto"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rendering {progress ? `${progress.current}/${progress.total}` : "Pages"}...
                </>
              ) : (
                <>
                  <FileImage className="mr-2 h-4 w-4" />
                  Render All {totalPages} Pages to Images
                </>
              )}
            </Button>
          </div>

          {/* Rendered Images Gallery */}
          {renderedImages.length > 0 && (
            <div className="border-t pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Rendered Images ({renderedImages.length} Pages)
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {renderedImages.map((img) => {
                  const ext = imageFormat === "image/png" ? "png" : "jpg";
                  const filename = `${file.name.replace(/\.pdf$/i, "")}_page_${img.pageNumber}.${ext}`;
                  return (
                    <div
                      key={img.pageNumber}
                      className="rounded-xl border bg-card p-3 shadow-2xs flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground">Page {img.pageNumber}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {img.width} × {img.height} px
                        </span>
                      </div>

                      <div className="relative h-48 w-full rounded-lg border bg-muted/20 flex items-center justify-center overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.dataUrl}
                          alt={`Page ${img.pageNumber}`}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>

                      <a
                        href={img.dataUrl}
                        download={filename}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700 transition-colors w-full"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download {ext.toUpperCase()}
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Notice */}
      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-destructive flex items-start gap-3">
          <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
          <div className="text-sm">
            <h4 className="font-semibold">Unable to convert PDF</h4>
            <p className="text-xs mt-0.5 opacity-90">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
