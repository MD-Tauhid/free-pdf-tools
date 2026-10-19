"use client";

import * as React from "react";
import { CheckCircle2, Download, LoaderCircle, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function WordToPdfConverter() {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [converting, setConverting] = React.useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    event.target.value = "";
    setError(null);
    setSuccess(null);
    if (!selected) return;

    if (!selected.name.toLowerCase().endsWith(".docx")) {
      setFile(null);
      setError("Choose a Microsoft Word .docx file. Legacy .doc and .docm files are not supported.");
      return;
    }
    if (selected.size === 0 || selected.size > MAX_FILE_SIZE) {
      setFile(null);
      setError("Choose a non-empty DOCX file no larger than 20 MB.");
      return;
    }
    if (selected.type && selected.type !== DOCX_MIME && selected.type !== "application/octet-stream") {
      setFile(null);
      setError("The selected file is not identified as a DOCX document.");
      return;
    }
    setFile(selected);
  };

  const convert = async () => {
    if (!file || converting) return;
    setConverting(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/convert", {
        method: "POST",
        headers: {
          "content-type": DOCX_MIME,
          "x-file-name": encodeURIComponent(file.name),
        },
        body: file,
      });
      if (!response.ok) {
        let message = "The document could not be converted.";
        try {
          const payload: unknown = await response.json();
          if (
            typeof payload === "object" &&
            payload !== null &&
            "error" in payload &&
            typeof payload.error === "string"
          ) {
            message = payload.error;
          }
        } catch {
          throw new Error("The conversion service returned an unreadable error response.");
        }
        throw new Error(message);
      }

      const pdf = await response.blob();
      if (pdf.size === 0 || pdf.type !== "application/pdf") {
        throw new Error("The conversion service returned an invalid PDF.");
      }
      const objectUrl = URL.createObjectURL(pdf);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download =
        response.headers.get("x-download-filename") ??
        `${file.name.replace(/\.docx$/i, "")}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      setSuccess("Your PDF is ready and the download has started.");
    } catch (conversionError: unknown) {
      console.error("Word-to-PDF conversion failed:", conversionError);
      setError(
        conversionError instanceof Error
          ? conversionError.message
          : "The document could not be converted."
      );
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="rounded-2xl border-2 border-dashed border-border bg-card p-6 text-center shadow-sm sm:p-10">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
        <UploadCloud className="h-8 w-8" />
      </div>
      <h2 className="text-xl font-semibold text-foreground">
        Select a Word Document (.docx)
      </h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        Convert your Word document into a PDF. Files are sent to the isolated conversion worker and removed after processing.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="sr-only"
        onChange={handleFileChange}
        aria-label="Select DOCX file"
      />
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={converting}
        >
          Select DOCX File
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
      {error && (
        <p role="alert" className="mx-auto mt-4 max-w-lg text-sm text-destructive">
          {error}
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
      <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <span>DOCX is uploaded to the configured worker, limited to 20 MB, and processed in a temporary directory.</span>
      </div>
    </div>
  );
}
