"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { validatePdfFile, validatePdfMagicBytes } from "@/lib/validation/file-validation";
import { rotatePdfPages } from "@/lib/pdf/page-operations";
import { PDFDocument } from "pdf-lib";
import {
  RotateCw,
  RotateCcw,
  FileText,
  Download,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Shield,
  Undo2,
} from "lucide-react";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function RotatePdfTool() {
  const [file, setFile] = React.useState<File | null>(null);
  const [pdfData, setPdfData] = React.useState<Uint8Array | null>(null);
  const [totalPages, setTotalPages] = React.useState<number>(0);
  const [error, setError] = React.useState<string | null>(null);

  // Per-page rotation angle (0, 90, 180, 270)
  const [pageRotations, setPageRotations] = React.useState<Record<number, number>>({});
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [downloadUrl, setDownloadUrl] = React.useState<string | null>(null);
  const [downloadSize, setDownloadSize] = React.useState<number>(0);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    return () => {
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
      }
    };
  }, [downloadUrl]);

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
        setError("File is corrupted or not a valid PDF document.");
        return;
      }

      const data = new Uint8Array(buffer);
      const doc = await PDFDocument.load(data, { ignoreEncryption: true });
      const count = doc.getPageCount();

      const initialRotations: Record<number, number> = {};
      for (let i = 1; i <= count; i += 1) {
        initialRotations[i] = doc.getPage(i - 1).getRotation().angle;
      }

      setFile(selectedFile);
      setPdfData(data);
      setTotalPages(count);
      setPageRotations(initialRotations);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load PDF.";
      setError(msg);
    }
  };

  const rotatePage = (pageNum: number, deltaDegrees: number) => {
    setPageRotations((prev) => {
      const current = prev[pageNum] ?? 0;
      const next = ((current + deltaDegrees) % 360 + 360) % 360;
      return { ...prev, [pageNum]: next };
    });
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }
  };

  const rotateAll = (deltaDegrees: number) => {
    setPageRotations((prev) => {
      const next: Record<number, number> = {};
      for (let i = 1; i <= totalPages; i += 1) {
        const current = prev[i] ?? 0;
        next[i] = ((current + deltaDegrees) % 360 + 360) % 360;
      }
      return next;
    });
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }
  };

  const resetRotations = () => {
    const resetMap: Record<number, number> = {};
    for (let i = 1; i <= totalPages; i += 1) {
      resetMap[i] = 0;
    }
    setPageRotations(resetMap);
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }
  };

  const handleSave = async () => {
    if (!pdfData || !file) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Calculate rotation changes relative to original document
      const originalDoc = await PDFDocument.load(pdfData, { ignoreEncryption: true });
      const deltas: Record<number, number> = {};

      for (let i = 1; i <= totalPages; i += 1) {
        const origAngle = originalDoc.getPage(i - 1).getRotation().angle;
        const targetAngle = pageRotations[i] ?? 0;
        const delta = ((targetAngle - origAngle) % 360 + 360) % 360;
        if (delta !== 0) {
          deltas[i] = delta;
        }
      }

      const rotatedBytes = await rotatePdfPages(pdfData, deltas);
      const blob = new Blob([rotatedBytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      setDownloadUrl(url);
      setDownloadSize(rotatedBytes.byteLength);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to rotate document.";
      setError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetFile = () => {
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
    }
    setFile(null);
    setPdfData(null);
    setTotalPages(0);
    setError(null);
    setPageRotations({});
    setDownloadUrl(null);
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
            <RotateCw className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">
            Select a PDF to Rotate
          </h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
            Permanently rotate individual pages or the entire document.
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
            <span>Permanent orientation saved to PDF structure locally.</span>
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
              onClick={handleResetFile}
              className="gap-1.5"
            >
              <Undo2 className="h-4 w-4" />
              Choose Another File
            </Button>
          </div>

          {/* Bulk Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/30 p-3 rounded-xl border">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Rotate Entire Document:
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => rotateAll(-90)}
                className="gap-1.5 text-xs"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                All Left (-90°)
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => rotateAll(90)}
                className="gap-1.5 text-xs"
              >
                <RotateCw className="h-3.5 w-3.5" />
                All Right (+90°)
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetRotations}
                className="text-xs"
              >
                Reset All
              </Button>
            </div>
          </div>

          {/* Grid of Pages */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
              const angle = pageRotations[pageNum] ?? 0;
              return (
                <div
                  key={pageNum}
                  className="rounded-xl border bg-card p-3 shadow-2xs flex flex-col items-center justify-between gap-3 transition-all hover:border-blue-500/40"
                >
                  <div className="flex items-center justify-between w-full text-xs">
                    <span className="font-semibold text-foreground">Page {pageNum}</span>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground font-mono">
                      {angle}°
                    </span>
                  </div>

                  {/* Visual Page Representation */}
                  <div className="relative flex h-36 w-28 items-center justify-center rounded-lg border bg-muted/40 overflow-hidden shadow-2xs">
                    <div
                      style={{
                        transform: `rotate(${angle}deg)`,
                        transition: "transform 0.25s ease-in-out",
                      }}
                      className="flex flex-col items-center justify-center p-2 text-center"
                    >
                      <FileText className="h-10 w-10 text-blue-600/70 mb-1" />
                      <span className="text-[10px] font-bold text-foreground">
                        P. {pageNum}
                      </span>
                    </div>
                  </div>

                  {/* Individual Page Rotate Controls */}
                  <div className="flex items-center gap-1.5 w-full">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => rotatePage(pageNum, -90)}
                      className="flex-1 h-7 text-xs px-1"
                      title="Rotate 90 degrees counter-clockwise"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => rotatePage(pageNum, 90)}
                      className="flex-1 h-7 text-xs px-1"
                      title="Rotate 90 degrees clockwise"
                    >
                      <RotateCw className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Footer */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-green-600 shrink-0" />
              <span>Rotations are embedded directly into document metadata</span>
            </div>

            {downloadUrl ? (
              <a
                href={downloadUrl}
                download={`${file.name.replace(/\.pdf$/i, "")}_rotated.pdf`}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-700 transition-colors w-full sm:w-auto"
              >
                <Download className="h-4 w-4" />
                Download Rotated PDF ({formatBytes(downloadSize)})
              </a>
            ) : (
              <Button
                type="button"
                disabled={isProcessing}
                onClick={handleSave}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 w-full sm:w-auto"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Applying Rotations...
                  </>
                ) : (
                  <>
                    <RotateCw className="mr-2 h-4 w-4" />
                    Save & Download Rotated PDF
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
            <h4 className="font-semibold text-sm">PDF Rotated Successfully!</h4>
            <p className="text-xs mt-0.5 text-green-700 dark:text-green-400">
              New orientation applied permanently across selected pages.
            </p>
          </div>
        </div>
      )}

      {/* Error Notice */}
      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-destructive flex items-start gap-3">
          <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
          <div className="text-sm">
            <h4 className="font-semibold">Rotation error</h4>
            <p className="text-xs mt-0.5 opacity-90">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
