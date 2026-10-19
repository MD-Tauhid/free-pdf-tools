import assert from "node:assert/strict";
import {
  ConversionRequestError,
  hasValidWorkerToken,
  validateDocxArchive,
} from "../worker/conversion/security.ts";
import { POST as convert } from "../src/app/api/convert/route.ts";

function createZip(entries) {
  const localRecords = [];
  const centralRecords = [];
  let localOffset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name);
    const data = entry.data ?? Buffer.from("x");
    const expandedSize = entry.expandedSize ?? data.length;
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(expandedSize, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localHeader.writeUInt16LE(0, 28);
    localRecords.push(localHeader, name, data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt32LE(data.length, 20);
    centralHeader.writeUInt32LE(expandedSize, 24);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt32LE(localOffset, 42);
    centralRecords.push(centralHeader, name);
    localOffset += localHeader.length + name.length + data.length;
  }

  const centralDirectory = Buffer.concat(centralRecords);
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(entries.length, 8);
  endRecord.writeUInt16LE(entries.length, 10);
  endRecord.writeUInt32LE(centralDirectory.length, 12);
  endRecord.writeUInt32LE(localOffset, 16);
  return Buffer.concat([...localRecords, centralDirectory, endRecord]);
}

const validEntries = [
  { name: "[Content_Types].xml", data: Buffer.from("<types/>") },
  { name: "word/document.xml", data: Buffer.from("<document/>") },
];

validateDocxArchive(createZip(validEntries));
assert.equal(
  hasValidWorkerToken(
    "Bearer abcdef0123456789abcdef0123456789",
    "abcdef0123456789abcdef0123456789"
  ),
  true
);
assert.equal(hasValidWorkerToken("Bearer wrong", "expected-token"), false);
assert.equal(hasValidWorkerToken(undefined, "expected-token"), false);
console.log("✓ Valid DOCX archives and worker bearer tokens are accepted");

for (const invalid of [
  {
    archive: Buffer.from("not a zip"),
    status: 400,
    message: /empty or exceeds/,
  },
  {
    archive: createZip([
      ...validEntries,
      { name: "word/../../outside.xml", data: Buffer.from("bad") },
    ]),
    status: 400,
    message: /unsafe or inconsistent/,
  },
  {
    archive: createZip([
      ...validEntries,
      { name: "word/vbaProject.bin", data: Buffer.from("macro") },
    ]),
    status: 415,
    message: /Macro-enabled/,
  },
  {
    archive: createZip([
      ...validEntries,
      {
        name: "word/large.xml",
        data: Buffer.from("x"),
        expandedSize: 101 * 1024 * 1024,
      },
    ]),
    status: 413,
    message: /100 MB processing limit/,
  },
]) {
  assert.throws(
    () => validateDocxArchive(invalid.archive),
    (error) =>
      error instanceof ConversionRequestError &&
      error.statusCode === invalid.status &&
      invalid.message.test(error.message)
  );
}
console.log("✓ Invalid, path-traversing, macro-enabled, and oversized archives are rejected");

const uploadHeaders = {
  "content-type":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "x-file-name": "notes%20and%20plan.docx",
};
const wrongType = await convert(
  new Request("http://localhost/api/convert", {
    method: "POST",
    headers: { ...uploadHeaders, "content-type": "application/pdf" },
    body: "file",
  })
);
assert.equal(wrongType.status, 415);

const tooLarge = await convert(
  new Request("http://localhost/api/convert", {
    method: "POST",
    headers: { ...uploadHeaders, "content-length": String(21 * 1024 * 1024) },
    body: "x",
  })
);
assert.equal(tooLarge.status, 413);

const originalFetch = globalThis.fetch;
const originalWorkerUrl = process.env.CONVERSION_WORKER_URL;
const originalWorkerToken = process.env.CONVERSION_WORKER_TOKEN;
process.env.CONVERSION_WORKER_URL = "http://conversion-worker:8080";
process.env.CONVERSION_WORKER_TOKEN = "a".repeat(64);
try {
  let oversizedResponse = false;
  globalThis.fetch = async (url, init) => {
    assert.equal(String(url), "http://conversion-worker:8080/convert");
    assert.equal(new Headers(init.headers).get("authorization"), `Bearer ${"a".repeat(64)}`);
    if (oversizedResponse) {
      return new Response(Buffer.from("%PDF-1.7\nconverted"), {
        status: 200,
        headers: {
          "content-type": "application/pdf",
          "content-length": String(101 * 1024 * 1024),
        },
      });
    }
    return new Response(Buffer.from("%PDF-1.7\nconverted"), {
      status: 200,
      headers: { "content-type": "application/pdf" },
    });
  };
  const response = await convert(
    new Request("http://localhost/api/convert", {
      method: "POST",
      headers: uploadHeaders,
      body: createZip(validEntries),
    })
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-download-filename"), "notes and plan.pdf");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.match(await response.text(), /^%PDF-/);

  oversizedResponse = true;
  const originalConsoleError = console.error;
  let oversizedPdf;
  try {
    console.error = (message, ...details) => {
      if (message !== "Failed to read the conversion worker PDF response:") {
        originalConsoleError(message, ...details);
      }
    };
    oversizedPdf = await convert(
      new Request("http://localhost/api/convert", {
        method: "POST",
        headers: uploadHeaders,
        body: createZip(validEntries),
      })
    );
  } finally {
    console.error = originalConsoleError;
  }
  assert.equal(oversizedPdf.status, 502);

  let signalTwoWorkers;
  const twoWorkersStarted = new Promise((resolve) => {
    signalTwoWorkers = resolve;
  });
  const completeWorkers = [];
  let startedWorkers = 0;
  globalThis.fetch = () => {
    return new Promise((resolve) => {
      completeWorkers.push(resolve);
      startedWorkers += 1;
      if (startedWorkers === 2) signalTwoWorkers();
    });
  };
  const firstInFlight = convert(
    new Request("http://localhost/api/convert", {
      method: "POST",
      headers: uploadHeaders,
      body: createZip(validEntries),
    })
  );
  const secondInFlight = convert(
    new Request("http://localhost/api/convert", {
      method: "POST",
      headers: uploadHeaders,
      body: createZip(validEntries),
    })
  );
  await twoWorkersStarted;
  const busy = await convert(
    new Request("http://localhost/api/convert", {
      method: "POST",
      headers: uploadHeaders,
      body: createZip(validEntries),
    })
  );
  assert.equal(busy.status, 503);
  assert.equal(busy.headers.get("retry-after"), "5");
  for (const completeWorker of completeWorkers) {
    completeWorker(
      new Response(Buffer.from("%PDF-1.7\nconverted"), {
        status: 200,
        headers: { "content-type": "application/pdf" },
      })
    );
  }
  assert.equal((await firstInFlight).status, 200);
  assert.equal((await secondInFlight).status, 200);
} finally {
  globalThis.fetch = originalFetch;
  if (originalWorkerUrl === undefined) delete process.env.CONVERSION_WORKER_URL;
  else process.env.CONVERSION_WORKER_URL = originalWorkerUrl;
  if (originalWorkerToken === undefined) delete process.env.CONVERSION_WORKER_TOKEN;
  else process.env.CONVERSION_WORKER_TOKEN = originalWorkerToken;
}
console.log("✓ API route enforces upload limits and proxies a sanitized PDF response");
