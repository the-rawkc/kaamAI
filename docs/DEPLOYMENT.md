# KaamAI Deployment Guide: Free Dev Server & Local Ollama

KaamAI supports two zero-cost deployment modes:

1. **Local Mode (Offline / Zero API Cost)**: Runs completely on your machine using **Ollama** (`llama3.2` and `embeddinggemma`).
2. **Free Dev Server Mode**: Runs on free cloud platforms (Render, Railway, Fly.io, GitHub Codespaces) using a **free Google Gemini API key** (no credit card required). Free cloud servers typically have 512MB–1GB RAM and cannot run Ollama, so the free Gemini API provides blazing-fast AI inference without any cloud compute costs.

---

## 1. Dual AI Engine Setup

The server automatically detects which AI provider to use:

```mermaid
flowchart TD
    Config["Environment Configuration (.env)"]
    Config -->|"AI_PROVIDER=ollama"| OllamaEngine["Local Ollama Engine\n(llama3.2 + embeddinggemma)\nRuns on localhost:11434"]
    Config -->|"AI_PROVIDER=gemini"| GeminiEngine["Free Google Gemini API\n(gemini-2.5-flash + text-embedding-004)\nFree Tier from AI Studio"]
    Config -->|"Auto-Detect"| Check{"GEMINI_API_KEY Set?"}
    Check -->|"Yes"| GeminiEngine
    Check -->|"No"| OllamaEngine
```

---

## 2. Option A: Running Locally with Ollama (Zero Cost, Offline)

### Step 1: Ensure Ollama and Models are Ready

```powershell
ollama pull llama3.2
ollama pull embeddinggemma
```

### Step 2: Configure `.env`

```ini
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_CHAT_MODEL=llama3.2
OLLAMA_EMBEDDING_MODEL=embeddinggemma
```

### Step 3: Run the Development Server

```powershell
# Starts PostgreSQL, Express backend (port 4000), and Vite frontend (port 5173)
npm run dev
```

---

## 3. Option B: Running on a Free Cloud Dev Server with a Free API Key

### Step 1: Get Your Free Gemini API Key (30 Seconds, No Credit Card)

1. Go to [Google AI Studio](https://aistudio.google.com).
2. Sign in with any free Google account.
3. Click **Get API key** -> **Create API key**.
4. Copy your key. (The free tier includes 15 requests per minute and 1,500 requests per day at \$0 cost).

### Step 2: Get Free PostgreSQL (Optional for Cloud Hosting)

Free cloud PostgreSQL databases that work with KaamAI:

- **Neon.tech** (Free serverless Postgres with pgvector)
- **Supabase** (Free Postgres tier)
- **Render** / **Railway** (Included free starter database)

### Step 3: Deploy to a Free Dev Host (Render / Railway / Glitch)

Set the following environment variables in your cloud dashboard:

```ini
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://user:password@free-db-host:5432/kaamai?sslmode=require
SESSION_SECRET=a_random_secret_string_at_least_32_characters_long
AI_PROVIDER=gemini
GEMINI_API_KEY=AIzaSy...your_free_key_here
GEMINI_CHAT_MODEL=gemini-2.5-flash
GEMINI_EMBEDDING_MODEL=text-embedding-004
```

Build and start commands:

- **Build command**: `npm run build`
- **Start command**: `npm run db:migrate && npm start`

---

## 4. Option C: Production Docker Compose

For deploying on a VPS (DigitalOcean, Hetzner, AWS, or local Docker):

```bash
cp .env.production.example .env.production
# Edit .env.production with your secrets
docker compose -f infra/docker-compose.yml --env-file .env.production up -d --build
```

---

## 5. Automated Backups & Restore

- **Run backup (PowerShell)**: `.\infra\backup-db.ps1`
- **Run backup (Linux/Bash)**: `./infra/backup-db.sh`
- Backups are stored in `backups/kaamai_backup_YYYYMMDD_HHMMSS.sql` with automatic 7-day retention.
