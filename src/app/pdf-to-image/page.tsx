import type { Metadata } from "next";
import { toolsConfig } from "@/config/tools";
import { PdfToImageTool } from "@/components/operations/PdfToImageTool";
import { FileType, Shield, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Convert PDF to Image Online Free — High Quality PNG & JPG",
  description:
    "Convert PDF pages to high-resolution PNG or JPEG images directly in your browser. Download single pages or the entire image gallery.",
};

export default function PdfToImagePage() {
  const tool = toolsConfig.find((t) => t.id === "pdf-to-image")!;

  return (
    <div className="container mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center mb-10">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 mb-4">
          <FileType className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
          {tool.title}
        </h1>
        <p className="mt-3 max-w-2xl mx-auto text-base text-muted-foreground leading-relaxed">
          {tool.description}
        </p>
      </div>

      <PdfToImageTool />

      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Shield className="h-4 w-4 text-green-600" />
        <span>Hardware-accelerated rendering in browser memory</span>
      </div>

      <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8 border-t pt-12">
        <div>
          <h2 className="text-xl font-bold text-foreground mb-4">
            How to Convert PDF to Images
          </h2>
          <ol className="space-y-3 text-sm text-muted-foreground list-decimal list-inside leading-relaxed">
            <li>Select the PDF file from your device.</li>
            <li>Choose your preferred format (PNG or JPEG) and quality scale.</li>
            <li>Click &ldquo;Render All Pages to Images&rdquo;.</li>
            <li>Preview and download individual page images or the full gallery.</li>
          </ol>
        </div>

        <div>
          <h2 className="text-xl font-bold text-foreground mb-4">
            Conversion Highlights
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
