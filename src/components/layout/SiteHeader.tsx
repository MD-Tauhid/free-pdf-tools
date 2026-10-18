"use client";

import * as React from "react";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { toolsConfig } from "@/config/tools";
import { buttonVariants, Button } from "@/components/ui/button";
import { MobileNavigation } from "@/components/layout/MobileNavigation";
import { cn } from "@/lib/utils";
import {
  FileEdit,
  Menu,
  Shield,
  ChevronDown,
} from "lucide-react";

export function SiteHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [toolsDropdownOpen, setToolsDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setToolsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand Logo */}
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="flex items-center gap-2.5 font-bold text-lg tracking-tight transition-opacity hover:opacity-90"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                <FileEdit className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="leading-none text-foreground font-semibold">
                  {siteConfig.name}
                </span>
                <span className="text-[10px] text-muted-foreground font-normal tracking-wide">
                  100% FREE & PRIVATE
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {/* All Tools Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setToolsDropdownOpen(!toolsDropdownOpen)}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
                  aria-expanded={toolsDropdownOpen}
                >
                  <span>All Tools</span>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 transition-transform duration-200",
                      toolsDropdownOpen && "rotate-180"
                    )}
                  />
                </button>

                {toolsDropdownOpen && (
                  <div className="absolute left-0 mt-2 w-72 rounded-xl border bg-background p-2 shadow-lg ring-1 ring-black/5 dark:ring-white/10 z-50">
                    <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Online Tools
                    </div>
                    <div className="space-y-0.5">
                      {toolsConfig.map((tool) => (
                        <Link
                          key={tool.id}
                          href={tool.href}
                          onClick={() => setToolsDropdownOpen(false)}
                          className="flex items-start gap-2.5 rounded-lg p-2 transition-colors hover:bg-muted"
                        >
                          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
                            <FileEdit className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-medium text-foreground">
                                {tool.title}
                              </span>
                              {tool.badge && (
                                <span className="rounded bg-blue-500/10 px-1.5 py-0.2 text-[9px] font-semibold text-blue-600 dark:text-blue-400">
                                  {tool.badge}
                                </span>
                              )}
                            </div>
                            <p className="line-clamp-1 text-[11px] text-muted-foreground">
                              {tool.shortDescription}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Direct links for top tools */}
              <Link
                href="/pdf-editor"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
              >
                PDF Editor
              </Link>
              <Link
                href="/pdf-to-word"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
              >
                PDF to Word
              </Link>
              <Link
                href="/merge-pdf"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
              >
                Merge PDF
              </Link>
              <Link
                href="/compress-pdf"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
              >
                Compress
              </Link>
            </nav>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full border">
              <Shield className="h-3.5 w-3.5 text-green-600" />
              <span>In-Browser Processing</span>
            </div>

            <Link
              href="/pdf-editor"
              className={cn(
                buttonVariants({ variant: "default", size: "sm" }),
                "bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm"
              )}
            >
              Launch Editor
            </Link>

            {/* Mobile menu trigger */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open mobile navigation"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <MobileNavigation
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
    </>
  );
}
