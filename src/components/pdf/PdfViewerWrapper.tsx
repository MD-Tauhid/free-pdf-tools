"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const DynamicPdfViewer = dynamic(
  () => import("@/components/pdf/PdfViewer").then((mod) => mod.PdfViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[calc(100vh-12rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm font-medium">Initializing PDF Engine...</p>
        </div>
      </div>
    ),
  }
);

export function PdfViewerWrapper() {
  return <DynamicPdfViewer />;
}
