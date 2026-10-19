# Free PDF Tools — Implementation Plan

## Overview
This document outlines the phased roadmap for building **Free PDF Tools**, a fast, privacy-focused, free online PDF editing, conversion, and document processing platform.

---

## Phased Roadmap & Acceptance Criteria

### Phase 1: Project Inspection and Planning
- **Status:** Complete (Verified)
- **Objectives:**
  - Inspect project structure, dependency versions, configuration, and environment.
  - Identify compatibility risks (Next.js 16 Turbopack, Tailwind v4, React 19, pdfjs-dist v6, react-pdf v11).
  - Author core documentation: `docs/implementation-plan.md`, `docs/architecture.md`, `docs/pdf-editing-limitations.md`.
  - Establish a zero-cost local & deployment model.
- **Acceptance Criteria:**
  - [x] Baseline checks pass (`npx tsc --noEmit`, `npm run lint`).
  - [x] Planning and architectural documentation created and verified.
  - [x] Clear phase-by-phase execution path aligned with project vision.

---

### Phase 2: Design System & Homepage
- **Status:** Complete (Verified)
- **Objectives:**
  - Build a clean, trustworthy design system using Tailwind CSS v4 and shadcn/ui (`base-nova` style with `@base-ui/react` and `cn`).
  - Configure `src/config/site.ts` and `src/config/tools.ts` for centralized metadata and tool definitions.
  - Implement reusable layout components: `SiteHeader`, `SiteFooter`, `MobileNavigation`.
  - Build homepage sections: `HeroSection` (with quick drop/upload CTA), `ToolGrid`, `FeaturesSection`, `FAQSection`, and privacy/security highlights.
  - Set up metadata, robots configuration, and sitemap foundation.
- **Acceptance Criteria:**
  - [x] Responsive design functional across mobile (375px), tablet (768px), and desktop (1280px+).
  - [x] All navigation and tool links correctly route to target pages.
  - [x] Zero console errors, clean accessible keyboard navigation, and fast initial load.
  - [x] Production build passes with all 16 static routes prerendered.

---

### Phase 3: PDF Upload & Client-Side Viewer
- **Status:** Complete (Verified)
- **Objectives:**
  - Implement client-side PDF loading (`PdfUploader`, `PdfViewer`, `PdfPage`, `PdfThumbnail`, `PdfToolbar`).
  - Integrate `pdfjs-dist` worker safely with Next.js Turbopack client-side rendering.
  - Support zoom in/out/fit, page navigation, thumbnail sidebar, and full-screen preview.
  - Validate file size, MIME type, encrypted/corrupted document handling.
  - Keep document processing strictly in-browser memory without unnecessary server uploads.
- **Acceptance Criteria:**
  - [x] Users can open and view valid PDFs in-browser.
  - [x] Page count, direct page jumping, and prev/next navigation work.
  - [x] Zoom in/out, fit to width, fit to page, and 90° rotation work.
  - [x] Thumbnails sidebar with crisp previews and page indicators.
  - [x] Validation catches empty, oversized (>50MB), non-PDF, and encrypted documents.
  - [x] Zero server uploads: 100% in-browser memory and Canvas rendering.
  - [x] Automated unit tests pass (`npm test`).

---

### Phase 4: PDF Editor Foundation
- **Status:** Complete (Verified)
- **Objectives:**
  - Define strongly typed Zustand editor store (`src/stores/pdf-editor-store.ts`).
  - Build editor workspace layout: left thumbnail sidebar, central canvas with zoom/scroll, top toolbar, right properties sidebar.
  - Implement coordinate transformation system between screen space, canvas space, and PDF points (72 DPI), including PDF.js viewport rotation.
  - Extract text positions via PDF.js `getTextContent()` into selectable bounding boxes (`TextSelectionLayer`).
  - Support new annotations: text boxes, freehand drawing, highlights, PNG/JPEG image stamps, and drawn signatures.
  - Implement undo/redo history stack (`usePdfHistory`).
  - Implement export service (`export-pdf.ts`) using `pdf-lib`.
- **Acceptance Criteria:**
  - [x] Annotation tools create visible overlays; image placements are converted to an exportable PNG/JPEG representation.
  - [x] PDF-space positions are converted through the PDF.js viewport, including rotated views and zoom changes.
  - [x] Export from the original in-memory PDF applies text, drawing, highlight, signature, and image overlays without accumulating edits.
  - [x] Undo/redo tracks supported annotation add, update, and delete operations.
  - [x] PDF export and rotated-coordinate tests pass (`npm test`); TypeScript and ESLint pass.
  - [x] Existing text selection is inspection only; editing source glyphs is explicitly deferred to Phase 5.
  - [x] Structural page operations (delete/reorder/permanent rotation) remain in Phase 8; the current rotate control changes the viewer only.

---

