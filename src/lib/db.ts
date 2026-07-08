import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

// Singleton Prisma client. On Next.js dev, hot-module-reload re-executes modules,
// which would leak a new PrismaClient (and DB connection) per reload without this
// guard. We stash the instance on globalThis so subsequent reloads reuse it.

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  // Prisma 7 requires a driver adapter. For local SQLite we use better-sqlite3.
  // DATABASE_URL looks like "file:./dev.db" — the adapter wants just the file path.
  const dbUrl = process.env.DATABASE_URL ?? "file:./dev.db";
  const filePath = dbUrl.startsWith("file:") ? dbUrl.slice("file:".length) : dbUrl;

  const adapter = new PrismaBetterSqlite3({ url: filePath });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
