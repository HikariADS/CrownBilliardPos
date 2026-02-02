// db.ts
// This file provides a database connection utility for your Next.js app.
// Update the configuration below to match your database (e.g., PostgreSQL, MySQL, SQLite, etc.)

import { PrismaClient } from "@prisma/client";
import { PrismaMssql } from "@prisma/adapter-mssql";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaDbTested?: boolean;
};

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaMssql(process.env.DATABASE_URL!),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;

// Test kết nối DB (chỉ log, không làm crash dev server)
async function test() {
  try {
    await prisma.$connect();
    console.log("✅ Connected to database");
  } catch (error) {
    console.error("❌ Database connection failed", error);
  }
}

if (process.env.NODE_ENV !== "production" && !globalForPrisma.prismaDbTested) {
  globalForPrisma.prismaDbTested = true;
  void test();
}
