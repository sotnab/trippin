// prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database…");
  // Seed data is minimal — real users are created via OAuth
  console.log("Done. Sign in via OAuth to create your first user.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
