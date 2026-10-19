"use client";

import * as React from "react";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { toolsConfig } from "@/config/tools";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { X, ArrowRight, ShieldCheck } from "lucide-react";

interface MobileNavigationProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNavigation({ isOpen, onClose }: MobileNavigationProps) {
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-md md:hidden">
      <div className="flex h-16 items-center justify-between border-b px-4">
        <Link
          href="/"
          onClick={onClose}
          className="flex items-center gap-2 font-semibold text-lg tracking-tight"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-sm">
            PDF
          </div>
          <span>{siteConfig.name}</span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Close mobile menu"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-3">
            Available Tools
          </p>
          <div className="space-y-1">
            {toolsConfig.map((tool) => (
              <Link
                key={tool.id}
                href={tool.href}
                onClick={onClose}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
              >
                <div className="flex items-center gap-2">
                  <span>{tool.title}</span>
                  {tool.badge && (
                    <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                      {tool.badge}
                    </span>
                  )}
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>

        <div className="border-t pt-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-3">
            Company & Trust
          </p>
          <div className="space-y-1">
            <Link
              href="/privacy-policy"
              onClick={onClose}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <ShieldCheck className="h-4 w-4 text-green-600" />
              Privacy & File Handling
            </Link>
            <Link
              href="/about"
              onClick={onClose}
              className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              About the Platform
            </Link>
            <Link
              href="/terms"
              onClick={onClose}
              className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              Terms of Service
            </Link>
            <Link
              href="/contact"
              onClick={onClose}
              className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              Contact Support
            </Link>
          </div>
        </div>

        <div className="pt-2">
          <Link
            href="/pdf-editor"
            onClick={onClose}
            className={cn(buttonVariants({ variant: "default" }), "w-full justify-center")}
          >
            Launch Free PDF Editor
          </Link>
        </div>
      </div>
    </div>
  );
}
