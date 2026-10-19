export const FILE_LIMITS = {
  /** Maximum file size for client-side processing: 50 MB */
  MAX_FILE_SIZE_BYTES: 50 * 1024 * 1024,
  MAX_FILE_SIZE_MB: 50,

  /** Maximum recommended pages for browser performance */
  MAX_RECOMMENDED_PAGES: 200,

  /** Allowed MIME types */
  ALLOWED_MIME_TYPES: ["application/pdf"] as const,

  /** Allowed file extensions */
  ALLOWED_EXTENSIONS: [".pdf"] as const,

  /** PDF Magic Bytes: %PDF- (Hex: 25 50 44 46 2D) */
  PDF_MAGIC_BYTES: [0x25, 0x50, 0x44, 0x46, 0x2d] as const,
};
