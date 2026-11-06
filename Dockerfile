# ── Stage 1: install production deps ─────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --omit=dev --legacy-peer-deps

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

# sharp (image processing) needs libvips
RUN apk add --no-cache vips

WORKDIR /app

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Production node_modules
COPY --from=deps /app/node_modules ./node_modules

# Application source
COPY . .

# Persist uploaded files via Docker volume
RUN mkdir -p uploads && chown -R appuser:appgroup /app

USER appuser

EXPOSE 1000
ENV NODE_ENV=production

CMD ["node", "server.js"]
