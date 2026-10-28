import { type Request, type Response, type NextFunction } from "express";
import { findUserById } from "../models/user.js";

export interface AuthenticatedRequest extends Request {
  user?: { id: string; workspace_id: string; email: string; role: string };
}

/**
 * Middleware that requires an authenticated user. Sets req.user from the session.
 * Routes protected by this middleware return 401 when no session exists.
 */
export function requireAuth(
  request: AuthenticatedRequest,
  response: Response,
  next: NextFunction,
): void {
  const user = request.session?.user;
  if (!user) {
    response.status(401).json({
      error: { code: "UNAUTHENTICATED", message: "Sign in to access this endpoint." },
    });
    return;
  }
  request.user = user;
  next();
}

/**
 * Middleware that optionally attaches the user from the session without requiring it.
 * Useful for routes that behave differently for signed-in vs anonymous users.
 */
export function optionalAuth(
  request: AuthenticatedRequest,
  _response: Response,
  next: NextFunction,
): void {
  request.user = request.session?.user ?? undefined;
  next();
}

/**
 * Middleware that loads the full user record from the database and attaches it to req.user.
 * Requires requireAuth to have run first.
 */
export async function loadUser(
  request: AuthenticatedRequest,
  response: Response,
  next: NextFunction,
): Promise<void> {
  if (!request.user) {
    response.status(401).json({
      error: { code: "UNAUTHENTICATED", message: "Sign in to access this endpoint." },
    });
    return;
  }

  try {
    const user = await findUserById(request.user.id);
    if (!user) {
      response.status(401).json({
        error: { code: "UNAUTHENTICATED", message: "User account not found." },
      });
      return;
    }
    request.user = {
      id: user.id,
      workspace_id: user.workspace_id,
      email: user.email,
      role: user.role,
    };
    next();
  } catch {
    response.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "The server could not complete this request." },
    });
  }
}

/**
 * Middleware that requires a specific role (e.g. "admin").
 */
export function requireRole(allowedRoles: string[]) {
  return function roleMiddleware(
    request: AuthenticatedRequest,
    response: Response,
    next: NextFunction,
  ): void {
    if (!request.user || !allowedRoles.includes(request.user.role)) {
      response.status(403).json({
        error: { code: "FORBIDDEN", message: "Insufficient permissions for this action." },
      });
      return;
    }
    next();
  };
}

/**
 * Middleware that verifies the requesting user owns the workspace in the request
 * (either via params.workspaceId or the user's own workspace). Cross-user access is denied.
 */
export function requireWorkspaceOwnership() {
  return function workspaceOwnershipMiddleware(
    request: AuthenticatedRequest,
    response: Response,
    next: NextFunction,
  ): void {
    const user = request.user;
    if (!user) {
      response.status(401).json({
        error: { code: "UNAUTHENTICATED", message: "Sign in to access this endpoint." },
      });
      return;
    }

    const requestedWorkspaceId = request.params.workspaceId || request.query.workspaceId;
    if (requestedWorkspaceId && requestedWorkspaceId !== user.workspace_id) {
      response.status(403).json({
        error: { code: "FORBIDDEN", message: "Access to another workspace is not permitted." },
      });
      return;
    }

    next();
  };
}
