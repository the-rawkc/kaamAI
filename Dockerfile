# ==========================================
# Stage 1: Build React/Vite Frontend
# ==========================================
FROM node:22-alpine AS frontend-builder

WORKDIR /app/apps/web

COPY apps/web/package*.json ./
RUN npm ci

COPY apps/web ./
RUN npm run build

# ==========================================
# Stage 2: Python FastAPI Runner
# ==========================================
FROM python:3.13-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend ./backend
COPY run_backend.py .
COPY --from=frontend-builder /app/apps/web/dist ./apps/web/dist

ENV PYTHONUNBUFFERED=1
ENV PORT=10000
EXPOSE 10000

HEALTHCHECK --interval=20s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT:-10000}/api/health || exit 1

CMD ["python", "run_backend.py"]
