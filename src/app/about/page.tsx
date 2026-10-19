import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { ShieldCheck, Heart, Sparkles, Terminal } from "lucide-react";

export const metadata: Metadata = {
  title: "About Us",
  description: "Learn about the mission and technology behind Free PDF Tools.",
};

export default function AboutPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-12 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 mb-4">
          <Heart className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
          About {siteConfig.name}
        </h1>
        <p className="mt-3 text-base text-muted-foreground max-w-xl mx-auto">
          We believe high-quality, privacy-first PDF utilities should be freely accessible to everyone.
        </p>
      </div>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="text-lg font-bold text-foreground">Our Mission</h2>
          <p>
            For years, editing or converting a PDF meant navigating confusing paywalls, downloading bulky desktop trial
            software, or handing over sensitive personal documents to third-party servers. We set out to build an
            alternative: a straightforward PDF workstation. Most PDF tools run in the browser, while DOCX-to-PDF conversion
            uses an isolated worker with temporary job files.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground">Engineered for Privacy & Zero Server Cost</h2>
          <p>
            PDF editing and organization use modern browser technologies such as WebAssembly and HTML5 Canvas. Word-to-PDF
            conversion is an exception that uses a temporary server-side LibreOffice worker. The worker stores job files
            only in a per-request temporary directory, which is removed after the conversion finishes.
          </p>
        </section>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 my-8">
          <div className="rounded-xl border bg-card p-5">
            <ShieldCheck className="h-5 w-5 text-green-600 mb-2" />
            <h3 className="font-semibold text-sm text-foreground">Complete Privacy</h3>
            <p className="text-xs text-muted-foreground mt-1">PDF editing and organization run locally; DOCX conversion uses an isolated temporary worker.</p>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <Sparkles className="h-5 w-5 text-blue-600 mb-2" />
            <h3 className="font-semibold text-sm text-foreground">Always Free</h3>
            <p className="text-xs text-muted-foreground mt-1">No subscriptions, no trials, and no watermarks on downloads.</p>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <Terminal className="h-5 w-5 text-amber-500 mb-2" />
            <h3 className="font-semibold text-sm text-foreground">Modern Web Tech</h3>
            <p className="text-xs text-muted-foreground mt-1">Built with Next.js, React 19, TypeScript, and WebAssembly.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
