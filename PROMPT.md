# Project: Build a Free Online PDF Editor and Converter

## 1. Your Role

Act as a senior full-stack engineer, PDF processing specialist, UI/UX designer, and software architect.

Build a production-oriented online PDF tools platform using modern technologies, clean architecture, reusable components, and maintainable TypeScript.

The application must be suitable for a solo developer to understand, extend, and maintain.

**Important:** Do not generate the entire application in one huge implementation. Work through the phases below sequentially, verify each phase, and maintain project documentation.

---

## 2. Existing Project Requirements

I have already created my Next.js project and installed shadcn/ui.

Before making changes:

1. Inspect the existing project structure.
2. Read `package.json`, `tsconfig.json`, the Next.js configuration, Tailwind configuration, shadcn configuration, and existing application files.
3. Identify which dependencies are already installed.
4. Check the installed Next.js, React, Tailwind CSS, and shadcn/ui versions.
5. Reuse the existing setup and configuration wherever possible.
6. Do not recreate the project or replace the existing configuration without a concrete technical reason.
7. Do not downgrade or unnecessarily upgrade working dependencies.
8. Create a baseline Git commit only if appropriate and if the working tree is safe; never overwrite existing user changes.

If something is missing, install only the necessary dependencies.

Do not ask me to manually perform tasks that you can safely complete in the project workspace.

---

## 3. Product Vision

Build a website where users can use PDF tools for free without creating an account.

The website should eventually support:

- Advanced PDF editing.
- Editing existing PDF text.
- Adding and formatting text.
- Highlighting and annotations.
- Adding images and signatures.
- Drawing shapes.
- Rotating, reordering, and deleting pages.
- PDF-to-Word conversion.
- Word-to-PDF conversion.
- Merging and splitting PDFs.
- Compressing PDFs.
- Downloading processed documents.
- SEO-friendly tool pages.
- Advertising monetization through Google AdSense.

The website should be fast, mobile-responsive, accessible, privacy-conscious, and visually professional.

Do not implement subscriptions, payments, or mandatory user registration.

---

## 4. Technology Stack

Use the following technologies where compatible with the existing project.

### Frontend

- Next.js App Router
- React
- TypeScript with strict typing
- Tailwind CSS
- shadcn/ui
- Lucide React icons

### PDF rendering and editing

- `pdfjs-dist` for PDF rendering and text extraction.
- `react-pdf` if useful for React-based rendering and compatible with the installed PDF.js version.
- `pdf-lib` for PDF creation, supported modifications, annotations, and page operations.
- A suitable font-loading and font-measurement approach for text layout.
- Tiptap for rich-text editing where a reconstructed document model is needed.
- Zustand or a similarly lightweight store for complex editor state.

### Document conversion

- LibreOffice headless in an isolated conversion worker for Word-to-PDF.
- A suitable PDF text-extraction and DOCX-generation pipeline for PDF-to-Word.
- The `docx` npm package where appropriate.
- OCR as a future extension for scanned PDFs.

### Infrastructure

- Next.js website deployed separately from the conversion worker.
- Docker for reproducible conversion-worker environments.
- Environment variables for service URLs and configuration.
- PostgreSQL only if a future feature actually requires persistent data.
- No database or authentication requirement for the initial release.

Prefer browser-side processing whenever practical. Do not upload PDFs to the server unnecessarily.

Use free-tier-compatible services where possible, but never assume that hosting, conversion, or storage is unlimited or permanently free.

---

## 5. Critical Technical Requirement: Existing PDF Text Editing

The most important feature is editing existing PDF text in a Word-like interface.

Do not implement a fake editor that merely displays the PDF and adds new text boxes.

PDF.js can render pages and extract text positions, but it does not provide a complete PDF text-editing engine. pdf-lib also cannot directly edit arbitrary existing PDF text objects.

Design the application around an explicit editing engine abstraction.

For example:

- `PdfDocumentLoader`
- `PdfTextExtractor`
- `PdfLayoutAnalyzer`
- `PdfEditingEngine`
- `PdfExportService`

The implementation should support the following workflow:

1. Load a PDF document.
2. Render its pages.
3. Extract text blocks and positional metadata.
4. Allow users to select an existing text block.
5. Open a text-editing panel.
6. Modify the text and supported formatting.
7. Preview the result.
8. Export the edited PDF.
9. Validate the exported result.

