import JSZip from "jszip";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";

export interface DocxTextRun {
  text: string;
  bold: boolean;
  italic: boolean;
  fontSize: number;
}

export interface DocxParagraph {
  runs: DocxTextRun[];
  isHeading: boolean;
  headingLevel: 1 | 2 | 3 | null;
  isBullet: boolean;
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/**
 * Parses raw Word document XML into structured paragraphs and runs.
 */
export function parseDocxXml(xmlString: string): DocxParagraph[] {
  const paragraphs: DocxParagraph[] = [];

  // Match all <w:p>...</w:p> tags
  const pRegex = /<w:p(?: [^>]*)?>([\s\S]*?)<\/w:p>/g;
  let pMatch: RegExpExecArray | null;

  while ((pMatch = pRegex.exec(xmlString)) !== null) {
    const pContent = pMatch[1];

    // Check paragraph properties
    let isHeading = false;
    let headingLevel: 1 | 2 | 3 | null = null;
    let isBullet = false;

    const pPrMatch = /<w:pPr>([\s\S]*?)<\/w:pPr>/.exec(pContent);
    if (pPrMatch) {
      const pPr = pPrMatch[1];
      const styleMatch = /<w:pStyle w:val="([^"]+)"\/>/.exec(pPr);
      if (styleMatch) {
        const style = styleMatch[1].toLowerCase();
        if (style.includes("heading1") || style.includes("title")) {
          isHeading = true;
          headingLevel = 1;
        } else if (style.includes("heading2") || style.includes("subtitle")) {
          isHeading = true;
          headingLevel = 2;
        } else if (style.includes("heading3")) {
          isHeading = true;
          headingLevel = 3;
        }
      }
      if (/<w:numPr>/.test(pPr)) {
        isBullet = true;
      }
    }

    // Match all text runs <w:r>...</w:r>
    const runs: DocxTextRun[] = [];
    const rRegex = /<w:r(?: [^>]*)?>([\s\S]*?)<\/w:r>/g;
    let rMatch: RegExpExecArray | null;

    while ((rMatch = rRegex.exec(pContent)) !== null) {
      const rContent = rMatch[1];
      const rPrMatch = /<w:rPr>([\s\S]*?)<\/w:rPr>/.exec(rContent);
      const rPr = rPrMatch ? rPrMatch[1] : "";

      const bold = /<w:b(?:\/| [^>]*\/>)/.test(rPr) && !/<w:b w:val="(?:0|false)"\/>/.test(rPr);
      const italic = /<w:i(?:\/| [^>]*\/>)/.test(rPr) && !/<w:i w:val="(?:0|false)"\/>/.test(rPr);

      let fontSize = isHeading
        ? (headingLevel === 1 ? 18 : headingLevel === 2 ? 14 : 12)
        : 11;

      const szMatch = /<w:sz w:val="(\d+)"\/>/.exec(rPr);
      if (szMatch) {
        // Word stores font sizes in half-points (e.g. 24 = 12pt)
        const parsedHalfPts = parseInt(szMatch[1], 10);
        if (!isNaN(parsedHalfPts) && parsedHalfPts > 0) {
          fontSize = Math.round(parsedHalfPts / 2);
        }
      }

      // Extract text content from <w:t>...</w:t>
      const tRegex = /<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g;
      let tMatch: RegExpExecArray | null;
      let fullRunText = "";

      while ((tMatch = tRegex.exec(rContent)) !== null) {
        fullRunText += tMatch[1];
      }

      if (/<w:tab\/>/.test(rContent)) {
        fullRunText = "    " + fullRunText;
      }

      if (fullRunText.length > 0) {
        runs.push({
          text: decodeXmlEntities(fullRunText),
          bold: isHeading ? true : bold,
          italic,
          fontSize,
        });
      }
    }

    if (runs.length > 0) {
      paragraphs.push({
        runs,
        isHeading,
        headingLevel,
        isBullet,
      });
    }
  }

  return paragraphs;
}

/**
 * Converts a Word document (.docx) to a PDF using client-side layout reconstruction and pdf-lib.
 */
