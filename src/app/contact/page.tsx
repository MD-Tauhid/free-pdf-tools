import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { Mail, MessageSquare } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with the Free PDF Tools team for questions, feedback, or support.",
};

export default function ContactPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-12 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 mb-4">
          <MessageSquare className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
          Contact & Support
        </h1>
        <p className="mt-3 text-base text-muted-foreground max-w-md mx-auto">
          Have questions, feature requests, or feedback for the {siteConfig.name} team? We&apos;d love to hear from you.
        </p>
      </div>

      <div className="mx-auto max-w-xl rounded-2xl border bg-card p-8 shadow-sm">
        <form className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-foreground mb-1.5">
              Your Name
            </label>
            <input
              type="text"
              placeholder="Jane Doe"
              className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-foreground mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              placeholder="jane@example.com"
              className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-foreground mb-1.5">
              Subject
            </label>
            <input
              type="text"
              placeholder="Feedback or Question"
              className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-foreground mb-1.5">
              Message
            </label>
            <textarea
              rows={4}
              placeholder="How can we help you?"
              className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <button
            type="button"
            className={cn(
              buttonVariants({ variant: "default" }),
              "w-full bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm py-2.5"
            )}
          >
            Send Message
          </button>
        </form>

        <div className="mt-8 border-t pt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Mail className="h-4 w-4 text-blue-600" />
          <span>Direct Email: support@freepdftools.com</span>
        </div>
      </div>
    </div>
  );
}
