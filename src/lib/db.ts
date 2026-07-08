import { PrismaClient } from "@prisma/client";

// Singleton Prisma client. On Next.js dev, hot-module-reload re-executes modules,
// which would leak a new PrismaClient (and DB connection) per reload without this
// guard. We stash the instance on globalThis so subsequent reloads reuse it.

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
