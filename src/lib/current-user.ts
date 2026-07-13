import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

/**
 * Non-secret user fields. The password hash is deliberately never
 * selected here so it cannot be accidentally serialized to a client
 * component or an API response. Password verification uses its own
 * scoped query in the auth login route.
 */
const SAFE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Returns the signed-in user (from the session cookie) when available,
 * falling back to the first user so API writes never fail on a fresh DB.
 * The returned object never includes the password hash.
 */
export async function getCurrentUser() {
  const session = await getSessionUser();
  if (session) {
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: SAFE_USER_SELECT,
    });
    if (user) return user;
  }

  let user = await prisma.user.findFirst({ select: SAFE_USER_SELECT });
  if (!user) {
    // Development fallback for an empty database — no personal data or
    // credentials. Seed a real admin via `npm run db:seed` instead.
    user = await prisma.user.create({
      data: {
        name: "Local User",
        email:
          process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase() ||
          "admin@example.com",
        role: "Security Analyst",
      },
      select: SAFE_USER_SELECT,
    });
  }
  return user;
}
