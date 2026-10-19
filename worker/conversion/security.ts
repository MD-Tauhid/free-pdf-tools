import { timingSafeEqual } from "node:crypto";

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const MAX_ARCHIVE_ENTRIES = 5_000;
const MAX_EXPANDED_BYTES = 100 * 1024 * 1024;
const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_FILE_SIGNATURE = 0x02014b50;
const LOCAL_FILE_SIGNATURE = 0x04034b50;

export class ConversionRequestError extends Error {
  readonly statusCode: number;

  constructor(
    message: string,
    statusCode: number
  ) {
    super(message);
    this.name = "ConversionRequestError";
    this.statusCode = statusCode;
  }
}

export function hasValidWorkerToken(
  authorization: string | undefined,
  expectedToken: string
): boolean {
  if (!authorization?.startsWith("Bearer ")) return false;
  const provided = Buffer.from(authorization.slice(7));
  const expected = Buffer.from(expectedToken);
  return (
    provided.length === expected.length &&
    timingSafeEqual(provided, expected)
  );
}

export function validateDocxArchive(bytes: Buffer): void {
  if (bytes.length < 22 || bytes.length > MAX_UPLOAD_BYTES) {
    throw new ConversionRequestError(
      "The DOCX file is empty or exceeds the 20 MB upload limit.",
      bytes.length > MAX_UPLOAD_BYTES ? 413 : 400
    );
  }

  const firstSignature = bytes.readUInt32LE(0);
  if (firstSignature !== LOCAL_FILE_SIGNATURE) {
    throw new ConversionRequestError("The uploaded file is not a valid DOCX archive.", 400);
  }

  const minEocdOffset = Math.max(0, bytes.length - 22 - 0xffff);
  let eocdOffset = -1;
  for (let offset = bytes.length - 22; offset >= minEocdOffset; offset -= 1) {
    if (
      bytes.readUInt32LE(offset) === EOCD_SIGNATURE &&
      offset + 22 + bytes.readUInt16LE(offset + 20) === bytes.length
    ) {
      eocdOffset = offset;
      break;
    }
  }
  if (eocdOffset < 0) {
    throw new ConversionRequestError("The DOCX archive directory is invalid.", 400);
  }

  const diskNumber = bytes.readUInt16LE(eocdOffset + 4);
  const directoryDisk = bytes.readUInt16LE(eocdOffset + 6);
  const entriesOnDisk = bytes.readUInt16LE(eocdOffset + 8);
  const entryCount = bytes.readUInt16LE(eocdOffset + 10);
  const directorySize = bytes.readUInt32LE(eocdOffset + 12);
  const directoryOffset = bytes.readUInt32LE(eocdOffset + 16);
  if (
    diskNumber !== 0 ||
    directoryDisk !== 0 ||
    entriesOnDisk !== entryCount ||
    entryCount === 0xffff ||
    directorySize === 0xffffffff ||
    directoryOffset === 0xffffffff ||
    entryCount < 2 ||
    entryCount > MAX_ARCHIVE_ENTRIES ||
    directoryOffset + directorySize !== eocdOffset
  ) {
    throw new ConversionRequestError(
      "The DOCX archive uses an unsupported or invalid ZIP layout.",
      400
    );
  }

  const names = new Set<string>();
  let expandedBytes = 0;
  let cursor = directoryOffset;
  for (let index = 0; index < entryCount; index += 1) {
    if (
      cursor + 46 > eocdOffset ||
      bytes.readUInt32LE(cursor) !== CENTRAL_FILE_SIGNATURE
    ) {
      throw new ConversionRequestError("The DOCX archive directory is malformed.", 400);
    }

    const flags = bytes.readUInt16LE(cursor + 8);
    const compressionMethod = bytes.readUInt16LE(cursor + 10);
    const compressedSize = bytes.readUInt32LE(cursor + 20);
    const expandedSize = bytes.readUInt32LE(cursor + 24);
    const filenameLength = bytes.readUInt16LE(cursor + 28);
    const extraLength = bytes.readUInt16LE(cursor + 30);
    const commentLength = bytes.readUInt16LE(cursor + 32);
    const localHeaderOffset = bytes.readUInt32LE(cursor + 42);
    const recordEnd =
      cursor + 46 + filenameLength + extraLength + commentLength;

    if (
      filenameLength === 0 ||
      recordEnd > eocdOffset ||
      localHeaderOffset + 30 > directoryOffset ||
      bytes.readUInt32LE(localHeaderOffset) !== LOCAL_FILE_SIGNATURE ||
      (flags & 0x1) !== 0 ||
      (compressionMethod !== 0 && compressionMethod !== 8) ||
      compressedSize === 0xffffffff ||
      expandedSize === 0xffffffff
    ) {
      throw new ConversionRequestError(
        "The DOCX archive contains an invalid, encrypted, or unsupported entry.",
        400
      );
    }

    const filename = bytes
      .subarray(cursor + 46, cursor + 46 + filenameLength)
      .toString("utf8");
    const localFilenameLength = bytes.readUInt16LE(localHeaderOffset + 26);
    const localExtraLength = bytes.readUInt16LE(localHeaderOffset + 28);
    const localDataOffset =
      localHeaderOffset + 30 + localFilenameLength + localExtraLength;
    const localFilename = bytes
      .subarray(localHeaderOffset + 30, localDataOffset)
      .toString("utf8");
    const normalizedName = filename.replace(/\\/g, "/");

    if (
      normalizedName.startsWith("/") ||
      /^[a-z]:/i.test(normalizedName) ||
      normalizedName.split("/").some((part) => part === "..") ||
      filename.includes("\0") ||
      localFilename !== filename ||
      localDataOffset + compressedSize > directoryOffset ||
      names.has(filename)
    ) {
      throw new ConversionRequestError(
        "The DOCX archive contains an unsafe or inconsistent file path.",
        400
      );
    }
    if (/vbaProject\.bin$/i.test(filename)) {
      throw new ConversionRequestError(
        "Macro-enabled Office documents are not supported.",
        415
      );
    }

    if (expandedSize > MAX_EXPANDED_BYTES - expandedBytes) {
      throw new ConversionRequestError(
        "The DOCX archive expands beyond the 100 MB processing limit.",
        413
      );
    }
    expandedBytes += expandedSize;
    if (
      expandedSize > 1024 * 1024 &&
      compressedSize > 0 &&
      expandedSize / compressedSize > 200
    ) {
      throw new ConversionRequestError(
        "The DOCX archive has an unsafe compression ratio.",
        413
      );
    }
    names.add(filename);
    cursor = recordEnd;
  }

  if (
    cursor !== eocdOffset ||
    !names.has("[Content_Types].xml") ||
    !names.has("word/document.xml")
  ) {
    throw new ConversionRequestError(
      "The archive is not a valid Word DOCX document.",
      400
    );
  }
}
