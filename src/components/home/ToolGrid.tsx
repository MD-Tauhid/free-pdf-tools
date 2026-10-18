"use client";

import * as React from "react";
import Link from "next/link";
import { toolsConfig, ToolConfig } from "@/config/tools";
import { cn } from "@/lib/utils";
import {
  FileEdit,
  FileType,
  FileText,
  Layers,
  Split,
  Minimize2,
  RotateCw,
  Stamp,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

const iconMap: Record<ToolConfig["iconName"], React.ComponentType<{ className?: string }>> = {
  FileEdit,
  FileType,
  FileText,
  Layers,
  Split,
  Minimize2,
  RotateCw,
  Stamp,
};

type CategoryFilter = "all" | "edit" | "convert" | "organize";

export function ToolGrid() {
  const [activeCategory, setActiveCategory] = React.useState<CategoryFilter>("all");

  const filteredTools = React.useMemo(() => {
    if (activeCategory === "all") return toolsConfig;
    return toolsConfig.filter((tool) => tool.category === activeCategory);
  }, [activeCategory]);

  return (
    <section className="py-16 sm:py-24 bg-background">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Popular PDF Utilities
          </h2>
          <p className="mt-3 max-w-2xl text-base text-muted-foreground">
            Everything you need to modify, transform, and arrange PDF documents without costly desktop software.
          </p>

          {/* Category Filter Tabs */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2 rounded-xl bg-muted/60 p-1.5 border">
            <button
              type="button"
              onClick={() => setActiveCategory("all")}
              className={cn(
                "rounded-lg px-4 py-1.5 text-xs sm:text-sm font-medium transition-all",
                activeCategory === "all"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              All Tools ({toolsConfig.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("edit")}
              className={cn(
                "rounded-lg px-4 py-1.5 text-xs sm:text-sm font-medium transition-all",
                activeCategory === "edit"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Edit & Annotate
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("convert")}
              className={cn(
                "rounded-lg px-4 py-1.5 text-xs sm:text-sm font-medium transition-all",
                activeCategory === "convert"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Convert
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("organize")}
              className={cn(
                "rounded-lg px-4 py-1.5 text-xs sm:text-sm font-medium transition-all",
                activeCategory === "organize"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Organize
            </button>
          </div>
        </div>

        {/* Tools Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTools.map((tool) => {
            const IconComponent = iconMap[tool.iconName] || FileEdit;

            return (
              <div
                key={tool.id}
                className="group relative flex flex-col justify-between rounded-2xl border bg-card p-6 shadow-sm transition-all hover:border-blue-500/50 hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <IconComponent className="h-5 w-5" />
                    </div>

                    {tool.badge && (
                      <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
                        {tool.badge}
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-semibold text-foreground group-hover:text-blue-600 transition-colors">
                    <Link href={tool.href} className="focus:outline-none">
                      <span className="absolute inset-0" aria-hidden="true" />
                      {tool.title}
                    </Link>
                  </h3>

                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {tool.shortDescription}
                  </p>

                  <ul className="mt-5 space-y-2 text-xs text-muted-foreground">
                    {tool.features.slice(0, 3).map((feat, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform">
                  <span>Open Tool</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
