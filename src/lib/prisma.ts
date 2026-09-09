import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; prismaUrl?: string };

const url = (process.env.DATABASE_URL?.replace(/^["']|["']$/g, "") || "mysql://root:@localhost:3306/recruitment_os").trim();
if (!process.env.DATABASE_URL || process.env.DATABASE_URL !== url) {
  process.env.DATABASE_URL = url;
}

export const prisma =
  globalForPrisma.prisma && globalForPrisma.prismaUrl === url
    ? globalForPrisma.prisma
    : new PrismaClient({ datasourceUrl: url });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaUrl = url;
}