For the initial free implementation, investigate whether a custom text-block reconstruction approach can meet the required quality.

Where appropriate, create a replacement operation that covers the original text and draws updated text. Make the limitations explicit, especially for colored backgrounds, embedded fonts, rotated text, tables, and complex layouts.

Do not claim that this method edits the original PDF text objects or perfectly preserves every document.

Keep the editing engine replaceable so a more capable open-source engine or commercial SDK can be integrated later without rewriting the entire interface.

Do not add a paid SDK without my explicit approval.

If a technical requirement cannot be met reliably with the selected free libraries, explain the limitation in the documentation and propose practical alternatives.

---

## 6. Design and User Experience

Create a modern, professional document-tool website.

### Visual direction

- Clean, minimal, trustworthy design.
- Light background with a neutral gray palette and a restrained blue accent.
- Clear typography and consistent spacing.
- Responsive layouts for desktop, tablet, and mobile.
- Consistent shadcn/ui components.
- Lucide icons.
- Accessible contrast and keyboard navigation.
- Clear empty, loading, success, and error states.
- Avoid excessive gradients, unnecessary animations, and decorative clutter.

### Homepage

Build:

1. Header with logo, navigation, and tool categories.
2. Hero section with a clear headline and PDF upload area.
3. Popular tools grid.
4. PDF editor introduction.
5. PDF-to-Word and Word-to-PDF sections.
6. Additional PDF utilities.
7. Privacy and security explanation.
8. Frequently asked questions.
9. Footer with tool links, privacy policy, terms, and contact information.

### PDF editor workspace

Build:

- Left sidebar for page thumbnails.
- Central document canvas.
- Top toolbar for editing actions.
- Right sidebar for selected text and formatting properties.
- Page navigation and zoom controls.
- Undo and redo controls when supported.
- Save/export controls.
- Responsive layout that adapts to smaller screens.

Keep the editing workspace visually separate from advertisements.

Do not put advertisements over the PDF canvas, toolbar, upload controls, or download buttons.

---

## 7. Required Project Structure

Adapt this structure to the existing project. Do not create unnecessary abstractions.

```text
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   ├── pdf-editor/
│   │   └── page.tsx
│   ├── pdf-to-word/
│   │   └── page.tsx
│   ├── word-to-pdf/
│   │   └── page.tsx
│   ├── merge-pdf/
│   │   └── page.tsx
│   ├── split-pdf/
│   │   └── page.tsx
│   ├── compress-pdf/
│   │   └── page.tsx
│   ├── privacy-policy/
│   │   └── page.tsx
│   ├── terms/
│   │   └── page.tsx
│   ├── about/
│   │   └── page.tsx
│   ├── contact/
│   │   └── page.tsx
│   └── api/
│       └── convert/
│           └── route.ts
├── components/
│   ├── layout/
│   │   ├── SiteHeader.tsx
│   │   ├── SiteFooter.tsx
│   │   └── MobileNavigation.tsx
│   ├── home/
│   │   ├── HeroSection.tsx
│   │   ├── ToolGrid.tsx
│   │   ├── FeaturesSection.tsx
│   │   └── FAQSection.tsx
│   ├── pdf/
│   │   ├── PdfUploader.tsx
│   │   ├── PdfViewer.tsx
│   │   ├── PdfPage.tsx
│   │   ├── PdfThumbnail.tsx
│   │   └── PdfToolbar.tsx
│   ├── editor/
│   │   ├── EditorWorkspace.tsx
│   │   ├── EditorToolbar.tsx
│   │   ├── PageSidebar.tsx
│   │   ├── PropertiesSidebar.tsx
│   │   ├── TextSelectionLayer.tsx
│   │   └── TextEditPanel.tsx
│   ├── conversion/
│   │   ├── ConversionUploader.tsx
│   │   ├── ConversionProgress.tsx
│   │   └── ConversionResult.tsx
│   ├── ads/
│   │   └── AdSlot.tsx
│   └── ui/
├── hooks/
│   ├── usePdfDocument.ts
│   ├── usePdfEditor.ts
│   └── usePdfHistory.ts
├── lib/
│   ├── pdf/
│   │   ├── load-pdf.ts
│   │   ├── extract-text.ts
│   │   ├── coordinates.ts
│   │   ├── edit-pdf.ts
│   │   ├── export-pdf.ts
│   │   └── page-operations.ts
│   ├── conversion/
│   │   ├── conversion-client.ts
│   │   └── conversion-validation.ts
│   ├── validation/
│   │   └── file-validation.ts
│   ├── security/
│   │   └── file-limits.ts
│   └── utils.ts
├── stores/
│   └── pdf-editor-store.ts
├── types/
│   ├── pdf.ts
│   ├── editor.ts
│   └── conversion.ts
└── config/
    ├── site.ts
    └── tools.ts

worker/
└── conversion/
    ├── Dockerfile
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── server.ts
        ├── job-handler.ts
        ├── convert-to-pdf.ts
        ├── convert-to-docx.ts
        ├── validate-file.ts
        └── cleanup.ts

docs/
├── architecture.md
├── implementation-plan.md
├── pdf-editing-limitations.md
├── conversion-worker.md
└── deployment.md
```

