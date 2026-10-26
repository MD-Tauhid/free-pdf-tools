"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { validatePdfFile, validatePdfMagicBytes } from "@/lib/validation/file-validation";
import { compressPdfDocument, type CompressResult } from "@/lib/pdf/page-operations";
import { PDFDocument } from "pdf-lib";
import {
  Minimize2,
  FileText,
  Download,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Shield,
  RotateCcw,
  Zap,
} from "lucide-react";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CompressPdfTool() {
  const [file, setFile] = React.useState<File | null>(null);
  const [pdfData, setPdfData] = React.useState<Uint8Array | null>(null);
  const [totalPages, setTotalPages] = React.useState<number>(0);
  const [error, setError] = React.useState<string | null>(null);

  const [isProcessing, setIsProcessing] = React.useState(false);
  const [result, setResult] = React.useState<CompressResult | null>(null);
  const [downloadUrl, setDownloadUrl] = React.useState<string | null>(null);

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
    setResult(null);

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

  const handleCompress = async () => {
    if (!pdfData || !file) return;

    setIsProcessing(true);
    setError(null);

    try {
      const compressRes = await compressPdfDocument(pdfData);
      const blob = new Blob([compressRes.data as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      setResult(compressRes);
      setDownloadUrl(url);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Compression failed.";
      setError(msg);
    } finally {
      setIsProcessing(false);
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
    setResult(null);
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
            <Minimize2 className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">
            Select a PDF to Compress
          </h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
            Optimize PDF object streams and deduplicate resources locally in your browser.
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
            <span>Fast, secure compression entirely in memory. Zero file retention.</span>
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
                  {totalPages} {totalPages === 1 ? "page" : "pages"} • Initial size: {formatBytes(file.size)}
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

          {/* Details / Metrics */}
          {!result ? (
            <div className="rounded-xl bg-muted/30 p-6 border text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                <Zap className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-base font-semibold text-foreground">
                  Ready to optimize document
                </h4>
                <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                  Compresses cross-reference tables and streams using modern PDF object stream packaging without altering vector graphics or text legibility.
                </p>
              </div>

              <Button
                type="button"
                disabled={isProcessing}
                onClick={handleCompress}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-8"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Compressing...
                  </>
                ) : (
                  <>
                    <Minimize2 className="mr-2 h-4 w-4" />
                    Compress PDF Now
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Comparison Card */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl border bg-muted/20 p-4 text-center">
                  <span className="text-xs text-muted-foreground uppercase font-semibold">
                    Original Size
                  </span>
                  <p className="text-xl font-bold text-foreground mt-1">
                    {formatBytes(result.originalSize)}
                  </p>
                </div>

                <div className="rounded-xl border bg-green-500/10 border-green-500/30 p-4 text-center">
                  <span className="text-xs text-green-700 dark:text-green-300 uppercase font-semibold">
                    Compressed Size
                  </span>
                  <p className="text-xl font-bold text-green-700 dark:text-green-400 mt-1">
                    {formatBytes(result.compressedSize)}
                  </p>
                </div>

                <div className="rounded-xl border bg-blue-500/10 border-blue-500/30 p-4 text-center">
                  <span className="text-xs text-blue-700 dark:text-blue-300 uppercase font-semibold">
                    Reduction
                  </span>
                  <p className="text-xl font-bold text-blue-700 dark:text-blue-400 mt-1">
                    {result.savingsPercent > 0 ? `-${result.savingsPercent}%` : "Already Optimized"}
                  </p>
                </div>
              </div>

              {/* Action */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t pt-4">
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                  <span>Streams and structures compressed successfully</span>
                </div>

                {downloadUrl && (
                  <a
                    href={downloadUrl}
                    download={`${file.name.replace(/\.pdf$/i, "")}_compressed.pdf`}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-700 transition-colors w-full sm:w-auto"
                  >
                    <Download className="h-4 w-4" />
                    Download Compressed PDF
                  </a>
                )}
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
            <h4 className="font-semibold">Compression error</h4>
            <p className="text-xs mt-0.5 opacity-90">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
