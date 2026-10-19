# PDF Editing Limitations & Technical Realities

## 1. Executive Summary

PDF (Portable Document Format, ISO 32000) was engineered as a digital printing specification to ensure documents render identically on any hardware or operating system. Unlike Microsoft Word (`.docx`) or HTML, **a PDF is not a fluid text document**. It is a fixed-position graphical representation composed of vector shapes, raster images, and explicit glyph drawing commands.

Because open-source web environments do not possess full PostScript-level layout recompilers, modifying existing text requires clear engineering trade-offs. This document details the technical realities, limitations, our chosen free/open-source implementation strategy, and practical alternatives.

---

## 2. Core Technical Challenges in PDF Text Modification

### 2.1 Fixed Coordinate Placement vs. Dynamic Reflow
- **The Issue:** Every character or word in a PDF has an explicit location `(x, y)` on the page specified by operators such as `Tm` (text matrix) or `Td` (move text position). There is no inherent concept of "paragraphs" or "margins" in the raw PDF stream.
- **The Impact:** If an existing word "cat" (3 characters) is replaced with "elephant" (8 characters), the neighboring words to the right or below will not automatically move. The new text will either collide with adjacent text or extend beyond the page boundaries unless manually adjusted.

### 2.2 Font Subsetting
- **The Issue:** To minimize file size, PDF generators rarely embed complete font files. Instead, they embed "font subsets" containing only the exact glyphs used in the original document. For instance, if the letter "Z" was never used in the original document, the embedded font does not have glyph data or character metrics for "Z".
- **The Impact:** Direct in-place editing of text strings using the document's original embedded font will fail or display garbled characters if the user types letters not present in the subset.
- **Current implementation:** Replacement text is rendered in standard Helvetica. Custom font embedding and exact source-font matching are not implemented.

### 2.3 Background Occlusion & Artifacts
- **The Issue:** Because existing glyphs are baked into the PDF content stream, modifying text requires redacting (masking) the original glyphs before drawing the new text.
- **The Impact:**
  - **Solid Backgrounds (White/Light):** Seamless replacement is achievable by drawing a matching opaque rectangle over the original text bounding box before placing the replacement text.
  - **Complex Backgrounds (Gradients, Images, Watermarks, Textured Paper):** A solid color redaction mask will create a visible rectangular patch that obscures the underlying background artwork or photo.

### 2.4 Multi-Column Text, Tables & Rotated Content
- **Rotated Text:** PDFs can apply arbitrary rotation transformations to text matrices. Calculating exact occlusion boxes and drawing replacement text at arbitrary rotation angles requires complex trigonometrical adjustments.
- **Tables & Grids:** Modifying text in a table cell can easily overlap column borders if the text length expands.
- **Scanned Documents:** Scanned contracts or paper receipts contain no text objects at all—only raster pixel images. Text editing is impossible on these documents without an OCR (Optical Character Recognition) pipeline.

---

## 3. Current Free / Open-Source Implementation

Existing text can be changed only through a deliberately limited **visual cover-and-overlay** workflow:

```text
[Original PDF Page]
        │
        ▼ (1. PDF.js extracts selectable text spans and bounding boxes)
[Interactive text selection]
        │
        ▼ (2. User edits one horizontal span and chooses text/cover colors)
[Live visual cover and replacement preview]
        │
        ▼ (3. Export via pdf-lib from the untouched source bytes)
[Original PDF] ──> [Solid color rectangle] ──> [Helvetica replacement text] ──> [Exported PDF]
```

### Key Principles of This Approach:
1. **Not secure redaction**: The original text operators remain in the exported PDF and may be recovered by copying text or inspecting the PDF. Do not use this workflow to conceal sensitive information.
2. **Manually selected solid cover**: The application cannot detect the source background. Users must choose a matching solid color. Image, gradient, patterned, and vector backgrounds may be visibly damaged by the patch.
3. **Single horizontal span only**: Rotated spans, line breaks, paragraph reflow, and exact original font matching are unsupported. Helvetica is used for replacement text, and export rejects text that does not fit its fixed-width span or cannot be encoded by Helvetica.
4. **Non-destructive base**: Preview and export start from the original in-memory PDF so repeated exports do not stack edits. Unaffected original page content is preserved.
5. **Fallback options**: For complex backgrounds or unsupported text, use regular annotation tools instead. Those annotations do not modify source text.

Automated tests exercise generated PDFs and unsupported-layout/error cases. Real-world validation against a diverse corpus of receipts, contracts, invoices, and academic papers has not yet been performed.

---

## 4. Comparison: Free Solution vs. Commercial SDKs

| Feature / Capability | Our Free Open-Source Engine (`pdfjs` + `pdf-lib`) | Commercial SDKs (e.g., PSPDFKit, Adobe PDF Services) |
| :--- | :--- | :--- |
| **Direct Paragraph Reflow** | ❌ Not supported; replacement is limited to one extracted span | ✔️ Advanced heuristic paragraph reflow |
| **Original Font Matching** | ⚠️ Helvetica replacement; original styling is not preserved | ✔️ Synthesis/matching of embedded subset metrics |
| **Complex Image Backgrounds** | ⚠️ Noticeable patch unless background is solid | ⚠️ Often still leaves visual artifacts |
| **Scanned Document Editing** | ❌ Requires future OCR integration | ✔️ Integrated server-side OCR |
| **Licensing & Running Cost** | **$0 / Free forever** | **\$5,000 to \$50,000+ per year** |
| **Privacy & Data Security** | **100% In-Browser; zero data leaves device** | Requires third-party cloud uploads or private license servers |

---

## 5. Replaceable Architecture

Because the engine is wrapped inside the `PdfEditingEngine` interface, the platform architecture allows:
- Seamless upgrade to WASM-based engines (e.g., MuPDF or pdfcpu) in future phases without rewriting frontend components.
- Direct plug-in of open-source OCR (Tesseract.js) for scanned PDFs.
- Potential integration of commercial APIs if enterprise requirements emerge later.
