import {
  Edit3,
  ShieldCheck,
  FileType,
  Sparkles,
  Cpu,
  Layers,
} from "lucide-react";

export function FeaturesSection() {
  const features = [
    {
      icon: Edit3,
      title: "PDF Text Overlays & Annotations",
      description:
        "Add text boxes, highlights, drawings, signatures, and images to PDFs. Existing text can be selected for inspection, but its original glyphs are not changed.",
    },
    {
      icon: ShieldCheck,
      title: "100% In-Browser Privacy",
      description:
        "Your private documents, financial statements, and contracts are processed locally inside your web browser. Nothing is ever sent to a remote database or cloud server.",
    },
    {
      icon: FileType,
      title: "Bidirectional Word Conversion",
      description:
        "Convert PDF documents into clean, structured Microsoft Word (.docx) files, or convert DOCX documents to crisp PDFs with exact typography and margins.",
    },
    {
      icon: Cpu,
      title: "WebAssembly Acceleration",
      description:
        "Powered by modern WebAssembly and native HTML5 canvas rendering. Process multi-megabyte PDFs in milliseconds without waiting in server queues.",
    },
    {
      icon: Layers,
      title: "Flexible Organization Suite",
      description:
        "Rearrange pages with intuitive drag-and-drop, merge multiple PDF files into one, split out selected page ranges, or rotate orientation with a single click.",
    },
    {
      icon: Sparkles,
      title: "Free Forever, No Hidden Paywalls",
      description:
        "No trial periods, no watermarks stamped onto your downloads, and no mandatory account creation. Clean document processing accessible to everyone.",
    },
  ];

  return (
    <section className="border-t bg-muted/20 py-16 sm:py-24">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center mb-16">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Engineered for Privacy & Accuracy
          </span>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Why Professionals Choose Free PDF Tools
          </h2>
          <p className="mt-4 text-base text-muted-foreground leading-relaxed">
            Most online PDF tools upload your sensitive files to private cloud servers and charge monthly fees.
            We designed a modern, client-side document workstation that respects your privacy.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="flex flex-col rounded-2xl border bg-card p-6 shadow-sm transition-all hover:border-border/80"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 mb-4">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Security & Privacy Banner */}
        <div className="mt-16 rounded-2xl border border-blue-500/20 bg-blue-50/50 p-8 dark:bg-blue-950/20 dark:border-blue-800/30">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Your Privacy is Non-Negotiable
                </h3>
                <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
                  Unlike traditional cloud converters, our tools run the PDF rendering and transformation engine
                  locally on your machine using JavaScript and WebAssembly. Your files never touch our servers.
                </p>
              </div>
            </div>
            <div className="shrink-0">
              <div className="rounded-lg bg-background px-4 py-2 border text-xs font-semibold text-foreground shadow-sm">
                Strict Zero-Data Policy
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
