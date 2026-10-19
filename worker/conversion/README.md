# DOCX-to-PDF conversion worker

This isolated Node.js service converts `.docx` files with LibreOffice Writer. It accepts only authenticated raw DOCX uploads and returns a PDF; it does not expose an upload directory or persist jobs.

## Build and run

Build from the repository root so Docker can use the root lockfile:

```powershell
docker build -f worker/conversion/Dockerfile -t free-pdf-conversion-worker .
```

Run the worker on a private application network and do not publish its port to the public internet. Set the same random token as `WORKER_API_TOKEN` on the worker and `CONVERSION_WORKER_TOKEN` on the Next.js application. Configure `CONVERSION_WORKER_URL` on the application with the worker's private base URL (for example `http://conversion-worker:8080`).

Generate a token with `openssl rand -hex 32`. Use TLS for any network hop that crosses an untrusted network. Prefer a private network with no outbound internet access for the worker; LibreOffice processes untrusted Office files.

## Limits and cleanup

- Request body: 20 MiB maximum.
- Expanded DOCX archive: 100 MiB maximum; ZIP64, encrypted entries, macros, unsafe paths, and extreme compression ratios are rejected.
- Concurrent conversions: 2 per worker process.
- LibreOffice execution: 30-second timeout.
- PDF response: 100 MiB maximum.
- Each job uses a unique mode-restricted temporary directory, removed on success or failure.

Deploy behind an ingress that applies request-rate limits and TLS. The worker's `/health` endpoint is intended for private container health checks; `/convert` requires a bearer token. The worker container runs as the unprivileged `node` user. Apply container CPU and memory limits, do not mount persistent volumes into its temporary directory, and keep it off public networks.

The UI explains that Word-to-PDF uploads leave the browser for processing. Other PDF tools continue using their existing client-side processing paths.
