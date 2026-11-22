/**
 * Tiny Zustand store that holds a File object dropped on the homepage
 * so the PDF editor can pick it up after navigation.
 *
 * The file is consumed (cleared) once the editor reads it, so it never
 * lingers across unrelated navigations.
 */

import { create } from "zustand";

interface PendingFileState {
  pendingFile: File | null;
  setPendingFile: (file: File) => void;
  consumePendingFile: () => File | null;
}

export const usePendingFileStore = create<PendingFileState>((set, get) => ({
  pendingFile: null,

  setPendingFile: (file: File) => {
    set({ pendingFile: file });
  },

  /** Return the pending file and clear it in one atomic step. */
  consumePendingFile: () => {
    const file = get().pendingFile;
    if (file) {
      set({ pendingFile: null });
    }
    return file;
  },
}));
