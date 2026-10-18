import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { ShieldCheck, Lock, EyeOff, ServerOff } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy — In-Browser Document Processing Guarantee",
  description:
    "Our privacy policy details our strict in-browser processing guarantee. We never store, read, or upload your PDF documents.",
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
          <h3 className="font-semibold text-sm text-foreground">Zero Server Uploads</h3>
          <p className="text-xs text-muted-foreground mt-1">PDFs are processed in browser memory via WebAssembly.</p>
        </div>
        <div className="rounded-xl border bg-card p-5 text-center">
          <Lock className="h-6 w-6 text-green-600 mx-auto mb-2" />
          <h3 className="font-semibold text-sm text-foreground">No File Storage</h3>
          <p className="text-xs text-muted-foreground mt-1">No database or file retention exists on our systems.</p>
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
            At {siteConfig.name}, we believe that document processing tools should never compromise user privacy.
            Unlike traditional web applications that transmit your private contracts, medical documents, and tax filings
            to centralized cloud servers, our architecture leverages modern browser capabilities to execute PDF parsing,
            rendering, text editing, page reordering, merging, and splitting directly inside your device’s sandbox.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground">2. Document Data Handling</h2>
          <p>
            When you select or drop a PDF into {siteConfig.name}:
          </p>
          <ul className="list-disc list-inside space-y-1.5 mt-2">
            <li>The document binary is read into your browser&apos;s local memory (RAM).</li>
            <li>All rendering and manipulation is performed by client-side WebAssembly and JavaScript libraries.</li>
            <li>No copies or fragments of your files are ever transmitted to or stored on our servers.</li>
            <li>When you close or reload the browser tab, the document data in memory is instantly discarded.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground">3. Conversion Microservice Isolation</h2>
          <p>
            For select conversions that require desktop-class rendering engines (such as Word to PDF):
          </p>
          <ul className="list-disc list-inside space-y-1.5 mt-2">
            <li>Files are transmitted over encrypted TLS connections to an isolated ephemeral worker container.</li>
            <li>The conversion is executed in a temporary directory dedicated solely to that single request.</li>
            <li>Immediately following conversion completion (or failure), the temporary directory and all associated files are permanently deleted.</li>
            <li>No persistent storage, backups, or logs containing document contents are maintained.</li>
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
