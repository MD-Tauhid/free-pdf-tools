"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { validatePdfFile, validatePdfMagicBytes } from "@/lib/validation/file-validation";
import { mergePdfDocuments } from "@/lib/pdf/page-operations";
import { PDFDocument } from "pdf-lib";
import {
  UploadCloud,
  FileText,
  Trash2,
  ArrowUp,
  ArrowDown,
  Plus,
  Download,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Shield,
  Layers,
} from "lucide-react";

interface UploadedFileItem {
  id: string;
  file: File;
  data: Uint8Array;
  pageCount: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MergePdfTool() {
  const [items, setItems] = React.useState<UploadedFileItem[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [mergedBlobUrl, setMergedBlobUrl] = React.useState<string | null>(null);
  const [mergedStats, setMergedStats] = React.useState<{ pageCount: number; size: number } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Clean up Object URL on unmount
  React.useEffect(() => {
    return () => {
      if (mergedBlobUrl) {
        URL.revokeObjectURL(mergedBlobUrl);
      }
    };
  }, [mergedBlobUrl]);

  const handleFilesAdded = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setError(null);

    const newItems: UploadedFileItem[] = [];

    for (let i = 0; i < fileList.length; i += 1) {
      const file = fileList[i];
      const val = validatePdfFile(file);
      if (!val.valid) {
        setError(val.error?.message || `File ${file.name} is invalid.`);
        return;
      }

      try {
        const buffer = await file.arrayBuffer();
        const magicVal = validatePdfMagicBytes(buffer);
        if (!magicVal.valid) {
          setError(`File "${file.name}" is corrupted or not a valid PDF.`);
          return;
        }

        const data = new Uint8Array(buffer);
        const doc = await PDFDocument.load(data, { ignoreEncryption: true });
        newItems.push({
          id: `${file.name}-${Date.now()}-${Math.random()}`,
          file,
          data,
          pageCount: doc.getPageCount(),
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to parse PDF document.";
        setError(`Failed to read "${file.name}": ${msg}`);
        return;
      }
    }

    setItems((prev) => [...prev, ...newItems]);
    // Reset previous merge result if adding more files
    if (mergedBlobUrl) {
      URL.revokeObjectURL(mergedBlobUrl);
      setMergedBlobUrl(null);
      setMergedStats(null);
    }
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    setItems((prev) => {
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleMerge = async () => {
    if (items.length < 2) {
      setError("Please add at least 2 PDF files to merge.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const mergedBytes = await mergePdfDocuments(
        items.map((it) => ({ data: it.data, name: it.file.name }))
      );

      const totalPages = items.reduce((acc, it) => acc + it.pageCount, 0);
      const blob = new Blob([mergedBytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      setMergedBlobUrl(url);
      setMergedStats({ pageCount: totalPages, size: mergedBytes.byteLength });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Merge failed.";
      setError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    if (mergedBlobUrl) {
      URL.revokeObjectURL(mergedBlobUrl);
    }
    setItems([]);
    setError(null);
    setMergedBlobUrl(null);
    setMergedStats(null);
  };

  return (
    <div className="w-full space-y-6">
      {/* Upload Dropzone */}
      {items.length === 0 ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFilesAdded(e.dataTransfer.files);
          }}
          className="rounded-2xl border-2 border-dashed border-border bg-card p-10 text-center shadow-sm transition-colors hover:border-blue-500/50"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 mb-4">
            <UploadCloud className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">
            Select Multiple PDFs to Merge
          </h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
            Drag and drop two or more PDF files here, or click to browse.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              multiple
              className="sr-only"
              onChange={(e) => handleFilesAdded(e.target.files)}
            />
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              Select PDF Files
            </Button>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-4 w-4 text-green-600" />
            <span>100% private in-browser merging. Your files never leave your device.</span>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Layers className="h-5 w-5 text-blue-600" />
                Files to Merge ({items.length})
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Total pages: {items.reduce((sum, item) => sum + item.pageCount, 0)} • Arrange files in the desired order
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                multiple
                className="sr-only"
                onChange={(e) => handleFilesAdded(e.target.files)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Add Files
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
            </div>
          </div>

          {/* List of Files */}
          <div className="space-y-2.5">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl border bg-muted/30 p-3.5 transition-colors hover:bg-muted/60"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700 text-xs font-bold dark:bg-blue-950 dark:text-blue-300">
                    {index + 1}
                  </span>
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {item.file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.pageCount} {item.pageCount === 1 ? "page" : "pages"} • {formatBytes(item.file.size)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={index === 0}
                    onClick={() => moveItem(index, "up")}
                    aria-label={`Move ${item.file.name} up`}
                    className="h-8 w-8"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={index === items.length - 1}
                    onClick={() => moveItem(index, "down")}
                    aria-label={`Move ${item.file.name} down`}
                    className="h-8 w-8"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(item.id)}
                    aria-label={`Remove ${item.file.name}`}
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Merge Action / Result Bar */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-green-600 shrink-0" />
              <span>Processed locally in your browser memory</span>
            </div>

            {mergedBlobUrl && mergedStats ? (
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <a
                  href={mergedBlobUrl}
                  download="merged_document.pdf"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-700 transition-colors w-full sm:w-auto"
                >
                  <Download className="h-4 w-4" />
                  Download Merged PDF ({formatBytes(mergedStats.size)})
                </a>
              </div>
            ) : (
              <Button
                type="button"
                disabled={items.length < 2 || isProcessing}
                onClick={handleMerge}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 w-full sm:w-auto"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Merging Documents...
                  </>
                ) : (
                  <>Merge {items.length} Files</>
                )}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Success banner */}
      {mergedBlobUrl && mergedStats && (
        <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-green-800 dark:text-green-300 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0 text-green-600 dark:text-green-400" />
          <div>
            <h4 className="font-semibold text-sm">PDFs Merged Successfully!</h4>
            <p className="text-xs mt-0.5 text-green-700 dark:text-green-400">
              Combined {items.length} documents into {mergedStats.pageCount} pages ({formatBytes(mergedStats.size)}).
            </p>
          </div>
        </div>
      )}

      {/* Error Notice */}
      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-destructive flex items-start gap-3">
          <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
          <div className="text-sm">
            <h4 className="font-semibold">Unable to process files</h4>
            <p className="text-xs mt-0.5 opacity-90">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
