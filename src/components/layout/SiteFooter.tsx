import Link from "next/link";
import { siteConfig } from "@/config/site";
import { toolsConfig } from "@/config/tools";
import { FileEdit, ShieldCheck, Heart } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4 lg:grid-cols-5">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <Link
              href="/"
              className="flex items-center gap-2.5 font-bold text-lg tracking-tight"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
                <FileEdit className="h-4 w-4" />
              </div>
              <span className="text-foreground">{siteConfig.name}</span>
            </Link>
            <p className="max-w-sm text-sm text-muted-foreground leading-relaxed">
              Every tool on this platform operates completely inside your web browser.
              Your confidential documents are never uploaded to a remote server,
              guaranteeing zero data leakage and 100% privacy.
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-green-600" />
              <span>Zero-Storage Guarantee — Free Forever, No Registration</span>
            </div>
          </div>

          {/* Tools Column */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-3">
              Popular Tools
            </h3>
            <ul className="space-y-2 text-sm">
              {toolsConfig.slice(0, 5).map((tool) => (
                <li key={tool.id}>
                  <Link
                    href={tool.href}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {tool.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Organize & Convert Column */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-3">
              Organization
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/merge-pdf"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Merge PDF
                </Link>
              </li>
              <li>
                <Link
                  href="/split-pdf"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Split PDF
                </Link>
              </li>
              <li>
                <Link
                  href="/compress-pdf"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Compress PDF
                </Link>
              </li>
              <li>
                <Link
                  href="/word-to-pdf"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Word to PDF
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Company Column */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-3">
              Company & Legal
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/privacy-policy"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  About FreePDF
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Contact & Support
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>
            &copy; 2026 {siteConfig.name}. All rights reserved.
          </p>
          <div className="flex items-center gap-1">
            <span>Built with precision & privacy in mind</span>
            <Heart className="h-3 w-3 text-red-500 fill-red-500 inline" />
          </div>
        </div>
      </div>
    </footer>
  );
}
