FROM node:22-bookworm-slim AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV PORT=80
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

COPY --from=builder --chown=node:node /app/dist ./dist
USER node

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 80) + '/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "/app/dist/server.js"]
