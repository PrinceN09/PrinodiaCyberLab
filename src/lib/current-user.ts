import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

/**
 * Returns the signed-in user (from the session cookie) when available,
 * falling back to the first user so API writes never fail on a fresh DB.
 */
export async function getCurrentUser() {
  const session = await getSessionUser();
  if (session) {
    const user = await prisma.user.findUnique({ where: { id: session.id } });
    if (user) return user;
  }

  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: "Prince Ntunka",
        email: "princentunka09@gmail.com",
        role: "SOC Analyst (in training)",
      },
    });
  }
  return user;
}
