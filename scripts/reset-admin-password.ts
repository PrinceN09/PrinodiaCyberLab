/**
 * Non-destructive admin password reset.
 *
 * Reads SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD from the environment,
 * validates them, hashes the new password with the app's hashing method,
 * and updates the existing user's password IN PLACE — no data is deleted.
 *
 * Usage:
 *   1) Set a new SEED_ADMIN_PASSWORD (and SEED_ADMIN_EMAIL) in .env
 *   2) npx tsx scripts/reset-admin-password.ts
 *
 * It never prints the password.
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 12;

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in your local environment first."
    );
  }
  if (!EMAIL_RE.test(email)) {
    throw new Error("SEED_ADMIN_EMAIL is not a valid email address.");
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `SEED_ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters.`
    );
  }

  // Only the exact account matching SEED_ADMIN_EMAIL may be reset — no fallback.
  const existing = await prisma.user.findUnique({ where: { email } });

  if (!existing) {
    throw new Error(
      `No user found for SEED_ADMIN_EMAIL. Nothing was changed. ` +
        `Run \`npm run db:seed\` to create the account first.`
    );
  }

  // Update ONLY the hashed password; never modify the email during a reset.
  await prisma.user.update({
    where: { id: existing.id },
    data: { password: await hashPassword(password) },
  });

  // Never print the password.
  console.log(`Password reset for ${email}. Sign in with your new .env password.`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
