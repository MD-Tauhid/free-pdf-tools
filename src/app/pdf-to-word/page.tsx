import type { Metadata } from "next";
import { toolsConfig } from "@/config/tools";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FileType, UploadCloud, Shield, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Convert PDF to Word Online Free — Editable DOCX",
  description:
    "Convert PDF files to editable Microsoft Word (.docx) documents online for free. Accurate formatting, headings, and paragraph flow.",
};

export default function PdfToWordPage() {
  const tool = toolsConfig.find((t) => t.id === "pdf-to-word")!;

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

      <div className="rounded-2xl border-2 border-dashed border-border bg-card p-10 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 mb-4">
          <UploadCloud className="h-8 w-8" />
        </div>
        <h3 className="text-xl font-semibold text-foreground">
          Choose a PDF to Convert to Word
        </h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
          Extract text and layout into an editable DOCX file.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <label className={cn(buttonVariants({ variant: "default" }), "cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-medium")}>
            Select PDF File
            <input type="file" accept="application/pdf" className="sr-only" />
          </label>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Shield className="h-4 w-4 text-green-600" />
          <span>Local Text Extraction: Private and secure</span>
        </div>
      </div>

      <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8 border-t pt-12">
        <div>
          <h2 className="text-xl font-bold text-foreground mb-4">
            How It Works
          </h2>
          <ol className="space-y-3 text-sm text-muted-foreground list-decimal list-inside leading-relaxed">
            <li>Select your PDF document from your device.</li>
            <li>Our pipeline reads paragraph bounds and font weights.</li>
            <li>Generates a standard Microsoft Word .docx file.</li>
            <li>Download and edit freely in Word or Google Docs.</li>
          </ol>
        </div>

        <div>
          <h2 className="text-xl font-bold text-foreground mb-4">
            Conversion Features
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
