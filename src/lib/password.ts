import bcrypt from "bcryptjs";

// Node-only helpers (bcrypt is not Edge-safe). Import from route handlers/seed.

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}