### Phase 5: Advanced Text Editing Engine
- **Status:** Pending
- **Objectives:**
  - Define extensible editing engine abstraction (`PdfDocumentLoader`, `PdfTextExtractor`, `PdfLayoutAnalyzer`, `PdfEditingEngine`, `PdfExportService`).
  - Implement selected block text editing panel with live preview.
  - Implement visual mask & redaction replacement: accurately occlude existing glyphs with matching background bounding boxes, then render replacement text via `pdf-lib` with standard & custom fonts.
  - Detect unsupported layouts (vertical text, complex vector graphics backgrounds, unsupported fonts) and provide actionable user warnings.
  - Test against diverse sample PDFs (receipts, contracts, invoices, academic papers).
- **Acceptance Criteria:**
  - Users can select existing text lines/blocks, modify text, and preview changes.
  - Exported PDF cleanly replaces targeted text with user modifications.
  - Clear warnings displayed when document structure prevents seamless replacement.

---

### Phase 6: Word-to-PDF Conversion Worker
- **Status:** Pending
- **Objectives:**
  - Create isolated TypeScript conversion microservice in `worker/conversion/`.
  - Author reproducible `Dockerfile` installing LibreOffice headless, essential fonts, and Node.js.
  - Build conversion job runner with input validation, timeout protection (30s limit), bounded concurrency (max 2 parallel jobs), and safe temporary directory isolation.
  - Provide Next.js API client route (`src/app/api/convert/route.ts`) interfacing with the worker.
  - Implement automatic file cleanup on both success and failure.
- **Acceptance Criteria:**
  - DOCX files convert reliably to PDF preserving formatting and layout.
  - Worker automatically rejects malicious or oversized payloads.
  - Zero disk leaks or lingering temp files after conversion jobs.

---

### Phase 7: PDF-to-Word Conversion Pipeline
- **Status:** Pending
- **Objectives:**
  - Implement browser-based PDF text and layout extraction using `pdfjs-dist` reading glyph positions, font sizes, and paragraph bounds.
  - Generate clean DOCX documents using the `docx` npm library.
  - Group text items into paragraphs, headings, and lists based on vertical line spacing and font weights.
  - Detect image-only/scanned documents and notify users regarding OCR requirements.
- **Acceptance Criteria:**
  - Text PDFs convert to editable DOCX documents with readable paragraph flow.
  - Headings, bold weights, and basic layouts map appropriately to Word styles.
  - Scanned PDFs display helpful notices explaining OCR needs.

---

### Phase 8: Additional PDF Utilities
- **Status:** Pending
- **Objectives:**
  - **Merge PDF:** Combine multiple PDF files into one document with page reordering.
  - **Split PDF:** Extract specific page ranges or split into individual page PDFs.
  - **Rotate Pages:** 90/180/270-degree rotation per page or document-wide.
  - **Reorder & Delete Pages:** Visual drag-and-drop page organizer.
  - **Compress PDF:** Streamline PDF streams and remove redundant objects where feasible with `pdf-lib`.
  - **Watermark:** Apply custom text/image watermarks with configurable opacity and rotation.
- **Acceptance Criteria:**
  - All utility tools operate entirely client-side via `pdf-lib`.
  - Fast execution (<2 seconds for typical documents up to 50 pages).
  - Clean downloads with accurate filenames and metadata.

---

### Phase 9: Security, Privacy & Performance Optimization
- **Status:** Pending
- **Objectives:**
  - Enforce client-side file limits (max 50 MB, max 200 pages for in-browser editor).
  - Implement strict MIME type and magic number validation.
  - Prevent memory leaks: revoke object URLs with `URL.revokeObjectURL()`, clean up canvas contexts.
  - Audit all worker routes for path traversal, command injection, and SSRF vulnerabilities.
  - Verify zero document persistence: no database storage, no remote telemetry with user data.
- **Acceptance Criteria:**
  - Clean memory footprint during extended editing sessions.
  - File validation reliably catches invalid or disguised files.
  - Security audit passes without any exposed secrets or remote execution paths.

---

### Phase 10: SEO, Content & Monetization Structure
- **Status:** Pending
- **Objectives:**
  - Create dedicated SEO landing pages for each tool with tailored metadata, FAQs, and step-by-step guides.
  - Add `robots.txt` and `sitemap.xml` generators.
  - Build static informational pages: Privacy Policy, Terms of Service, About Us, Contact.
  - Create modular `AdSlot` component with placeholder fallback that stays outside active editor canvases and download buttons.
- **Acceptance Criteria:**
  - Google Lighthouse SEO and Accessibility scores >90.
  - Ad placements do not obstruct tool controls or confuse users.
  - Privacy policy explicitly describes client-side processing guarantees.

---

### Phase 11: Testing, Verification & Deployment
- **Status:** Pending
- **Objectives:**
  - Run full suite of checks: `tsc`, `eslint`, Next.js production build (`npm run build`).
  - Unit and integration tests for PDF manipulation functions.
  - Document local development workflows, Docker setup, and deployment options.
  - Configure zero-cost deployment: Vercel / Cloudflare Pages for Next.js frontend, Render / Fly.io / Railway free tier for conversion worker.
- **Acceptance Criteria:**
  - Production build succeeds without errors or warnings.
  - All tools pass manual and automated verification.
  - Comprehensive deployment documentation in `docs/deployment.md`.
