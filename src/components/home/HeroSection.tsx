"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  UploadCloud,
  ShieldCheck,
  Zap,
  Lock,
  ArrowRight,
  FileCheck,
} from "lucide-react";

export function HeroSection() {
  const router = useRouter();
  const [selectedFileName, setSelectedFileName] = React.useState<string | null>(null);

  const onDrop = React.useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setSelectedFileName(file.name);
        // Navigate to the editor. In Phase 3, this hooks into the in-memory document store.
        router.push("/pdf-editor");
      }
    },
    [router]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
    multiple: false,
  });

  return (
    <section className="relative overflow-hidden border-b bg-gradient-to-b from-background to-muted/20 py-16 sm:py-24">
      {/* Decorative background grid pattern */}
      <div
        className="absolute inset-0 -z-10 opacity-30 dark:opacity-10 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(0,0,0,0.15) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
        {/* Top Trust Pill */}
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-50/50 px-3.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800/40 mb-6">
          <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span>Client-Side Technology: Documents Never Leave Your Device</span>
        </div>

        {/* Main Title */}
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-foreground">
          Free, Fast & Secure <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Online PDF Tools
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed">
          Edit existing PDF text, convert between Word and PDF, merge, split, and compress
          documents directly inside your web browser. No accounts, no subscriptions, and no file uploads.
        </p>

        {/* Interactive Upload Box */}
        <div className="mx-auto mt-10 max-w-xl">
          <div
            {...getRootProps()}
            className={cn(
              "group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 sm:p-10 transition-all cursor-pointer bg-card shadow-sm hover:border-blue-500/80 hover:bg-accent/40",
              isDragActive
                ? "border-blue-600 bg-blue-50/40 dark:bg-blue-950/20 scale-[1.01]"
                : "border-border"
            )}
          >
            <input {...getInputProps()} aria-label="Upload PDF file" />
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 mb-4 transition-transform group-hover:scale-110">
              <UploadCloud className="h-7 w-7" />
            </div>

            <h2 className="text-lg font-semibold text-foreground">
              {isDragActive
                ? "Drop your PDF file right here..."
                : selectedFileName
                ? `Selected: ${selectedFileName}`
                : "Choose a PDF file or drag it here"}
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">
              Supported file types: PDF documents up to 50MB
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button
                type="button"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow"
              >
                Select PDF Document
              </Button>
              <Link
                href="/pdf-editor"
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "font-medium"
                )}
              >
                Open Empty Canvas
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Value Highlights */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto pt-6 border-t border-border/60">
          <div className="flex items-center justify-center gap-2.5 text-xs sm:text-sm text-muted-foreground">
            <Lock className="h-4 w-4 text-green-600 shrink-0" />
            <span>100% In-Browser Privacy</span>
          </div>
          <div className="flex items-center justify-center gap-2.5 text-xs sm:text-sm text-muted-foreground">
            <Zap className="h-4 w-4 text-amber-500 shrink-0" />
            <span>Instant WebAssembly Speed</span>
          </div>
          <div className="flex items-center justify-center gap-2.5 text-xs sm:text-sm text-muted-foreground">
            <FileCheck className="h-4 w-4 text-blue-600 shrink-0" />
            <span>No Signup or Watermarks</span>
          </div>
        </div>
      </div>
    </section>
  );
}
