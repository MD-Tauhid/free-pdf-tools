FROM node:22-bookworm-slim AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY worker/conversion ./worker/conversion
RUN ./node_modules/.bin/tsc \
  --target ES2022 \
  --module commonjs \
  --moduleResolution node \
  --esModuleInterop \
  --strict \
  --skipLibCheck \
  --types node \
  --rootDir worker/conversion \
  --outDir /app/dist \
  worker/conversion/server.ts

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV PORT=8080
WORKDIR /app

RUN apt-get update \
  && apt-get install --no-install-recommends -y \
    libreoffice-writer \
    fonts-liberation \
    fonts-crosextra-caladea \
    fonts-crosextra-carlito \
  && fc-cache -f \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder --chown=node:node /app/dist ./worker/conversion
USER node

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8080/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "/app/worker/conversion/server.js"]
