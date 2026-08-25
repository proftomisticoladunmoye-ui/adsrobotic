import { PrismaClient } from '@prisma/client';

export * from '@prisma/client';

/**
 * Prisma singleton. Avoids exhausting connections during Next.js hot-reload
 * by caching the client on globalThis in non-production.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
