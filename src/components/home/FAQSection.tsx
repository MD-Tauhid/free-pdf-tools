"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "Are my files uploaded or saved to any server?",
    answer:
      "No. All PDF viewing, text editing, merging, splitting, compressing, and annotations happen entirely client-side inside your browser using WebAssembly and HTML5 Canvas. Your documents never leave your local device, ensuring complete confidentiality for contracts, financial records, and private documents.",
  },
  {
    question: "Can I really edit existing text inside a PDF?",
    answer:
      "Yes. Our PDF Editor features a dedicated text extraction and layout inspection engine. You can click on any existing line or block of text, modify its content in the properties sidebar, preview the changes live on canvas, and export the updated PDF with clean font embedding and baseline alignment.",
  },
  {
    question: "How does PDF to Word conversion work?",
    answer:
      "Our PDF to Word pipeline inspects glyph positions, line heights, and font weights to intelligently reconstruct structured paragraphs, headings, and lists into a standard Microsoft Word (.docx) document, ready for editing in Word, LibreOffice, or Google Docs.",
  },
  {
    question: "Is there any limit on file size or number of pages?",
    answer:
      "Because processing occurs in browser memory, we comfortably support documents up to 50 MB in size and up to 200 pages. For extremely large architectural blueprints or multi-gigabyte files, browser memory limits may vary by device.",
  },
  {
    question: "Is Free PDF Tools completely free to use?",
    answer:
      "Yes, 100% free forever. There are no registration forms, no trial periods, no credit card requirements, and no watermarks placed on your exported files.",
  },
  {
    question: "What browsers and devices are supported?",
    answer:
      "All modern browsers that support WebAssembly and HTML5 Canvas are supported, including Google Chrome, Mozilla Firefox, Apple Safari, and Microsoft Edge, across desktop, tablet, and mobile devices.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = React.useState<number | null>(0);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-16 sm:py-24 bg-background">
      <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Got Questions?
          </span>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            Clear answers about our in-browser technology, privacy guarantees, and supported features.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className="rounded-xl border bg-card transition-all"
              >
                <button
                  type="button"
                  onClick={() => toggle(index)}
                  className="flex w-full items-center justify-between p-5 text-left text-base font-medium text-foreground transition-colors hover:text-blue-600"
                  aria-expanded={isOpen}
                >
                  <span>{faq.question}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                      isOpen && "rotate-180 text-blue-600"
                    )}
                  />
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-border/40 pt-4">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
