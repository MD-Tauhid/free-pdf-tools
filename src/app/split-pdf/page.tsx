import type { Metadata } from "next";
import { toolsConfig } from "@/config/tools";
import { SplitPdfTool } from "@/components/operations/SplitPdfTool";
import { Split, Shield, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Split PDF Files Online Free — Extract Pages",
  description:
    "Extract specific pages or separate a large PDF document into individual files for free. Fast in-browser processing.",
};

export default function SplitPdfPage() {
  const tool = toolsConfig.find((t) => t.id === "split-pdf")!;

  return (
    <div className="container mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center mb-10">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 mb-4">
          <Split className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
          {tool.title}
        </h1>
        <p className="mt-3 max-w-2xl mx-auto text-base text-muted-foreground leading-relaxed">
          {tool.description}
        </p>
      </div>

      <SplitPdfTool />

      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Shield className="h-4 w-4 text-green-600" />
        <span>Local Page Extraction: Completely secure and client-side</span>
      </div>

      <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8 border-t pt-12">
        <div>
          <h2 className="text-xl font-bold text-foreground mb-4">
            How to Split a PDF
          </h2>
          <ol className="space-y-3 text-sm text-muted-foreground list-decimal list-inside leading-relaxed">
            <li>Select the PDF you wish to divide.</li>
            <li>Type custom page ranges (e.g. 1-3, 5) or click individual page number badges.</li>
            <li>Choose whether to combine extracted pages or save them as individual files.</li>
            <li>Download your extracted document(s).</li>
          </ol>
        </div>

        <div>
          <h2 className="text-xl font-bold text-foreground mb-4">
            Split Capabilities
          </h2>
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
  );
}
