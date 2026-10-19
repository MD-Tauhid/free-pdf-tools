"use client";

import * as React from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PdfLoadError } from "@/types/pdf";
import {
  UploadCloud,
  AlertCircle,
  Loader2,
  Lock,
  ShieldCheck,
  FileText,
} from "lucide-react";

interface PdfUploaderProps {
  onFileSelect: (file: File) => void;
  loading?: boolean;
  error?: PdfLoadError | null;
  className?: string;
}

export function PdfUploader({
  onFileSelect,
  loading = false,
  error = null,
  className,
}: PdfUploaderProps) {
  const onDrop = React.useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles && acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0]);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
    multiple: false,
    disabled: loading,
  });

  return (
    <div className={cn("w-full max-w-2xl mx-auto space-y-4", className)}>
      {/* Error Banner */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          {error.code === "ENCRYPTED" ? (
            <Lock className="h-5 w-5 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-sm">
            <p className="font-semibold">{error.message}</p>
            {error.details && (
              <p className="mt-1 text-xs opacity-80">{error.details}</p>
            )}
          </div>
        </div>
      )}

      {/* Dropzone Container */}
      <div
        {...getRootProps()}
        className={cn(
          "group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 sm:p-14 text-center transition-all cursor-pointer bg-card shadow-sm",
          isDragActive
            ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 scale-[1.01]"
            : "border-border hover:border-blue-500/80 hover:bg-accent/40",
          loading && "opacity-60 cursor-not-allowed pointer-events-none"
        )}
      >
        <input {...getInputProps()} aria-label="Upload PDF Document" />

        {loading ? (
          <div className="flex flex-col items-center space-y-3">
            <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
            <p className="text-base font-medium text-foreground">
              Processing & Initializing PDF...
            </p>
            <p className="text-xs text-muted-foreground">
              Reading pages into browser memory
            </p>
          </div>
        ) : (
          <>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 mb-5 transition-transform group-hover:scale-105">
              <UploadCloud className="h-8 w-8" />
            </div>

            <h3 className="text-xl font-bold text-foreground">
              {isDragActive
                ? "Drop your PDF right here"
                : "Choose a PDF or drag & drop here"}
            </h3>

            <p className="mt-2 text-sm text-muted-foreground max-w-sm">
              Standard PDF files up to 50 MB. Fast, client-side, and completely confidential.
            </p>

            <div className="mt-6">
              <Button
                type="button"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow"
              >
                <FileText className="mr-2 h-4 w-4" />
                Select PDF File
              </Button>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-1">
        <ShieldCheck className="h-4 w-4 text-green-600" />
        <span>100% In-Browser Execution: Your files never leave this computer</span>
      </div>
    </div>
  );
}
