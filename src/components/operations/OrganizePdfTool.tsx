"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { validatePdfFile, validatePdfMagicBytes } from "@/lib/validation/file-validation";
import { reorderAndDeletePages } from "@/lib/pdf/page-operations";
import { PDFDocument } from "pdf-lib";
import {
  UploadCloud,
  ArrowLeft,
  ArrowRight,
  Trash2,
  FileText,
  Download,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Shield,
  RotateCcw,
  Plus,
} from "lucide-react";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface PageItem {
  id: string;
  originalPageNumber: number;
}

export function OrganizePdfTool() {
  const [file, setFile] = React.useState<File | null>(null);
  const [pdfData, setPdfData] = React.useState<Uint8Array | null>(null);
  const [initialPages, setInitialPages] = React.useState<number>(0);
  const [pages, setPages] = React.useState<PageItem[]>([]);
  const [deletedPages, setDeletedPages] = React.useState<number[]>([]);
  const [error, setError] = React.useState<string | null>(null);

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
        setError("File is corrupted or not a valid PDF.");
        return;
      }

      const data = new Uint8Array(buffer);
      const doc = await PDFDocument.load(data, { ignoreEncryption: true });
      const count = doc.getPageCount();

      const items: PageItem[] = Array.from({ length: count }, (_, i) => ({
        id: `page-${i + 1}-${Math.random()}`,
        originalPageNumber: i + 1,
      }));

      setFile(selectedFile);
      setPdfData(data);
      setInitialPages(count);
      setPages(items);
      setDeletedPages([]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load PDF.";
      setError(msg);
    }
  };

  const movePage = (index: number, direction: "left" | "right") => {
    setPages((prev) => {
      const target = direction === "left" ? index - 1 : index + 1;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[target];
      copy[target] = temp;
      return copy;
    });
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }
  };

  const deletePage = (index: number) => {
    if (pages.length <= 1) {
      setError("Cannot delete all pages. The document must have at least one page.");
      return;
    }
    const removed = pages[index];
    setDeletedPages((prev) => [...prev, removed.originalPageNumber].sort((a, b) => a - b));
    setPages((prev) => prev.filter((_, i) => i !== index));
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }
  };

  const restorePage = (originalNum: number) => {
    setDeletedPages((prev) => prev.filter((n) => n !== originalNum));
    setPages((prev) => [
      ...prev,
      { id: `page-${originalNum}-${Math.random()}`, originalPageNumber: originalNum },
    ]);
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }
  };

  const resetToOriginal = () => {
    if (initialPages <= 0) return;
    const items: PageItem[] = Array.from({ length: initialPages }, (_, i) => ({
      id: `page-${i + 1}-${Math.random()}`,
      originalPageNumber: i + 1,
    }));
    setPages(items);
    setDeletedPages([]);
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }
  };

  const handleSave = async () => {
    if (!pdfData || !file) return;

    if (pages.length === 0) {
      setError("The document must contain at least one page.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const order = pages.map((p) => p.originalPageNumber);
      const reorderedBytes = await reorderAndDeletePages(pdfData, order);
      const blob = new Blob([reorderedBytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      setDownloadUrl(url);
      setDownloadSize(reorderedBytes.byteLength);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to organize PDF.";
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
    setInitialPages(0);
    setPages([]);
    setDeletedPages([]);
    setError(null);
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
            <UploadCloud className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">
            Select a PDF to Reorder & Delete Pages
          </h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
            Rearrange pages in any sequence or remove unwanted sheets.
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
            <span>Private client-side page organization. No server uploads.</span>
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
                  Original: {initialPages} pages • Current: {pages.length} pages
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetToOriginal}
                className="gap-1 text-xs"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Sequence
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetFile}
                className="text-xs text-muted-foreground"
              >
                Change File
              </Button>
            </div>
          </div>

          {/* Deleted pages banner if any */}
          {deletedPages.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/40 p-3 border text-xs">
              <span className="text-muted-foreground">
                Removed pages ({deletedPages.length}): {deletedPages.join(", ")}
              </span>
              <div className="flex flex-wrap gap-1">
                {deletedPages.map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => restorePage(num)}
                    className="inline-flex items-center gap-1 rounded bg-background px-2 py-0.5 text-xs font-medium border hover:border-blue-500 hover:text-blue-600"
                  >
                    <Plus className="h-3 w-3" />
                    Restore P.{num}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Page Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {pages.map((item, index) => (
              <div
                key={item.id}
                className="rounded-xl border bg-card p-3 shadow-2xs flex flex-col items-center justify-between gap-3 transition-all hover:border-blue-500/40"
              >
                <div className="flex items-center justify-between w-full text-xs">
                  <span className="font-semibold text-foreground">
                    Pos. {index + 1}
                  </span>
                  <span className="rounded bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 px-1.5 py-0.5 text-[10px] font-medium">
                    Page {item.originalPageNumber}
                  </span>
                </div>

                {/* Visual Page Representation */}
                <div className="flex h-36 w-28 items-center justify-center rounded-lg border bg-muted/40 shadow-2xs">
                  <div className="flex flex-col items-center justify-center p-2 text-center">
                    <FileText className="h-10 w-10 text-blue-600/70 mb-1" />
                    <span className="text-[11px] font-bold text-foreground">
                      Original P. {item.originalPageNumber}
                    </span>
                  </div>
                </div>

                {/* Move & Delete Controls */}
                <div className="flex items-center justify-between w-full gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={index === 0}
                    onClick={() => movePage(index, "left")}
                    aria-label={`Move page ${index + 1} left`}
                    className="h-7 w-7"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => deletePage(index)}
                    aria-label={`Delete page ${index + 1}`}
                    className="h-7 w-7 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={index === pages.length - 1}
                    onClick={() => movePage(index, "right")}
                    aria-label={`Move page ${index + 1} right`}
                    className="h-7 w-7"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Action Footer */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-green-600 shrink-0" />
              <span>Instant client-side assembly. No data retained.</span>
            </div>

            {downloadUrl ? (
              <a
                href={downloadUrl}
                download={`${file.name.replace(/\.pdf$/i, "")}_organized.pdf`}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-700 transition-colors w-full sm:w-auto"
              >
                <Download className="h-4 w-4" />
                Download Organized PDF ({formatBytes(downloadSize)})
              </a>
            ) : (
              <Button
                type="button"
                disabled={pages.length === 0 || isProcessing}
                onClick={handleSave}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 w-full sm:w-auto"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving Sequence...
                  </>
                ) : (
                  <>
                    Save & Download ({pages.length} Pages)
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
            <h4 className="font-semibold text-sm">PDF Reordered Successfully!</h4>
            <p className="text-xs mt-0.5 text-green-700 dark:text-green-400">
              New page sequence assembled with {pages.length} pages.
            </p>
          </div>
        </div>
      )}

      {/* Error Notice */}
      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-destructive flex items-start gap-3">
          <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
          <div className="text-sm">
            <h4 className="font-semibold">Unable to organize pages</h4>
            <p className="text-xs mt-0.5 opacity-90">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
