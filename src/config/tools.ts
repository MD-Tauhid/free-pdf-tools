export interface ToolConfig {
  id: string;
  title: string;
  shortDescription: string;
  description: string;
  href: string;
  iconName: "FileEdit" | "FileType" | "FileText" | "Layers" | "Split" | "Minimize2" | "RotateCw" | "Stamp";
  badge?: string;
  category: "edit" | "convert" | "organize";
  popular?: boolean;
  features: string[];
}

export const toolsConfig: ToolConfig[] = [
  {
    id: "pdf-editor",
    title: "PDF Editor",
    shortDescription: "Add text, highlights, drawings, signatures, and images to PDFs online.",
    description:
      "Annotate PDFs and visually cover-and-replace supported single-line text spans. Replacement uses a solid-color patch and Helvetica; original text remains recoverable, so this is not secure redaction.",
    href: "/pdf-editor",
    iconName: "FileEdit",
    badge: "Popular",
    category: "edit",
    popular: true,
    features: [
      "Select and visually replace one horizontal text span with a solid-color cover",
      "Original text remains recoverable; this is not secure redaction",
      "Add and format text boxes, highlights, and freehand drawings",
      "Place drawn signatures and PNG/JPEG image stamps",
      "Export annotations privately in your browser",
    ],
  },
  {
    id: "pdf-to-word",
    title: "PDF to Word",
    shortDescription: "Extract selectable PDF text into an editable Word document.",
    description:
      "Extract selectable text in your browser and heuristically rebuild paragraphs, headings, basic bullet lists, and font styles as a DOCX. Complex layouts may differ, and scanned pages require OCR, which is not available.",
    href: "/pdf-to-word",
    iconName: "FileType",
    badge: "Fast",
    category: "convert",
    popular: true,
    features: [
      "Reconstructs basic paragraphs, headings, and bullet lists",
      "Infers bold and italic styles from PDF font names",
      "Scanned/image-only pages are reported; OCR is not available",
      "Files are processed locally in your browser",
    ],
  },
  {
    id: "word-to-pdf",
    title: "Word to PDF",
    shortDescription: "Convert DOCX documents to PDF using an isolated LibreOffice worker.",
    description:
      "Convert Microsoft Word (.docx) documents to PDF using LibreOffice. Files are uploaded to an isolated worker for temporary processing; layout and font fidelity can vary.",
    href: "/word-to-pdf",
    iconName: "FileText",
    category: "convert",
    popular: true,
    features: [
      "LibreOffice document rendering",
      "20 MB upload and 30-second conversion limits",
      "Isolated worker with per-job temporary directories",
      "Temporary files removed after processing",
    ],
  },
  {
    id: "merge-pdf",
    title: "Merge PDF",
    shortDescription: "Combine multiple PDF files into a single organized document.",
    description:
      "Merge two or more PDF documents in any order you choose. Reorder pages, remove unnecessary sheets, and compile a single cohesive document in seconds.",
    href: "/merge-pdf",
    iconName: "Layers",
    badge: "Essential",
    category: "organize",
    popular: true,
    features: [
      "Drag-and-drop document reordering",
      "Batch multiple PDFs simultaneously",
      "Instant client-side assembly",
      "Unlimited file combinations",
    ],
  },
  {
    id: "split-pdf",
    title: "Split PDF",
    shortDescription: "Extract specific pages or separate a document into independent PDFs.",
    description:
      "Select custom page ranges or extract individual pages from a large PDF document. Download single pages or bundled zip archives effortlessly.",
    href: "/split-pdf",
    iconName: "Split",
    category: "organize",
    popular: false,
    features: [
      "Custom page range selection (e.g., 1-5, 8, 11-14)",
      "Extract all pages into separate documents",
      "Visual page thumbnail previews",
      "100% client-side execution",
    ],
  },
  {
    id: "compress-pdf",
    title: "Compress PDF",
    shortDescription: "Reduce PDF file size while maintaining visual clarity.",
    description:
      "Optimize PDF streams, compress embedded metadata, and downsample redundant resources to create lightweight documents perfect for email attachments.",
    href: "/compress-pdf",
    iconName: "Minimize2",
    category: "organize",
    popular: false,
    features: [
      "Reduces file footprint for email and web uploads",
      "Maintains clean text sharpness",
      "Shows instant before & after file size comparison",
      "No file retention on any server",
    ],
  },
];
