import "dotenv/config";
import postgres from "@prisma/orm-postgres/runtime";
import { contractFromJson } from "@prisma/orm-postgres/static";
import type { Contract } from "./contract.js";
import contractJson from "./contract.json" with { type: "json" };
const databaseUrl =
  process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("Configure DATABASE_URL no apps/api/.env");
export const db = postgres({
  contract: contractFromJson<Contract>(contractJson),
  // Prisma RC sends startup session parameters unsupported by Neon pooling.
  url: databaseUrl,
});
