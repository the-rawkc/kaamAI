FROM python:3.13-slim

WORKDIR /app

# Install system dependencies for PostgreSQL and PDF parsing
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PORT=4000
ENV PYTHONUNBUFFERED=1
EXPOSE 4000

# Non-root user for security
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4000/api/health || exit 1

CMD ["python", "run_backend.py"]
