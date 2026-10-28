import "express-session";

declare module "express-session" {
  interface SessionData {
    user?: {
      id: string;
      workspace_id: string;
      email: string;
      role: string;
    };
  }
}
