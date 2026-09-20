import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";
import { env } from "../config/env.ts";

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

export const prisma = new PrismaClient({
  adapter,
  log: env.isProduction ? ["warn", "error"] : ["warn", "error"],
});

export const disconnectPrisma = async (): Promise<void> => {
  await prisma.$disconnect();
};
