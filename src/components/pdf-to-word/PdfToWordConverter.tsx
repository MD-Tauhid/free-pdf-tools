"use client";

import * as React from "react";
import { CheckCircle2, Download, LoaderCircle, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FILE_LIMITS } from "@/lib/security/file-limits";
import { convertPdfToWord } from "@/lib/pdf/pdf-to-word";

export function PdfToWordConverter() {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [warning, setWarning] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [converting, setConverting] = React.useState(false);
  const [progress, setProgress] = React.useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    event.target.value = "";
    setError(null);
    setWarning(null);
    setSuccess(null);
    setProgress(null);
    if (!selected) return;

    if (!selected.name.toLowerCase().endsWith(".pdf")) {
      setFile(null);
      setError("Choose a PDF document with a .pdf extension.");
      return;
    }
    if (selected.size === 0 || selected.size > FILE_LIMITS.MAX_FILE_SIZE_BYTES) {
      setFile(null);
      setError(
        `Choose a non-empty PDF no larger than ${FILE_LIMITS.MAX_FILE_SIZE_MB} MB.`
      );
      return;
    }
    if (selected.type && selected.type !== "application/pdf") {
      setFile(null);
      setError("The selected file is not identified as a PDF document.");
      return;
    }
    setFile(selected);
  };

  const convert = async () => {
    if (!file || converting) return;
    setConverting(true);
    setError(null);
    setWarning(null);
    setSuccess(null);
    setProgress("Checking PDF and reading text…");
    try {
      const result = await convertPdfToWord(file, (pageNumber, pageCount) => {
        setProgress(`Reading page ${pageNumber} of ${pageCount}…`);
      });
      const objectUrl = URL.createObjectURL(result.blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `${file.name.replace(/\.pdf$/i, "") || "converted-document"}.docx`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      setWarning(result.warning);
      setSuccess(
        `Converted ${result.extractedPages} of ${result.pageCount} page${result.pageCount === 1 ? "" : "s"}. The DOCX download has started.`
      );
    } catch (conversionError: unknown) {
      console.error("PDF-to-Word conversion failed:", conversionError);
      setError(
        conversionError instanceof Error
          ? conversionError.message
          : "The PDF could not be converted."
      );
    } finally {
      setConverting(false);
      setProgress(null);
    }
  };

  return (
    <div className="rounded-2xl border-2 border-dashed border-border bg-card p-6 text-center shadow-sm sm:p-10">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
        <UploadCloud className="h-8 w-8" />
      </div>
      <h2 className="text-xl font-semibold text-foreground">
        Choose a PDF to Convert to Word
      </h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        Extract selectable text and reconstruct basic paragraphs, headings, and font styles in your browser.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="sr-only"
        onChange={handleFileChange}
        aria-label="Select PDF file"
      />
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={converting}
        >
          Select PDF File
        </Button>
        {file && (
          <Button type="button" onClick={() => void convert()} disabled={converting}>
            {converting ? (
              <>
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                Converting…
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Convert and Download
              </>
            )}
          </Button>
        )}
      </div>
      {file && (
        <p className="mt-4 break-all text-sm text-foreground" aria-live="polite">
          Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
        </p>
      )}
      {progress && (
        <p role="status" className="mt-4 text-sm text-muted-foreground">
          {progress}
        </p>
      )}
      {error && (
        <p role="alert" className="mx-auto mt-4 max-w-lg text-sm text-destructive">
          {error}
        </p>
      )}
      {warning && (
        <p
          role="status"
          className="mx-auto mt-4 max-w-lg rounded-md border border-amber-300 bg-amber-50 p-3 text-left text-sm text-amber-900"
        >
          {warning}
        </p>
      )}
      {success && (
        <p
          role="status"
          className="mx-auto mt-4 flex max-w-lg items-center justify-center gap-2 text-sm text-green-700 dark:text-green-400"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {success}
        </p>
      )}
      <div className="mt-6 text-xs text-muted-foreground">
        PDF files are processed locally in your browser. Scanned/image-only pages require OCR and are not converted.
      </div>
    </div>
  );
}