This is the target structure, not a requirement to create every file immediately. Create files when their corresponding implementation phase begins.

---

## 8. Implementation Phases

Follow these phases sequentially.

### Phase 1: Project inspection and planning

- Inspect the entire existing project.
- Check installed packages and configuration.
- Identify potential conflicts and missing dependencies.
- Create `docs/implementation-plan.md`.
- Create `docs/architecture.md`.
- Create `docs/pdf-editing-limitations.md`.
- Define phase acceptance criteria.
- Report any blocking issues before changing critical configuration.

Do not proceed with a blind rewrite.

### Phase 2: Design system and homepage

- Configure the global styles and theme.
- Use the installed shadcn/ui setup.
- Build the header, hero, upload area, tool cards, feature sections, FAQ, and footer.
- Add responsive layouts and accessible interactions.
- Create tool configuration data in `src/config/tools.ts`.
- Add initial page metadata and a basic sitemap/robots configuration.
- Use original, realistic copy.
- Do not implement fake upload or conversion behavior.

Acceptance criteria:

- Homepage works at desktop and mobile sizes.
- Navigation links work.
- Tool cards link to their correct routes.
- No major layout or console errors.

### Phase 3: PDF upload and viewer

- Implement client-side PDF upload.
- Validate file extension, MIME type, and size for usability.
- Configure the PDF.js worker correctly.
- Render pages with zoom and navigation.
- Show page thumbnails.
- Handle damaged, encrypted, unsupported, and oversized documents.
- Keep the original PDF in browser memory.
- Avoid unnecessary backend uploads.

Acceptance criteria:

- Users can open valid PDFs.
- Page count and navigation work.
- Large documents have appropriate loading and error states.
- The viewer works without uploading documents to the server.

### Phase 4: PDF editor foundation

- Define strongly typed editor state.
- Implement page selection and zoom-aware coordinates.
- Extract text content and positional metadata.
- Create a selectable text layer.
- Implement selected-block inspection.
- Add text boxes, drawing, highlighting, signatures, and image overlays.
- Implement supported page operations.
- Add undo/redo for supported editor actions.
- Ensure that browser zoom and PDF export coordinates remain consistent.

Acceptance criteria:

- All implemented editing tools work.
- Editor state is separated from PDF rendering.
- Coordinates remain correct at different zoom levels.
- Exported documents contain the implemented changes.

### Phase 5: Advanced text editing

- Research free and open-source approaches to existing PDF text replacement.
- Implement an editing-engine interface.
- Prototype editing individual extracted text blocks.
- Implement preview, cancellation, and export.
- Support fonts and styles where technically possible.
- Detect unsupported layouts and display honest warnings.
- Test on multiple real-world PDFs with different fonts, backgrounds, rotations, and paragraph structures.
- Document known limitations.

Do not simulate successful editing when the underlying PDF cannot be modified reliably.

If arbitrary existing text editing cannot meet a reasonable quality threshold using the free approach, stop and present evidence, alternatives, and trade-offs before committing to a more complex solution.

### Phase 6: Word-to-PDF worker

- Create a separate TypeScript worker service.
- Create a Dockerfile that installs LibreOffice and necessary dependencies.
- Implement input validation and output validation.
- Convert DOCX files to PDF in isolated temporary directories.
- Add request timeouts and bounded concurrency.
- Clean up files on both success and failure.
- Return converted files safely.
- Add integration tests.
- Document local development commands.

