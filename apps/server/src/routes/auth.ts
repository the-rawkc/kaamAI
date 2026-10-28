import { type Request, type Response, type Router } from "express";
import { z } from "zod";
import { createUser, findUserByEmail, verifyPassword } from "../models/user.js";
import { createWorkspace } from "../models/workspace.js";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth.js";
import { query } from "../db/connection.js";
import { randomBytes } from "node:crypto";
import { authLimiter } from "../middleware/rate-limit.js";

const registerSchema = z.object({
  email: z.string().email("Invalid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  name: z.string().min(1, "Workspace name is required.").optional(),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address."),
  password: z.string().min(1, "Password is required."),
});

function generateCsrfToken(): string {
  return randomBytes(32).toString("hex");
}

export function mountAuthRoutes(router: Router): void {
  router.get("/api/auth/csrf-token", (_request, response) => {
    const token = generateCsrfToken();
    response.cookie("csrf_token", token, {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    response.json({ csrf_token: token });
  });

  router.post("/api/auth/register", authLimiter, async (request: Request, response: Response) => {
    try {
      const body = registerSchema.parse(request.body);
      const csrfToken = request.headers["x-csrf-token"] || request.body.csrf_token;
      const cookieToken = request.cookies?.csrf_token;
      if (!csrfToken || !cookieToken || csrfToken !== cookieToken) {
        response
          .status(403)
          .json({ error: { code: "CSRF_MISMATCH", message: "CSRF token mismatch." } });
        return;
      }

      const existing = await findUserByEmail(body.email);
      if (existing) {
        response.status(409).json({
          error: { code: "EMAIL_IN_USE", message: "An account with this email already exists." },
        });
        return;
      }

      const workspace = await createWorkspace({
        name: body.name ?? "Personal Workspace",
        slug: `user-${randomBytes(16).toString("hex")}`,
      });
      const user = await createUser({
        workspace_id: workspace.id,
        email: body.email,
        password: body.password,
        role: "admin",
      });

      await query(`INSERT INTO audit_logs (user_id, action, metadata) VALUES ($1, $2, $3)`, [
        user.id,
        "account_registered",
        JSON.stringify({ email: user.email }),
      ]);

      response.status(201).json({
        user: { id: user.id, email: user.email, role: user.role, workspace_id: user.workspace_id },
        workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        response.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: error.issues[0]?.message ?? "Invalid input.",
          },
        });
        return;
      }
      response.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "The server could not complete this request." },
      });
    }
  });

  router.post("/api/auth/login", authLimiter, async (request: Request, response: Response) => {
    try {
      const body = loginSchema.parse(request.body);
      const csrfToken = request.headers["x-csrf-token"] || request.body.csrf_token;
      const cookieToken = request.cookies?.csrf_token;
      if (!csrfToken || !cookieToken || csrfToken !== cookieToken) {
        response
          .status(403)
          .json({ error: { code: "CSRF_MISMATCH", message: "CSRF token mismatch." } });
        return;
      }

      const user = await findUserByEmail(body.email);
      if (!user || !(await verifyPassword(user, body.password))) {
        response
          .status(401)
          .json({ error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password." } });
        return;
      }

      if (request.session) {
        await new Promise<void>((resolve, reject) => {
          request.session!.regenerate((err) => (err ? reject(err) : resolve()));
        });
      }

      request.session!.user = {
        id: user.id,
        workspace_id: user.workspace_id,
        email: user.email,
        role: user.role,
      };

      await new Promise<void>((resolve, reject) => {
        request.session!.save((err) => (err ? reject(err) : resolve()));
      });

      await query(`INSERT INTO audit_logs (user_id, action, metadata) VALUES ($1, $2, $3)`, [
        user.id,
        "user_login",
        JSON.stringify({ email: user.email }),
      ]);

      response.json({
        user: { id: user.id, email: user.email, role: user.role, workspace_id: user.workspace_id },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        response.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: error.issues[0]?.message ?? "Invalid input.",
          },
        });
        return;
      }
      response.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "The server could not complete this request." },
      });
    }
  });

  router.post("/api/auth/logout", (request: Request, response: Response) => {
    const csrfToken = request.headers["x-csrf-token"] || request.body?.csrf_token;
    const cookieToken = request.cookies?.csrf_token;
    if (!csrfToken || !cookieToken || csrfToken !== cookieToken) {
      response
        .status(403)
        .json({ error: { code: "CSRF_MISMATCH", message: "CSRF token mismatch." } });
      return;
    }

    if (request.session) {
      request.session.destroy(() => {
        response.clearCookie("kaamai.sid", { path: "/" });
        response.clearCookie("csrf_token", { path: "/" });
        response.json({ ok: true });
      });
    } else {
      response.clearCookie("kaamai.sid", { path: "/" });
      response.clearCookie("csrf_token", { path: "/" });
      response.json({ ok: true });
    }
  });

  router.get(
    "/api/auth/me",
    requireAuth as unknown as (req: Request, res: Response) => void,
    (request: AuthenticatedRequest, response: Response) => {
      const user = request.user;
      if (!user) {
        response
          .status(401)
          .json({ error: { code: "UNAUTHENTICATED", message: "Not authenticated." } });
        return;
      }
      response.json({ user });
    },
  );

  router.post(
    "/api/auth/change-password",
    requireAuth as unknown as (req: Request, res: Response) => void,
    async (request: AuthenticatedRequest, response: Response) => {
      try {
        const schema = z.object({
          current_password: z.string().min(1),
          new_password: z.string().min(8),
        });
        const body = schema.parse(request.body);

        const csrfToken = request.headers["x-csrf-token"] || request.body.csrf_token;
        const cookieToken = request.cookies?.csrf_token;
        if (!csrfToken || !cookieToken || csrfToken !== cookieToken) {
          response
            .status(403)
            .json({ error: { code: "CSRF_MISMATCH", message: "CSRF token mismatch." } });
          return;
        }

        if (!request.user) {
          response
            .status(401)
            .json({ error: { code: "UNAUTHENTICATED", message: "Not authenticated." } });
          return;
        }

        const userWithPassword = await findUserByEmail(request.user.email);
        if (!userWithPassword) {
          response
            .status(404)
            .json({ error: { code: "USER_NOT_FOUND", message: "User not found." } });
          return;
        }

        if (!(await verifyPassword(userWithPassword, body.current_password))) {
          response.status(401).json({
            error: { code: "INVALID_CREDENTIALS", message: "Current password is incorrect." },
          });
          return;
        }

        const { updatePassword } = await import("../models/user.js");
        await updatePassword(userWithPassword.id, body.new_password);
        await query(`INSERT INTO audit_logs (user_id, action, metadata) VALUES ($1, $2, $3)`, [
          userWithPassword.id,
          "password_changed",
          JSON.stringify({}),
        ]);

        response.json({ ok: true });
      } catch (error) {
        if (error instanceof z.ZodError) {
          response.status(400).json({
            error: {
              code: "VALIDATION_ERROR",
              message: error.issues[0]?.message ?? "Invalid input.",
            },
          });
          return;
        }
        response.status(500).json({
          error: { code: "INTERNAL_ERROR", message: "The server could not complete this request." },
        });
      }
    },
  );
}
