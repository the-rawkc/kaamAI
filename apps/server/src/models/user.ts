import { query } from "../db/connection.js";
import { compare, hash } from "bcryptjs";

export type UserRole = "member" | "admin";

export interface User {
  id: string;
  workspace_id: string;
  email: string;
  role: UserRole;
  email_verified: boolean;
  created_at: Date;
}

export interface UserWithPassword extends User {
  password_hash: string;
}

export interface CreateUserInput {
  workspace_id: string;
  email: string;
  password: string;
  role?: UserRole;
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const password_hash = await hash(input.password, 12);
  const result = await query(
    `INSERT INTO users (workspace_id, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, workspace_id, email, role, email_verified, created_at`,
    [input.workspace_id, input.email.toLowerCase().trim(), password_hash, input.role ?? "member"],
  );
  const rows = (result as { rows: UserWithPassword[] }).rows;
  const { id, workspace_id, email, role, email_verified, created_at } = rows[0];
  return { id, workspace_id, email, role, email_verified, created_at };
}

export async function findUserByEmail(email: string): Promise<UserWithPassword | null> {
  const result = await query(
    `SELECT id, workspace_id, email, password_hash, role, email_verified, created_at
     FROM users
     WHERE email = $1`,
    [email.toLowerCase().trim()],
  );
  const rows = (result as { rows: UserWithPassword[] }).rows;
  return rows.length > 0 ? rows[0] : null;
}

export async function findUserById(id: string): Promise<User | null> {
  const result = await query(
    `SELECT id, workspace_id, email, role, email_verified, created_at
     FROM users
     WHERE id = $1`,
    [id],
  );
  const rows = (result as { rows: User[] }).rows;
  return rows.length > 0 ? rows[0] : null;
}

export async function verifyPassword(user: UserWithPassword, password: string): Promise<boolean> {
  return compare(password, user.password_hash);
}

export async function updatePassword(userId: string, newPassword: string): Promise<void> {
  const password_hash = await hash(newPassword, 12);
  await query(`UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2`, [
    password_hash,
    userId,
  ]);
}

export async function markEmailVerified(userId: string): Promise<void> {
  await query(`UPDATE users SET email_verified = TRUE, updated_at = now() WHERE id = $1`, [userId]);
}
