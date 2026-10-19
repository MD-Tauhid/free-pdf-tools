export const maxDuration = 40;

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MAX_ACTIVE_REQUESTS = 2;
let activeRequests = 0;

class UploadError extends Error {
  readonly status: number;

  constructor(
    message: string,
    status: number
  ) {
    super(message);
    this.status = status;
  }
}

async function readLimitedBody(
  request: Request
): Promise<Uint8Array<ArrayBuffer>> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null) {
    const size = Number(declaredLength);
    if (!Number.isSafeInteger(size) || size < 0) {
      throw new UploadError("Invalid Content-Length header.", 400);
    }
    if (size > MAX_UPLOAD_BYTES) {
      throw new UploadError("DOCX uploads are limited to 20 MB.", 413);
    }
  }
  if (!request.body) throw new UploadError("The DOCX file is empty.", 400);

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_UPLOAD_BYTES) {
        await reader.cancel();
        throw new UploadError("DOCX uploads are limited to 20 MB.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  if (totalBytes === 0) throw new UploadError("The DOCX file is empty.", 400);
  const bytes = new Uint8Array(new ArrayBuffer(totalBytes));
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

async function readLimitedPdf(response: Response): Promise<Uint8Array<ArrayBuffer>> {
  const maxBytes = 100 * 1024 * 1024;
  const declaredLength = response.headers.get("content-length");
  if (declaredLength !== null && Number(declaredLength) > maxBytes) {
    await response.body?.cancel();
    throw new Error("The conversion service returned an oversized PDF.");
  }
  if (!response.body) {
    throw new Error("The conversion service returned an empty response.");
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new Error("The conversion service returned an oversized PDF.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(new ArrayBuffer(totalBytes));
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function getDownloadFilename(value: string | null): string {
  let decoded: string;
  try {
    decoded = value ? decodeURIComponent(value) : "";
  } catch {
    throw new UploadError("Choose a valid .docx file.", 400);
  }
  const filename = decoded.replace(/\\/g, "/").split("/").pop() ?? "";
  if (
    filename.length > 255 ||
    !filename.toLowerCase().endsWith(".docx") ||
    /[\r\n\0]/.test(filename)
  ) {
    throw new UploadError("Choose a valid .docx file.", 400);
  }
  const stem = filename
    .slice(0, -5)
    .replace(/[^A-Za-z0-9._ -]/g, "_")
    .trim()
    .replace(/[. ]+$/g, "")
    .slice(0, 100);
  return `${stem || "converted-document"}.pdf`;
}

function jsonError(
  message: string,
  status: number,
  headers: Record<string, string> = {}
): Response {
  return Response.json(
    { error: message },
    {
      status,
      headers: {
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
        ...headers,
      },
    }
  );
}

async function convertRequest(request: Request): Promise<Response> {
  let filename: string;
  let bytes: Uint8Array<ArrayBuffer>;
  try {
    filename = getDownloadFilename(request.headers.get("x-file-name"));
    if (request.headers.get("content-type")?.split(";")[0].trim() !== DOCX_MIME) {
      throw new UploadError("Upload a DOCX document.", 415);
    }
    bytes = await readLimitedBody(request);
  } catch (error: unknown) {
    if (error instanceof UploadError) {
      return jsonError(error.message, error.status);
    }
    console.error("Failed to read DOCX upload:", error);
    return jsonError("The DOCX upload could not be read.", 400);
  }

  const workerUrl = process.env.CONVERSION_WORKER_URL;
  const workerToken = process.env.CONVERSION_WORKER_TOKEN;
  if (!workerUrl) {
    console.error("CONVERSION_WORKER_URL is not configured.");
    return jsonError(
      "Word-to-PDF conversion is not configured: set CONVERSION_WORKER_URL and deploy the conversion worker.",
      503
    );
  }
  if (!workerToken || workerToken.length < 32) {
    console.error("CONVERSION_WORKER_TOKEN is missing or too short.");
    return jsonError(
      "Word-to-PDF conversion credentials are not configured. Set a worker token of at least 32 characters.",
      503
    );
  }

  let endpoint: URL;
  try {
    endpoint = new URL("/convert", workerUrl);
    if (
      !["http:", "https:"].includes(endpoint.protocol) ||
      endpoint.username ||
      endpoint.password
    ) {
      throw new Error("Invalid conversion worker URL.");
    }
  } catch (error: unknown) {
    console.error("Invalid CONVERSION_WORKER_URL configuration:", error);
    return jsonError("Word-to-PDF conversion is temporarily unavailable.", 503);
  }

  let workerResponse: Response;
  try {
    workerResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${workerToken}`,
        "content-type": DOCX_MIME,
      },
      body: bytes,
      cache: "no-store",
      signal: AbortSignal.timeout(35_000),
    });
  } catch (error: unknown) {
    const timedOut =
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError");
    if (timedOut) {
      return jsonError("Conversion timed out. Try a smaller or simpler document.", 504);
    }
    console.error("Conversion worker request failed:", error);
    return jsonError(
      "The conversion worker could not be reached. Check that it is running and CONVERSION_WORKER_URL is correct.",
      502
    );
  }

  if (!workerResponse.ok) {
    let message = "The DOCX document could not be converted.";
    try {
      const payload: unknown = await workerResponse.json();
      if (
        typeof payload === "object" &&
        payload !== null &&
        "error" in payload &&
        typeof payload.error === "string"
      ) {
        message = payload.error;
      }
    } catch (error: unknown) {
      console.error("Conversion worker returned an unreadable error response:", error);
    }
    const status =
      workerResponse.status >= 400 && workerResponse.status <= 599
        ? workerResponse.status
        : 502;
    if (status === 401) {
      console.error("Conversion worker rejected the configured bearer token.");
      return jsonError(
        "The conversion worker rejected its configured token. Ensure WORKER_API_TOKEN and CONVERSION_WORKER_TOKEN match.",
        502
      );
    }
    return jsonError(message, status);
  }

  let output: Uint8Array<ArrayBuffer>;
  try {
    output = await readLimitedPdf(workerResponse);
  } catch (error: unknown) {
    console.error("Failed to read the conversion worker PDF response:", error);
    return jsonError("The conversion service returned an invalid or oversized PDF.", 502);
  }
  if (
    output.byteLength === 0 ||
    new TextDecoder().decode(output.subarray(0, 5)) !== "%PDF-"
  ) {
    console.error("Conversion worker returned an invalid or oversized PDF.");
    return jsonError("The conversion service returned an invalid PDF.", 502);
  }

  return new Response(output, {
    headers: {
      "content-type": "application/pdf",
      "content-length": String(output.byteLength),
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "x-download-filename": filename,
    },
  });
}

export async function POST(request: Request): Promise<Response> {
  if (activeRequests >= MAX_ACTIVE_REQUESTS) {
    return jsonError("Conversion is busy. Try again shortly.", 503, {
      "retry-after": "5",
    });
  }
  activeRequests += 1;
  try {
    return await convertRequest(request);
  } finally {
    activeRequests -= 1;
  }
}
