# Multi-stage production build for KaamAI API server
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root workspace and server manifests
COPY package.json package-lock.json ./
COPY apps/server/package.json ./apps/server/

RUN npm ci --workspace apps/server

# Copy server source code and tsconfig
COPY apps/server ./apps/server

# Build TypeScript and copy SQL migrations
RUN npm run build --workspace apps/server

# Production runner stage
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy root package and install production dependencies only
COPY package.json package-lock.json ./
COPY apps/server/package.json ./apps/server/
RUN npm ci --workspace apps/server --omit=dev

# Copy compiled artifacts from builder
COPY --from=builder /app/apps/server/dist ./apps/server/dist

# Create uploads directory with non-root ownership
RUN mkdir -p /app/data/uploads && chown -R node:node /app

USER node
WORKDIR /app/apps/server

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:4000/api/health || exit 1

CMD ["node", "dist/index.js"]
