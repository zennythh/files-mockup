import "dotenv/config";
import { execFileSync } from "node:child_process";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not defined in .env");
}

execFileSync("psql", [
  databaseUrl,
  "-f",
  "prisma/reset.sql",
], {
  stdio: "inherit",
});

