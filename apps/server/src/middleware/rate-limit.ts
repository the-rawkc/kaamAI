import { rateLimit } from "express-rate-limit";
import type { Request, Response } from "express";

const isTest = process.env.NODE_ENV === "test";

function createRateLimiter(options: {
  windowMs: number;
  max: number;
  message?: string;
  skipInTest?: boolean;
}) {
  return rateLimit({
    windowMs: options.windowMs,
    limit: isTest && options.skipInTest !== false ? 10000 : options.max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (_req: Request, res: Response) => {
      res.status(429).json({
        error: {
          code: "RATE_LIMITED",
          message:
            options.message ??
            "Too many requests received from this source. Please retry after a short delay.",
        },
      });
    },
  });
}

/**
 * Sensitive auth endpoints (login, register): 15 attempts per 15 minutes.
 */
export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: "Too many authentication attempts. Please try again in 15 minutes.",
});

/**
 * Document uploads: 30 uploads per 15 minutes.
 */
export const uploadLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: "Upload limit reached. Please wait before uploading more files.",
});

/**
 * AI Assistant / Agent execution: 30 requests per minute.
 */
export const aiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: "AI request quota reached for this minute. Please wait a moment.",
});

/**
 * Strict limiter for verifying 429 response handling in test suites.
 */
export const testStrictLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 2,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      error: {
        code: "RATE_LIMITED",
        message: "Test rate limit exceeded.",
      },
    });
  },
});
