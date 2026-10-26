import { spawn } from "node:child_process";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  ConversionRequestError,
  hasValidWorkerToken,
  MAX_UPLOAD_BYTES,
  validateDocxArchive,
} from "./security";

const PORT = Number(process.env.PORT ?? 8080);
const MAX_OUTPUT_BYTES = 100 * 1024 * 1024;
const CONVERSION_TIMEOUT_MS = 30_000;
const MAX_CONCURRENT_JOBS = 2;
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const WORKER_API_TOKEN = process.env.WORKER_API_TOKEN ?? "";

let activeJobs = 0;

function sendJson(
  response: ServerResponse,
  statusCode: number,
  message: string,
  headers: Record<string, string> = {}
): void {
  const body = JSON.stringify({ error: message });
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    ...headers,
  });
  response.end(body);
}

async function readRequestBody(request: IncomingMessage): Promise<Buffer> {
  const contentLength = request.headers["content-length"];
  if (contentLength !== undefined) {
    const size = Number(contentLength);
    if (!Number.isSafeInteger(size) || size < 0) {
      throw new ConversionRequestError("Invalid Content-Length header.", 400);
    }
    if (size > MAX_UPLOAD_BYTES) {
      throw new ConversionRequestError("DOCX uploads are limited to 20 MB.", 413);
    }
  }

  const chunks: Buffer[] = [];
  let totalBytes = 0;
  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += bytes.length;
    if (totalBytes > MAX_UPLOAD_BYTES) {
      throw new ConversionRequestError("DOCX uploads are limited to 20 MB.", 413);
    }
    chunks.push(bytes);
  }
  return Buffer.concat(chunks, totalBytes);
}

function runLibreOffice(inputPath: string, outputDirectory: string, profile: string) {
  return new Promise<void>((resolve, reject) => {
    const libreOfficeBin =
      process.env.LIBREOFFICE_PATH ||
      (process.platform === "win32" ? "soffice" : "libreoffice");

    const child = spawn(
      libreOfficeBin,
      [
        "--headless",
        "--nologo",
        "--nodefault",
        "--nofirststartwizard",
        `-env:UserInstallation=${pathToFileURL(profile).href}`,
        "--convert-to",
        "pdf:writer_pdf_Export",
        "--outdir",
        outputDirectory,
        inputPath,
      ],
      {
        stdio: "ignore",
        env: {
          ...process.env,
          HOME: profile,
          XDG_CACHE_HOME: profile,
          XDG_CONFIG_HOME: profile,
        },
      }
    );

    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve();
    };

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(new ConversionRequestError("Conversion exceeded the 30-second time limit.", 504));
    }, CONVERSION_TIMEOUT_MS);

    child.once("error", (error) => {
      const errorCode = (error as NodeJS.ErrnoException).code;
      finish(
        new ConversionRequestError(
          errorCode === "ENOENT"
            ? "The conversion engine is unavailable."
            : "The document conversion process could not be started.",
          500
        )
      );
    });
    child.once("close", (code) => {
      if (code === 0) finish();
      else finish(new ConversionRequestError("LibreOffice could not convert this document.", 422));
    });
  });
}

async function handleConversion(
  request: IncomingMessage,
  response: ServerResponse
): Promise<void> {
  if (WORKER_API_TOKEN.length < 32) {
    console.error("WORKER_API_TOKEN must contain at least 32 characters.");
    sendJson(response, 503, "The conversion worker is not configured.");
    return;
  }
  if (!hasValidWorkerToken(request.headers.authorization, WORKER_API_TOKEN)) {
    sendJson(response, 401, "Unauthorized.");
    return;
  }
  if (request.headers["content-type"]?.split(";")[0].trim() !== DOCX_MIME) {
    sendJson(response, 415, "Upload a DOCX document.");
    return;
  }
  if (activeJobs >= MAX_CONCURRENT_JOBS) {
    sendJson(response, 503, "The conversion worker is busy. Try again shortly.", {
      "retry-after": "5",
    });
    return;
  }

  activeJobs += 1;
  let temporaryDirectory: string | undefined;
  try {
    const bytes = await readRequestBody(request);
    validateDocxArchive(bytes);

    temporaryDirectory = await mkdtemp(join(tmpdir(), "free-pdf-convert-"));
    const inputDirectory = join(temporaryDirectory, "input");
    const outputDirectory = join(temporaryDirectory, "output");
    const profileDirectory = join(temporaryDirectory, "profile");
    await Promise.all([
      mkdir(inputDirectory, { mode: 0o700 }),
      mkdir(outputDirectory, { mode: 0o700 }),
      mkdir(profileDirectory, { mode: 0o700 }),
    ]);

    const inputPath = join(inputDirectory, "document.docx");
    const outputPath = join(outputDirectory, "document.pdf");
    await writeFile(inputPath, bytes, { flag: "wx", mode: 0o600 });
    await runLibreOffice(inputPath, outputDirectory, profileDirectory);

    let outputStats: Awaited<ReturnType<typeof stat>>;
    try {
      outputStats = await stat(outputPath);
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        throw new ConversionRequestError(
          "LibreOffice did not produce a PDF for this document.",
          422
        );
      }
      throw error;
    }
    if (outputStats.size === 0 || outputStats.size > MAX_OUTPUT_BYTES) {
      throw new ConversionRequestError(
        "The converted PDF is empty or exceeds the 100 MB output limit.",
        outputStats.size > MAX_OUTPUT_BYTES ? 413 : 422
      );
    }
    const pdf = await readFile(outputPath);
    if (pdf.subarray(0, 5).toString("ascii") !== "%PDF-") {
      throw new ConversionRequestError(
        "The conversion engine did not produce a valid PDF.",
        422
      );
    }

    response.writeHead(200, {
      "content-type": "application/pdf",
      "content-length": pdf.length,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    });
    response.end(pdf);
  } catch (error: unknown) {
    if (response.headersSent) {
      response.destroy(error instanceof Error ? error : undefined);
      return;
    }
    if (error instanceof ConversionRequestError) {
      sendJson(response, error.statusCode, error.message);
    } else {
      console.error("DOCX conversion failed:", error);
      sendJson(response, 500, "The document could not be converted.");
    }
  } finally {
    activeJobs -= 1;
    if (temporaryDirectory) {
      try {
        await rm(temporaryDirectory, { recursive: true, force: true });
      } catch (error: unknown) {
        console.error("Failed to remove conversion temporary directory:", error);
      }
    }
  }
}

const server = createServer((request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    response.writeHead(200, {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    });
    response.end(JSON.stringify({ status: "ok" }));
    return;
  }
  if (request.method !== "POST" || request.url !== "/convert") {
    sendJson(response, 404, "Not found.");
    return;
  }
  void handleConversion(request, response);
});

if (WORKER_API_TOKEN.length < 32) {
  throw new Error("Set WORKER_API_TOKEN to a secret containing at least 32 characters.");
}

server.requestTimeout = 35_000;
server.headersTimeout = 10_000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`DOCX conversion worker listening on port ${PORT}.`);
});

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5_000).unref();
  });
}
