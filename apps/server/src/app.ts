import dotenv from "dotenv";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import session, { type Store } from "express-session";
import pgStore from "connect-pg-simple";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getPool, isDatabaseAvailable, closePool } from "./db/connection.js";
import { runPendingMigrations } from "./db/migrate.js";
import { mountAuthRoutes } from "./routes/auth.js";
import { mountDocumentRoutes } from "./routes/documents.js";
import { mountAiRoutes } from "./routes/ai.js";
import { mountSearchRoutes } from "./routes/search.js";
import { mountImportRoutes } from "./routes/imports.js";
import { mountToolsRoutes } from "./routes/tools.js";
import { mountDashboardRoutes } from "./routes/dashboard.js";
import { mountApprovalsRoutes } from "./routes/approvals.js";
import { mountReportsRoutes } from "./routes/reports.js";
import { mountConversationsRoutes } from "./routes/conversations.js";
import { mountAgentRoutes } from "./routes/agent.js";
import { testStrictLimiter } from "./middleware/rate-limit.js";

const envPath = fileURLToPath(new URL("../../../.env", import.meta.url));
dotenv.config({ path: resolve(envPath), quiet: true });

const app = express();
const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:5173";
const isProduction = process.env.NODE_ENV === "production";

app.disable("x-powered-by");
app.use(helmet());
app.use(
  cors({
    origin: webOrigin,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: "64kb" }));

// Initialize migrations and session persistence before accepting requests.
const PostgreSQLStoreConstructor = pgStore(session) as unknown as new (options: unknown) => Store;
async function createSessionStore(): Promise<Store | undefined> {
  try {
    if (await isDatabaseAvailable()) {
      await runPendingMigrations();
      return new PostgreSQLStoreConstructor({
        pool: getPool(),
        tableName: "sessions",
        createTableIfMissing: false,
      });
    }
  } catch {
    // Database unavailable; Express uses its development memory store below.
  }
  return undefined;
}

const sessionStore = await createSessionStore();
const sessionSecret = process.env.SESSION_SECRET;
if (isProduction && (!sessionSecret || sessionSecret.length < 32)) {
  throw new Error("SESSION_SECRET must be configured with at least 32 characters in production.");
}

app.use(
  session({
    store: sessionStore,
    secret: sessionSecret ?? "dev-only-secret-change-me",
    name: "kaamai.sid",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
    rolling: false,
  }),
);

// Mount auth routes (register, login, logout, me, change-password)
mountAuthRoutes(app);

// Mount document routes (upload, list, detail, delete, reindex, status)
mountDocumentRoutes(app);

// Mount AI routes (chat, provider health)
mountAiRoutes(app);

// Mount search routes (semantic search, index/reindex)
mountSearchRoutes(app);

// Mount import routes (preview, jobs, validate, confirm, delete)
mountImportRoutes(app);

// Mount tools routes (deterministic business calculations)
mountToolsRoutes(app);

// Mount dashboard routes (summary, activity)
mountDashboardRoutes(app);

// Mount approval routes (list, approve, reject)
mountApprovalsRoutes(app);

// Mount report routes (list, download)
mountReportsRoutes(app);

// Mount conversation routes (AI assistant history)
mountConversationsRoutes(app);

// Mount agent routes (agent orchestration and tool calling)
mountAgentRoutes(app);

app.get("/api/health", (_request, response) => {
  response.status(200).json({ status: "ok", service: "kaamai-api" });
});

if (process.env.NODE_ENV !== "production") {
  app.get("/api/test/rate-limited", testStrictLimiter, (_request, response) => {
    response.json({ ok: true });
  });
}

app.use((_request, response) => {
  response.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "The requested endpoint was not found.",
    },
  });
});

app.use(
  (
    _error: unknown,
    _request: express.Request,
    response: express.Response,
    _next: express.NextFunction,
  ) => {
    void _next;
    response.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "The server could not complete this request.",
      },
    });
  },
);

export { app, closePool };
