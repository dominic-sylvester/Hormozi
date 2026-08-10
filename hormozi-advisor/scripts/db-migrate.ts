import pg from "pg";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required to run db:migrate");
  process.exit(1);
}

const migrationPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../db/migrations/001_company_profiles.sql",
);
const sql = readFileSync(migrationPath, "utf8");

const pool = new pg.Pool({ connectionString });
try {
  await pool.query(sql);
  console.log("Applied company profile migration.");
} finally {
  await pool.end();
}
