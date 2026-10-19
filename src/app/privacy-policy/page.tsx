import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { ShieldCheck, Lock, EyeOff, ServerOff } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy — Document Processing and File Handling",
  description:
    "Learn which PDF tools process files in your browser and how DOCX uploads are handled by the temporary Word-to-PDF conversion worker.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-12 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-600 dark:bg-green-950/60 dark:text-green-400 mb-4">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
          Privacy Policy & Security Guarantee
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Last updated: October 2026. Designed from the ground up to protect your confidential information.
        </p>
      </div>

      {/* Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
        <div className="rounded-xl border bg-card p-5 text-center">
          <ServerOff className="h-6 w-6 text-blue-600 mx-auto mb-2" />
          <h3 className="font-semibold text-sm text-foreground">Browser-based PDF tools</h3>
          <p className="text-xs text-muted-foreground mt-1">PDF editor files are processed in browser memory.</p>
        </div>
        <div className="rounded-xl border bg-card p-5 text-center">
          <Lock className="h-6 w-6 text-green-600 mx-auto mb-2" />
          <h3 className="font-semibold text-sm text-foreground">Temporary DOCX processing</h3>
          <p className="text-xs text-muted-foreground mt-1">Conversion job directories are removed after each job.</p>
        </div>
        <div className="rounded-xl border bg-card p-5 text-center">
          <EyeOff className="h-6 w-6 text-purple-600 mx-auto mb-2" />
          <h3 className="font-semibold text-sm text-foreground">No Account Tracking</h3>
          <p className="text-xs text-muted-foreground mt-1">Use every tool freely without creating an account.</p>
        </div>
      </div>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="text-lg font-bold text-foreground">1. Our Core Privacy Philosophy</h2>
          <p>
            At {siteConfig.name}, we aim to minimize document transfers. PDF editor files are parsed, rendered, and
            edited in your browser. Word-to-PDF conversion requires a server-side LibreOffice worker, so DOCX files
            selected for that tool leave your device for temporary processing.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground">2. Document Data Handling</h2>
          <p>
            When you use a browser-based PDF tool:
          </p>
          <ul className="list-disc list-inside space-y-1.5 mt-2">
            <li>The document binary is read into your browser&apos;s local memory (RAM).</li>
            <li>All rendering and manipulation is performed by client-side WebAssembly and JavaScript libraries.</li>
            <li>Those browser-based PDF operations do not upload the document to the conversion worker.</li>
            <li>When you close or reload the browser tab, the document data in memory is instantly discarded.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground">3. Conversion Microservice Isolation</h2>
          <p>
            For Word-to-PDF conversion:
          </p>
          <ul className="list-disc list-inside space-y-1.5 mt-2">
            <li>The DOCX file is uploaded to the application, then forwarded to an authenticated, isolated worker. Deployments should use TLS for untrusted network hops and keep the worker on a private network.</li>
            <li>Each conversion runs in a unique temporary directory. Uploads are limited to 20 MB, archive expansion to 100 MB, concurrent jobs to two per worker, and conversion time to 30 seconds.</li>
            <li>The worker removes the temporary directory after successful conversion or failure. The converted PDF is returned to your browser and is not retained by the worker.</li>
            <li>The service does not intentionally log document contents. Hosting and network providers may process request metadata under their own policies.</li>
            <li>Do not upload documents unless you are comfortable with this server-side conversion.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground">4. Advertising and Analytics</h2>
          <p>
            To keep {siteConfig.name} 100% free forever without charging users or requiring subscriptions,
            we may display non-intrusive advertisements (such as Google AdSense). Advertisements comply with applicable
            data privacy standards and are strictly segregated from document canvas areas and editing controls.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground">5. Contact Us</h2>
          <p>
            If you have questions regarding our privacy practices or security architecture, please visit our{" "}
            <a href="/contact" className="text-blue-600 underline">Contact page</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
