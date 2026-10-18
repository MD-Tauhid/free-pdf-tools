# Free PDF Tools — System Architecture

## 1. Architectural Philosophy

The platform is designed around three foundational principles:
1. **Client-First Privacy & Zero Server Cost**: All PDF viewing, editing, page reordering, merging, splitting, watermarking, and text redaction/overlay occur directly inside the user's browser using WebAssembly/JavaScript (`pdfjs-dist` and `pdf-lib`). Files do not leave the client device for standard operations.
2. **Modular & Replaceable Engine Abstraction**: The core PDF editing engine is decoupled from the React user interface through strict interfaces. Future upgrades (such as WASM-compiled MuPDF or specialized layout engines) can be swapped in without modifying UI components.
3. **Isolated, Ephemeral Microservices for Complex Conversions**: Tasks that cannot reliably be performed inside a browser sandbox (e.g., high-fidelity DOCX-to-PDF conversion requiring complete desktop font and layout rendering) are isolated into a lightweight, headless LibreOffice worker with strict sandboxing and automated cleanup.

---

## 2. High-Level System Architecture

```text
+-----------------------------------------------------------------------------------+
|                                 USER BROWSER                                      |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |                     Next.js 16 App Router (React 19)                        |  |
|  |   - Homepage & SEO Tool Pages (/pdf-editor, /merge-pdf, etc.)               |  |
|  |   - Tailwind CSS v4 + shadcn/ui (base-nova with @base-ui/react & cn)        |  |
|  +-----------------------------------------------------------------------------+  |
|                                      |                                            |
|                                      v                                            |
|  +-----------------------------------------------------------------------------+  |
|  |                       Editor State (Zustand Store)                          |  |
|  |   - Active Document, Pages, Zoom, Active Tool, Selection, History           |  |
|  +-----------------------------------------------------------------------------+  |
|          |                                              |                         |
|          v                                              v                         |
|  +---------------------------------------+  +----------------------------------+  |
|  |    Rendering & Extraction (pdfjs)     |  |   Modification & Export (pdf-lib)|  |
|  |  - Canvas page rasterization           |  |  - Redaction / Background patch  |  |
|  |  - Glyph text extraction & bounding   |  |  - Text overlay drawing          |  |
|  |  - TextSelectionLayer & DOM overlays  |  |  - Page split, merge, rotate     |  |
|  +---------------------------------------+  +----------------------------------+  |
+-----------------------------------------------------------------------------------+
                                       |
                 (Only for DOCX -> PDF conversion jobs)
                                       v
+-----------------------------------------------------------------------------------+
|                        ISOLATED CONVERSION WORKER                                 |
|  +-----------------------------------------------------------------------------+  |
|  | Next.js API Route (/api/convert)                                            |  |
|  |   - File validation (MIME, magic bytes, size limits)                        |  |
|  |   - Dispatches authenticated stream to Dockerized Worker                    |  |
|  +-----------------------------------------------------------------------------+  |
|                                      |                                            |
|                                      v                                            |
|  +-----------------------------------------------------------------------------+  |
|  | Headless LibreOffice Worker (Docker Container)                              |  |
|  |   - Ephemeral tempdir (per job, deleted on exit)                            |  |
|  |   - Concurrency limit (max 2 jobs) + strict timeout (30s)                   |  |
|  |   - Returns converted PDF stream to client                                  |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## 3. PDF Editing Engine Abstraction

To ensure modularity and avoid tight coupling between UI components and PDF rendering internals, the editing workflow is structured into five distinct abstraction layers:

### 3.1 `PdfDocumentLoader`
- **Role:** Loads raw `ArrayBuffer` or `File` objects into both `pdfjs-dist` (for client-side rendering and text inspection) and `pdf-lib` (for low-level document mutations and final output compilation).
- **Responsibilities:**
  - Decrypt checks and password challenge detection.
  - Page count, document dimension, and rotation extraction.
  - Memory cleanup management (`URL.revokeObjectURL` and buffer deallocation).

### 3.2 `PdfTextExtractor`
- **Role:** Scans pages using PDF.js `getTextContent({ includeMarkedContent: true })` to extract text items with exact positional matrices.
- **Responsibilities:**
  - Converts PDF coordinate transforms (`[scaleX, skewY, skewX, scaleY, transX, transY]`) into normalized bounding boxes `(x, y, width, height)`.
  - Groups adjacent glyphs into coherent lines, spans, and paragraphs based on baseline alignments and character spacings.
  - Detects font properties: estimated font family, font size, bold/italic traits, and fill colors.

### 3.3 `PdfLayoutAnalyzer`
- **Role:** Analyzes extracted spans to construct interactive overlay models.
- **Responsibilities:**
  - Maps screen coordinates (CSS pixels at current zoom level) to native PDF points (72 points per inch).
  - Determines line bounding boxes and detects multi-column or rotated blocks.
  - Assesses replacement feasibility: checks for solid vs. complex image/gradient backgrounds, font match confidence, and potential text overlap.

### 3.4 `PdfEditingEngine`
- **Role:** Coordinates active user modifications and maintains the mutable document model.
- **Responsibilities:**
  - Maintains a queue of operations:
    - `TextReplaceOperation`: Redacts original bounding box and places updated text.
    - `AnnotationAddOperation`: User-drawn rectangles, freehand ink, highlights, signatures.
    - `TextAddOperation`: Freely positioned text boxes with custom font size, weight, color.
    - `ImageOverlayOperation`: Uploaded image stamps and logos.
  - Dispatches updates to the Zustand store for reactive UI feedback and live canvas preview.

### 3.5 `PdfExportService`
- **Role:** Compiles all queued operations onto the original PDF document using `pdf-lib`.
- **Responsibilities:**
  - Loads the pristine original PDF `ArrayBuffer` to avoid cumulative raster degradation.
  - Embeds required standard fonts (Helvetica, Times Roman, Courier) and custom TrueType/OpenType fonts.
  - Applies background occlusion masks matching the original text background color to prevent ghosting.
  - Renders replacement and additional text, vector paths, and images in proper z-index order.
  - Serializes and emits a clean `Uint8Array` ready for client-side download.

---

## 4. Coordinate Transformation System

A common point of failure in browser-based PDF editors is coordinate drift across zoom levels and device pixel ratios. The system formalizes coordinate transformations:

### Units of Measure
1. **PDF User Space**: 1/72 inch (Standard PDF point). Origin `(0, 0)` is at the **bottom-left** corner of the page.
2. **DOM / Screen Space**: CSS pixels. Origin `(0, 0)` is at the **top-left** corner of the rendered page container.
3. **Canvas Raster Space**: Physical pixels = `CSS pixels * window.devicePixelRatio`.

### Transformation Equations

Given:
- `pageHeight`: Height of the PDF page in points (e.g. 792 for standard US Letter, 841.89 for A4).
- `pageWidth`: Width of the PDF page in points.
- `scale`: Current viewport zoom factor (e.g., 1.0 = 100%, 1.5 = 150%).

#### Converting PDF Points to Screen Space:
```typescript
function pdfToScreen(x: number, y: number, pageHeight: number, scale: number) {
  return {
    screenX: x * scale,
    screenY: (pageHeight - y) * scale,
  };
}
```

#### Converting Screen Space to PDF Points:
```typescript
function screenToPdf(screenX: number, screenY: number, pageHeight: number, scale: number) {
  return {
    pdfX: screenX / scale,
    pdfY: pageHeight - (screenY / scale),
  };
}
```

---

## 5. Conversion Worker Microservice

To convert Microsoft Word (`.docx`) documents to PDF with zero third-party license costs, the system uses headless LibreOffice:

```text
Worker Components:
├── server.ts         (Fastify/Express HTTP server with streaming upload)
├── job-handler.ts    (Concurrency limiter, 30s timeout supervisor)
├── convert-to-pdf.ts (Executes 'libreoffice --headless --convert-to pdf' in isolated temp dir)
├── validate-file.ts  (Validates DOCX magic number: 50 4B 03 04, max size 25MB)
└── cleanup.ts        (Ensures temp directory is deleted via try/finally)
```

### Security Measures:
- Worker runs as a dedicated, unprivileged user (`nonroot`) inside Docker.
- Concurrency capped at 2 parallel conversions to prevent CPU exhaustion on free-tier containers.
- Execution timeout strictly enforced (30 seconds maximum).
- Inputs sanitized to alphanumeric names; no shell commands concatenated with user input.

---

## 6. Zero-Cost Hosting & Deployment Topology

| Component | Target Platform | Cost Tier | Role |
| :--- | :--- | :--- | :--- |
| **Frontend & API Routes** | Vercel or Cloudflare Pages | Free Tier | Serves static assets, Next.js App Router, in-browser PDF editor |
| **Conversion Worker** | Render, Fly.io, or Railway | Free / Low-tier | Runs Dockerized LibreOffice worker on demand |
| **Database** | None | $0 | No database required for userless, session-free architecture |
| **Storage** | Client Local Memory | $0 | Zero document storage costs; maximum privacy guarantee |
