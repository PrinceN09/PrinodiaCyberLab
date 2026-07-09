import { prisma } from "@/lib/prisma";

/**
 * Single-user workspace helper. Returns the seeded user, creating a
 * fallback if none exists so API writes never fail on a fresh DB.
 */
export async function getCurrentUser() {
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
