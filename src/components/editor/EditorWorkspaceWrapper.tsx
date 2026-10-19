"use client";

/**
 * Dynamic import wrapper for EditorWorkspace.
 *
 * EditorWorkspace uses PDF.js canvas rendering and Zustand — both require
 * a browser environment. SSR must be disabled.
 * This file must be a Client Component so that `ssr: false` is allowed.
 */

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

export const EditorWorkspaceWrapper = dynamic(
  () =>
    import("@/components/editor/EditorWorkspace").then(
      (m) => m.EditorWorkspace
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-muted/40">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm">Loading PDF editor…</p>
        </div>
      </div>
    ),
  }
);
