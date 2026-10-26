import type { Metadata } from "next";
import { toolsConfig } from "@/config/tools";
import { OrganizePdfTool } from "@/components/operations/OrganizePdfTool";
import { Layers, Shield, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Organize PDF Online Free — Reorder and Delete Pages",
  description:
    "Reorder, rearrange, and delete pages from PDF files in your browser. Fast, private, and easy visual page management.",
};

export default function OrganizePdfPage() {
  const tool = toolsConfig.find((t) => t.id === "organize-pdf")!;

  return (
    <div className="container mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center mb-10">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 mb-4">
          <Layers className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
          {tool.title}
        </h1>
        <p className="mt-3 max-w-2xl mx-auto text-base text-muted-foreground leading-relaxed">
          {tool.description}
        </p>
      </div>

      <OrganizePdfTool />

      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Shield className="h-4 w-4 text-green-600" />
        <span>100% private in-browser document reordering</span>
      </div>

      <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8 border-t pt-12">
        <div>
          <h2 className="text-xl font-bold text-foreground mb-4">
            How to Organize PDF Pages
          </h2>
          <ol className="space-y-3 text-sm text-muted-foreground list-decimal list-inside leading-relaxed">
            <li>Select the PDF document to manage.</li>
            <li>Use the left/right arrows on each page card to shift position.</li>
            <li>Click the trash button on any unwanted sheet to remove it.</li>
            <li>Download your newly assembled document.</li>
          </ol>
        </div>

        <div>
          <h2 className="text-xl font-bold text-foreground mb-4">
            Organization Features
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