export async function convertDocxToPdf(
  docxData: ArrayBuffer | Uint8Array
): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(docxData);
  const docXmlFile = zip.file("word/document.xml");

  if (!docXmlFile) {
    throw new Error("Invalid DOCX file: word/document.xml entry not found.");
  }

  const xmlString = await docXmlFile.async("string");
  const paragraphs = parseDocxXml(xmlString);

  if (paragraphs.length === 0) {
    throw new Error("The DOCX document does not contain readable text.");
  }

  const pdfDoc = await PDFDocument.create();

  // Standard fonts
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const fontBoldItalic = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);

  function getFont(bold: boolean, italic: boolean): PDFFont {
    if (bold && italic) return fontBoldItalic;
    if (bold) return fontBold;
    if (italic) return fontItalic;
    return fontRegular;
  }

  // Standard Letter page dimensions (points)
  const pageWidth = 612;
  const pageHeight = 792;
  const marginLeft = 54;
  const marginRight = 54;
  const marginTop = 54;
  const marginBottom = 54;
  const contentWidth = pageWidth - marginLeft - marginRight;

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let currentY = pageHeight - marginTop;

  function ensurePageSpace(requiredHeight: number) {
    if (currentY - requiredHeight < marginBottom) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      currentY = pageHeight - marginTop;
    }
  }

  for (const para of paragraphs) {
    const bulletPrefix = para.isBullet ? "• " : "";
    const indent = para.isBullet ? 18 : 0;
    const availableWidth = contentWidth - indent;

    // Gather words and runs for word-wrapping
    interface LayoutWord {
      word: string;
      bold: boolean;
      italic: boolean;
      fontSize: number;
      width: number;
    }

    const words: LayoutWord[] = [];

    if (bulletPrefix) {
      const bFont = fontRegular;
      const bSize = para.runs[0]?.fontSize || 11;
      words.push({
        word: bulletPrefix,
        bold: false,
        italic: false,
        fontSize: bSize,
        width: bFont.widthOfTextAtSize(bulletPrefix, bSize),
      });
    }

    for (const run of para.runs) {
      const font = getFont(run.bold, run.italic);
      const splitWords = run.text.split(/(\s+)/);

      for (const w of splitWords) {
        if (!w) continue;
        const width = font.widthOfTextAtSize(w, run.fontSize);
        words.push({
          word: w,
          bold: run.bold,
          italic: run.italic,
          fontSize: run.fontSize,
          width,
        });
      }
    }

    // Wrap lines
    interface LineRun {
      text: string;
      font: PDFFont;
      fontSize: number;
      width: number;
    }
    interface Line {
      runs: LineRun[];
      height: number;
    }

    const lines: Line[] = [];
    let currentLineRuns: LineRun[] = [];
    let currentLineWidth = 0;
    let currentLineHeight = 14;

    for (const item of words) {
      const font = getFont(item.bold, item.italic);
      const itemLineHeight = item.fontSize * 1.35;

      if (currentLineWidth + item.width > availableWidth && currentLineRuns.length > 0) {
        // Push line and wrap
        lines.push({ runs: currentLineRuns, height: currentLineHeight });
        currentLineRuns = [];
        currentLineWidth = 0;
        currentLineHeight = 14;
      }

      currentLineRuns.push({
        text: item.word,
        font,
        fontSize: item.fontSize,
        width: item.width,
      });
      currentLineWidth += item.width;
      if (itemLineHeight > currentLineHeight) {
        currentLineHeight = itemLineHeight;
      }
    }

    if (currentLineRuns.length > 0) {
      lines.push({ runs: currentLineRuns, height: currentLineHeight });
    }

    // Render lines to PDF
    for (const line of lines) {
      ensurePageSpace(line.height);

      let drawX = marginLeft + indent;
      currentY -= line.height;

      for (const r of line.runs) {
        currentPage.drawText(r.text, {
          x: drawX,
          y: currentY,
          size: r.fontSize,
          font: r.font,
          color: rgb(0.1, 0.1, 0.1),
        });
        drawX += r.width;
      }
    }

    // Extra spacing between paragraphs
    const paraSpacing = para.isHeading ? 10 : 6;
    currentY -= paraSpacing;
  }

  return await pdfDoc.save({ useObjectStreams: true });
}
