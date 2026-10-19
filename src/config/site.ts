export interface SiteConfig {
  name: string;
  shortName: string;
  description: string;
  url: string;
  ogImage: string;
  links: {
    github?: string;
    twitter?: string;
  };
  navItems: {
    label: string;
    href: string;
    badge?: string;
  }[];
  categories: {
    title: string;
    description: string;
    tools: string[];
  }[];
}

export const siteConfig: SiteConfig = {
  name: "Free PDF Tools",
  shortName: "FreePDF",
  description:
    "100% free, private, and secure online PDF tools. Annotate PDFs, convert between Word and PDF, merge, split, compress, and organize documents right in your browser.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ogImage: "/og.png",
  links: {
    github: "https://github.com",
  },
  navItems: [
    { label: "PDF Editor", href: "/pdf-editor", badge: "Core" },
    { label: "PDF to Word", href: "/pdf-to-word" },
    { label: "Word to PDF", href: "/word-to-pdf" },
    { label: "Merge PDF", href: "/merge-pdf" },
    { label: "Split PDF", href: "/split-pdf" },
    { label: "Compress PDF", href: "/compress-pdf" },
  ],
  categories: [
    {
      title: "Edit & Annotate",
      description: "Add text overlays, highlights, drawings, and signatures to PDFs",
      tools: ["pdf-editor"],
    },
    {
      title: "Convert",
      description: "Lossless document format conversion between PDF and Office formats",
      tools: ["pdf-to-word", "word-to-pdf"],
    },
    {
      title: "Organize & Optimize",
      description: "Merge multiple documents, extract pages, rotate, and compress",
      tools: ["merge-pdf", "split-pdf", "compress-pdf"],
    },
  ],
};
