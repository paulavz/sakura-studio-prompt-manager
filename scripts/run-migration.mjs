/**
 * Run the applied_skills migration on the remote Supabase database.
 *
 * Usage:
 *   node scripts/run-migration.mjs
 *
 * Requires SUPABASE_DB_PASSWORD in .env.local or as env var.
 * The connection uses the session pooler (port 6543).
 */
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { Client } = require("pg");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

dotenv.config({ path: ".env.local" });

const PROJECT_REF = "hsozuglryplvpmajhgfe";
const PASSWORD = process.env.SUPABASE_DB_PASSWORD;

if (!PASSWORD) {
  console.error(
    "SUPABASE_DB_PASSWORD is not set.\n" +
      "Get it from: https://supabase.com/dashboard/project/" + PROJECT_REF + "/settings/database\n" +
      "Then: set SUPABASE_DB_PASSWORD=xxx && node scripts/run-migration.mjs"
  );
  process.exit(1);
}

const sql = fs.readFileSync(
  path.resolve("supabase/migrations/20260505_add_applied_skills.sql"),
  "utf-8"
);

const client = new Client({
  host: `db.${PROJECT_REF}.supabase.co`,
  port: 5432,
  database: "postgres",
  user: "postgres",
  password: PASSWORD,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log("Connected. Running migration...");
  await client.query(sql);
  console.log(" Migration applied successfully.");
} catch (err) {
  console.error("Failed:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
