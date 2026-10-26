import type { Metadata } from "next";
import { toolsConfig } from "@/config/tools";
import { WatermarkPdfTool } from "@/components/operations/WatermarkPdfTool";
import { Stamp, Shield, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Add Watermark to PDF Online Free — Text and Stamps",
  description:
    "Add custom text watermarks to PDF files in your browser. Configure font size, opacity, color, and rotation angle.",
};

export default function WatermarkPdfPage() {
  const tool = toolsConfig.find((t) => t.id === "watermark-pdf")!;

  return (
    <div className="container mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center mb-10">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 mb-4">
          <Stamp className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
          {tool.title}
        </h1>
        <p className="mt-3 max-w-2xl mx-auto text-base text-muted-foreground leading-relaxed">
          {tool.description}
        </p>
      </div>

      <WatermarkPdfTool />

      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Shield className="h-4 w-4 text-green-600" />
        <span>Vector text embedding performed locally in browser memory</span>
      </div>

      <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8 border-t pt-12">
        <div>
          <h2 className="text-xl font-bold text-foreground mb-4">
            How to Add a Watermark to a PDF
          </h2>
          <ol className="space-y-3 text-sm text-muted-foreground list-decimal list-inside leading-relaxed">
            <li>Select the PDF you wish to stamp.</li>
            <li>Type your custom watermark text or select a preset like &ldquo;CONFIDENTIAL&rdquo;.</li>
            <li>Adjust the font size, opacity, color, and angle.</li>
            <li>Preview the effect and download your watermarked PDF.</li>
          </ol>
        </div>

        <div>
          <h2 className="text-xl font-bold text-foreground mb-4">
            Watermark Features
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
