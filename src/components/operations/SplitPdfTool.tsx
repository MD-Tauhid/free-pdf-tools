"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { validatePdfFile, validatePdfMagicBytes } from "@/lib/validation/file-validation";
import { parsePageRange, splitPdfDocument, type SplitResult } from "@/lib/pdf/page-operations";
import { PDFDocument } from "pdf-lib";
import {
  UploadCloud,
  FileText,
  Split,
  Download,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Shield,
} from "lucide-react";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SplitPdfTool() {
  const [file, setFile] = React.useState<File | null>(null);
  const [pdfData, setPdfData] = React.useState<Uint8Array | null>(null);
  const [totalPages, setTotalPages] = React.useState<number>(0);
  const [error, setError] = React.useState<string | null>(null);

  // Range and mode
  const [rangeInput, setRangeInput] = React.useState<string>("1");
  const [selectedPages, setSelectedPages] = React.useState<number[]>([1]);
  const [splitMode, setSplitMode] = React.useState<"single" | "individual">("single");

  // Results
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [results, setResults] = React.useState<Array<{ filename: string; url: string; size: number; pageCount: number }>>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Cleanup object URLs on unmount or reset
  React.useEffect(() => {
    return () => {
      results.forEach((r) => URL.revokeObjectURL(r.url));
    };
  }, [results]);

  const handleFileChange = async (selectedFile: File | null) => {
    if (!selectedFile) return;
    setError(null);
    results.forEach((r) => URL.revokeObjectURL(r.url));
    setResults([]);

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
      const pages = doc.getPageCount();

      setFile(selectedFile);
      setPdfData(data);
      setTotalPages(pages);

      // Default range: if 1 page, "1", if more, "1-2" or "1"
      const defaultRange = pages > 1 ? `1-${Math.min(pages, 3)}` : "1";
      setRangeInput(defaultRange);
      setSelectedPages(parsePageRange(defaultRange, pages));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to parse PDF.";
      setError(msg);
    }
  };

  const handleRangeTextChange = (text: string) => {
    setRangeInput(text);
    if (totalPages > 0) {
      const parsed = parsePageRange(text, totalPages);
      setSelectedPages(parsed);
    }
  };

  const togglePageSelection = (pageNum: number) => {
    setSelectedPages((prev) => {
      const next = prev.includes(pageNum)
        ? prev.filter((p) => p !== pageNum)
        : [...prev, pageNum].sort((a, b) => a - b);

      // Reconstruct range string
      setRangeInput(next.join(", "));
      return next;
    });
  };

  const selectAllPages = () => {
    if (totalPages <= 0) return;
    const all = Array.from({ length: totalPages }, (_, i) => i + 1);
    setSelectedPages(all);
    setRangeInput(`1-${totalPages}`);
  };

  const handleSplit = async () => {
    if (!pdfData || !file) return;

    if (selectedPages.length === 0) {
      setError("Please select at least one page to extract.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const splitOutputs: SplitResult[] = await splitPdfDocument(
        pdfData,
        selectedPages,
        splitMode,
        file.name
      );

      const newResults = splitOutputs.map((item) => {
        const blob = new Blob([item.data as BlobPart], { type: "application/pdf" });
        return {
          filename: item.filename,
          url: URL.createObjectURL(blob),
          size: item.data.byteLength,
          pageCount: item.pageCount,
        };
      });

      setResults(newResults);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Splitting failed.";
      setError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    results.forEach((r) => URL.revokeObjectURL(r.url));
    setFile(null);
    setPdfData(null);
    setTotalPages(0);
    setError(null);
    setResults([]);
    setSelectedPages([1]);
    setRangeInput("1");
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
            Select a PDF to Split
          </h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
            Extract individual pages or custom ranges (e.g. 1-3, 5, 8-10).
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
            <span>Local page extraction in browser memory. Unlimited and secure.</span>
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

          {/* Mode & Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Range Input */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-foreground block">
                Page Range or Numbers
              </label>
              <input
                type="text"
                value={rangeInput}
                onChange={(e) => handleRangeTextChange(e.target.value)}
                placeholder="e.g. 1-3, 5, 8"
                className="w-full rounded-lg border bg-background px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-muted-foreground">
                Enter comma-separated pages or ranges (e.g. <span className="font-mono">1-3, 5</span>). Available: 1 to {totalPages}.
              </p>

              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={selectAllPages}
                  className="text-xs h-7"
                >
                  Select All ({totalPages})
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedPages([]);
                    setRangeInput("");
                  }}
                  className="text-xs h-7"
                >
                  Clear
                </Button>
              </div>
            </div>

            {/* Split Mode Choice */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-foreground block">
                Output Format
              </label>
              <div className="space-y-2">
                <label className="flex items-start gap-3 rounded-xl border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                  <input
                    type="radio"
                    name="splitMode"
                    value="single"
                    checked={splitMode === "single"}
                    onChange={() => setSplitMode("single")}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="text-sm font-medium text-foreground block">
                      Single Combined PDF
                    </span>
                    <span className="text-xs text-muted-foreground block">
                      Extract all selected pages into one unified document.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 rounded-xl border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                  <input
                    type="radio"
                    name="splitMode"
                    value="individual"
                    checked={splitMode === "individual"}
                    onChange={() => setSplitMode("individual")}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="text-sm font-medium text-foreground block">
                      Individual PDFs (1 per page)
                    </span>
                    <span className="text-xs text-muted-foreground block">
                      Each selected page is saved as its own separate file.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Quick Page Badges Selector */}
          <div className="space-y-2 border-t pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                Interactive Page Selector ({selectedPages.length} of {totalPages} selected)
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-1 border rounded-lg bg-muted/20">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                const isSelected = selectedPages.includes(pageNum);
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => togglePageSelection(pageNum)}
                    className={`h-8 min-w-[34px] px-2 rounded-md text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-blue-600 text-white font-bold shadow-xs"
                        : "bg-background border text-muted-foreground hover:text-foreground hover:border-foreground/40"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Trigger */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-green-600 shrink-0" />
              <span>Extracted entirely in client browser</span>
            </div>

            <Button
              type="button"
              disabled={selectedPages.length === 0 || isProcessing}
              onClick={handleSplit}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 w-full sm:w-auto"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Splitting PDF...
                </>
              ) : (
                <>
                  <Split className="mr-2 h-4 w-4" />
                  Extract {selectedPages.length} {selectedPages.length === 1 ? "Page" : "Pages"}
                </>
              )}
            </Button>
          </div>

          {/* Results Download Area */}
          {results.length > 0 && (
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-5 w-5" />
                Extraction Complete! Download your files:
              </div>

              <div className="space-y-2">
                {results.map((res, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3 rounded-xl border bg-muted/40 p-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-xs font-medium text-foreground block truncate">
                          {res.filename}
                        </span>
                        <span className="text-[11px] text-muted-foreground block">
                          {res.pageCount} {res.pageCount === 1 ? "page" : "pages"} • {formatBytes(res.size)}
                        </span>
                      </div>
                    </div>

                    <a
                      href={res.url}
                      download={res.filename}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-green-700 transition-colors shrink-0"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </a>
                  </div>
                ))}
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
            <h4 className="font-semibold">Unable to split PDF</h4>
            <p className="text-xs mt-0.5 opacity-90">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
