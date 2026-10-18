import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms and conditions for using Free PDF Tools.",
};

export default function TermsPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-12 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
          Terms of Service
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Terms governing your access to and usage of {siteConfig.name}.
        </p>
      </div>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="text-lg font-bold text-foreground">1. Acceptance of Terms</h2>
          <p>
            By accessing or using {siteConfig.name}, you agree to be bound by these Terms of Service.
            If you do not agree to these terms, please do not use our services.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground">2. Description of Service</h2>
          <p>
            {siteConfig.name} provides free, browser-based PDF editing, conversion, splitting, merging,
            and compression utilities. The service is provided &quot;as is&quot; without warranties of any kind, either express or implied.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground">3. User Responsibilities & Conduct</h2>
          <p>
            You agree not to use the service for any unlawful purposes, including but not limited to the transmission
            or processing of malicious files, infringing intellectual property, or attempting to compromise the security
            of our infrastructure or other users.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground">4. Intellectual Property</h2>
          <p>
            You retain all rights, title, and interest in any documents you process through the service.
            {siteConfig.name} claims no ownership over user documents. All platform software, design, and code
            are protected by applicable copyright and intellectual property laws.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground">5. Limitation of Liability</h2>
          <p>
            In no event shall {siteConfig.name} or its operators be liable for any indirect, incidental, special,
            or consequential damages arising out of or in connection with your use of the service.
          </p>
        </section>
      </div>
    </div>
  );
}