Never run LibreOffice directly on an arbitrary user-provided command or path.

### Phase 7: PDF-to-Word conversion

- Extract text and positional metadata.
- Generate editable DOCX documents.
- Preserve paragraph order and basic formatting when possible.
- Implement basic image and layout handling where practical.
- Detect scanned documents and report OCR limitations.
- Add tests for text-based, multicolumn, table-heavy, and scanned PDFs.
- Clearly communicate when formatting may change.

### Phase 8: Additional PDF tools

Implement and test:

- Merge PDF.
- Split PDF.
- Rotate pages.
- Reorder pages.
- Compress PDF where feasible.
- Export supported image formats.
- Add watermarks.

Reuse the existing PDF utilities instead of duplicating processing logic.

### Phase 9: Security, privacy, and performance

- Set file-size, page-count, memory, and time limits.
- Validate files on both client and server.
- Add conversion request rate limiting.
- Isolate conversion processes.
- Prevent path traversal and arbitrary command execution.
- Avoid logging document contents.
- Automatically delete temporary files.
- Avoid persistent document storage unless necessary.
- Test mobile layouts, keyboard navigation, and accessibility.
- Add meaningful error reporting without exposing sensitive information.

### Phase 10: SEO and monetization

- Add page-specific titles and descriptions.
- Create sitemap and robots configuration.
- Add canonical URLs where appropriate.
- Add structured data only when accurate and eligible.
- Write useful original tool instructions and FAQs.
- Create privacy, terms, about, and contact pages.
- Add a reusable ad-slot component.
- Keep ad slots disabled or use placeholders until advertising approval.
- Integrate AdSense only after approval.
- Respect applicable consent and privacy requirements.
- Do not place ads in misleading positions or near critical editor controls.

### Phase 11: Testing and deployment

- Run TypeScript checks.
- Run ESLint.
- Run the production build.
- Add automated tests for important PDF operations.
- Test conversion failures and cleanup.
- Test keyboard and responsive behavior.
- Document environment variables.
- Deploy the Next.js website separately from the worker.
- Verify production conversion endpoints and download behavior.
- Document all remaining limitations.

---

## 9. Code Quality Rules

Follow these rules throughout implementation:

1. Use strict TypeScript and avoid `any`.
2. Prefer small, reusable components.
3. Keep PDF processing logic separate from React UI.
4. Do not put the entire application in one component.
5. Avoid unnecessary dependencies.
6. Use shadcn/ui components consistently.
7. Add useful loading, empty, success, and error states.
8. Avoid hardcoded service URLs.
9. Use environment variables for deployment-specific configuration.
10. Keep browser-only libraries out of server-side execution paths.
11. Handle object URL cleanup and browser memory carefully.
12. Do not expose server secrets in client code.
13. Do not upload documents unnecessarily.
14. Do not store PDF files in the database.
15. Do not claim that unsupported operations work.
16. Do not use fake conversion results or hardcoded download links.
17. Keep functions readable for a junior developer.
18. Explain important architectural decisions in comments or documentation.
19. Never overwrite unrelated existing files or user changes.
20. Do not deploy publicly or modify production infrastructure without my approval.

---

## 10. Required Verification After Every Phase

After each phase:

1. Summarize the changes.
2. List the files created or modified.
3. Explain the key implementation decisions.
4. Install any required dependencies.
5. Run the available TypeScript, lint, test, and build checks.
6. Fix errors introduced by the implementation.
7. Identify any checks that could not run.
8. Update the implementation plan and documentation.
9. List the acceptance criteria that passed or failed.
10. State the exact next phase.

Do not mark a feature complete merely because the UI exists. Verify that its underlying behavior works.

Do not silently skip failed tests or claim that an untested feature is working.

---

## 11. How to Start

Begin with **Phase 1 only**.

Inspect the current repository and produce a short assessment containing:

- Existing framework and dependency versions.
- Current project structure.
- Existing configuration that should be preserved.
- Dependencies that need to be installed.
- Any compatibility risks.
- The proposed implementation sequence.
- The main technical risks around advanced PDF text editing.
- A realistic zero-cost development and deployment approach.

Create the initial planning documents.

Then implement Phase 2 only after Phase 1 has been reviewed and its blocking issues are resolved.

Proceed one phase at a time. Prioritize a working, tested foundation over generating large amounts of code in a single pass.