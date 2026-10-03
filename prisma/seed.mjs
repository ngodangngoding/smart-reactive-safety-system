import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";
import crypto from "node:crypto";

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.SUPERADMIN_EMAIL;
  const password = process.env.SUPERADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD must be set");
  }

  const superadmin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { name: "Super Admin", email, passwordHash: hashPassword(password), role: "SUPERADMIN" },
  });

  console.log("SUPERADMIN ready:", superadmin.email);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
