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
      "Inspect selectable text spans, then add text overlays, highlights, freehand drawings, signatures, and images. Existing PDF text glyphs are not modified.",
    href: "/pdf-editor",
    iconName: "FileEdit",
    badge: "Popular",
    category: "edit",
    popular: true,
    features: [
      "Inspect existing text and its position without changing original glyphs",
      "Add and format text boxes, highlights, and freehand drawings",
      "Place drawn signatures and PNG/JPEG image stamps",
      "Export annotations privately in your browser",
    ],
  },
  {
    id: "pdf-to-word",
    title: "PDF to Word",
    shortDescription: "Convert PDF documents to editable Microsoft Word (.docx) files.",
    description:
      "Extract structured text, paragraphs, and headings from PDFs and generate fully editable DOCX files ready for Microsoft Word or Google Docs.",
    href: "/pdf-to-word",
    iconName: "FileType",
    badge: "Fast",
    category: "convert",
    popular: true,
    features: [
      "Preserves paragraph flow and line breaks",
      "Outputs standard DOCX format",
      "Instant conversion without waiting in queues",
      "No registration or email required",
    ],
  },
  {
    id: "word-to-pdf",
    title: "Word to PDF",
    shortDescription: "Convert DOCX documents to standard PDF files with exact formatting.",
    description:
      "Transform your Microsoft Word (.docx) documents into clean, universal PDF files with preserved formatting, fonts, and page layouts.",
    href: "/word-to-pdf",
    iconName: "FileText",
    category: "convert",
    popular: true,
    features: [
      "Exact font rendering and page margins",
      "Retains tables, bullet points, and headers",
      "Isolated sandboxed conversion worker",
      "Automatic ephemeral file deletion",
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
