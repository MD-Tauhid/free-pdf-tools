import type { Metadata } from "next";
import { toolsConfig } from "@/config/tools";
import { PdfViewerWrapper } from "@/components/pdf/PdfViewerWrapper";
import { FileEdit, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Free Online PDF Editor — Edit Existing Text & Annotate",
  description:
    "Edit existing PDF text, add text, draw shapes, highlight, and sign PDF documents online for free. 100% private in-browser editing.",
};

export default function PdfEditorPage() {
  const tool = toolsConfig.find((t) => t.id === "pdf-editor")!;

  return (
    <div className="flex flex-col flex-1">
      {/* Viewer Workspace */}
      <div className="flex-1">
        <PdfViewerWrapper />
      </div>

      {/* SEO & Instructional Documentation Section below the workspace */}
      <div className="container mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8 border-t mt-8">
        <div className="text-center mb-10">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 mb-4">
            <FileEdit className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {tool.title} — How It Works
          </h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl mx-auto">
            {tool.description}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-lg font-bold text-foreground mb-3">
              Step-by-Step Instructions
            </h3>
            <ol className="space-y-3 text-sm text-muted-foreground list-decimal list-inside leading-relaxed">
              <li><strong className="text-foreground">Open your PDF:</strong> Drag & drop your file into the box above or click Browse.</li>
              <li><strong className="text-foreground">Navigate pages:</strong> Use the left thumbnail strip or page controls in the toolbar.</li>
              <li><strong className="text-foreground">Adjust view:</strong> Zoom in, zoom out, fit to width, or rotate orientation as needed.</li>
              <li><strong className="text-foreground">Export:</strong> Download your unmodified or processed PDF with zero server uploads.</li>
            </ol>
          </div>

          <div>
            <h3 className="text-lg font-bold text-foreground mb-3">
              Features & Guarantees
            </h3>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              {tool.features.map((feat, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
