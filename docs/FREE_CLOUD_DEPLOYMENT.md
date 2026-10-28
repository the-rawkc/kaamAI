# Pathway 1: 100% Free Cloud Deployment Guide

This guide details how to deploy KaamAI as a **single unified cloud web service** for **\$0/month**, requiring **no credit card**.

---

## Architecture Overview

```mermaid
flowchart TD
    Client["User Browser"] -->|"HTTPS Requests"| WebService["Render.com / Railway\n(Single Free Web Service)"]

    subgraph UnifiedService ["KaamAI Cloud Service (Port 4000)"]
        SPA["Vite / React Frontend\n(Served as Static Files)"]
        API["FastAPI Python Backend\n(/api Routes)"]
    end

    WebService --> SPA
    WebService --> API
    API -->|"DATABASE_URL"| NeonDB[("Neon.tech Free PostgreSQL\n(Serverless with pgvector)")]
    API -->|"GEMINI_API_KEY"| GoogleAI["Google Gemini Free API\n(gemini-2.5-flash + text-embedding-004)"]
```

---

## Step 1: Get Your Free Google Gemini API Key (30 Seconds)

1. Open [Google AI Studio](https://aistudio.google.com).
2. Sign in with any free Google account.
3. Click **Get API key** &rarr; **Create API key**.
4. Copy your key (starts with `AIzaSy...`).
   - **Cost**: \$0 (No credit card required).
   - **Free Quota**: 15 requests/min and 1,500 requests/day.

---

## Step 2: Get Free Cloud PostgreSQL with `pgvector` (Neon.tech)

1. Go to [Neon.tech](https://neon.tech) and sign up with GitHub or Google.
2. Create a new project (e.g., `kaamai-db`).
3. Neon automatically enables `pgvector`.
4. Copy the **Connection String** (Postgres connection URI):
   ```text
   postgresql://user:password@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

---

## Step 3: Deploy to Render.com (1-Click or Manual)

### Option A: Via `render.yaml` (Recommended)

1. Push your KaamAI repository to GitHub.
2. Sign in to [Render.com](https://render.com).
3. Click **New +** &rarr; **Blueprint**.
4. Connect your GitHub repository.
5. Render reads `render.yaml` automatically and prompts for:
   - `DATABASE_URL`: Paste your Neon connection string.
   - `GEMINI_API_KEY`: Paste your Google Gemini API key.
6. Click **Apply**. Render will build the Vite frontend, install Python dependencies, run migrations, and launch your live application on `https://kaamai-xxxx.onrender.com`.

### Option B: Manual Web Service Setup on Render

If configuring manually:

- **Environment**: Python
- **Build Command**:
  ```bash
  npm ci && npm run build --workspace apps/web && pip install -r backend/requirements.txt
  ```
- **Start Command**:
  ```bash
  python run_backend.py
  ```
- **Environment Variables**:
  | Key                      | Value                      | Description                  |
  | :----------------------- | :------------------------- | :--------------------------- |
  | `PORT`                   | `4000`                     | Port for Uvicorn             |
  | `PYTHONUNBUFFERED`       | `1`                        | Stream console logs          |
  | `AI_PROVIDER`            | `gemini`                   | Use Google Gemini API        |
  | `GEMINI_API_KEY`         | `AIzaSy...`                | Your free Gemini key         |
  | `GEMINI_CHAT_MODEL`      | `gemini-2.5-flash`         | Free tier chat model         |
  | `GEMINI_EMBEDDING_MODEL` | `text-embedding-004`       | 768-dim embeddings           |
  | `DATABASE_URL`           | `postgresql://...`         | Neon DB connection URI       |
  | `SESSION_SECRET`         | _(Random 32+ char string)_ | Secure session cookie secret |

---

## Step 4: Verification

Once deployed:

1. Open your live URL (e.g. `https://your-app.onrender.com`). The frontend dashboard will load immediately.
2. Check the health check endpoint: `https://your-app.onrender.com/api/health`.
3. Check AI provider readiness: `https://your-app.onrender.com/api/providers`.
4. Register your admin account and start chatting with documents and exploring business tools!
