import type { Metadata } from "next";
import { toolsConfig } from "@/config/tools";
import { CompressPdfTool } from "@/components/operations/CompressPdfTool";
import { Minimize2, Shield, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Compress PDF Online Free — Reduce File Size",
  description:
    "Compress PDF documents to smaller file sizes directly in your browser. Optimize PDF streams without uploading files to any external server.",
};

export default function CompressPdfPage() {
  const tool = toolsConfig.find((t) => t.id === "compress-pdf")!;

  return (
    <div className="container mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center mb-10">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 mb-4">
          <Minimize2 className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
          {tool.title}
        </h1>
        <p className="mt-3 max-w-2xl mx-auto text-base text-muted-foreground leading-relaxed">
          {tool.description}
        </p>
      </div>

      <CompressPdfTool />

      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Shield className="h-4 w-4 text-green-600" />
        <span>Instant client-side stream optimization. No document retention.</span>
      </div>

      <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8 border-t pt-12">
        <div>
          <h2 className="text-xl font-bold text-foreground mb-4">
            How PDF Compression Works
          </h2>
          <ol className="space-y-3 text-sm text-muted-foreground list-decimal list-inside leading-relaxed">
            <li>Select the PDF file you need to downsize.</li>
            <li>Click &ldquo;Compress PDF Now&rdquo; to streamline cross-reference streams.</li>
            <li>View your before-and-after file size savings.</li>
            <li>Download your optimized PDF.</li>
          </ol>
        </div>

        <div>
          <h2 className="text-xl font-bold text-foreground mb-4">
            Compression Highlights
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
