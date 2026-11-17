import "dotenv/config";
import postgres from "@prisma/orm-postgres/runtime";
import { contractFromJson } from "@prisma/orm-postgres/static";
import type { Contract } from "./contract.d";
import contractJson from "./contract.json";
if (!process.env.DATABASE_URL)
  throw new Error("Configure DATABASE_URL no apps/api/.env");
export const db = postgres({
  contract: contractFromJson<Contract>(contractJson),
  url: process.env.DATABASE_URL,
});
